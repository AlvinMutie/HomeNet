from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from backend.app.models.device import (
    DeviceResponse,
    DevicePatchRequest,
    ScanResponse,
    ScanRequest,
)
from backend.app.database import (
    get_all_devices,
    get_device_by_id,
    update_device_metadata,
    get_connection,
)
from backend.app.services.scanner import NetworkScanner
from backend.app.services.router_auth import block_device_on_router, unblock_device_on_router

router = APIRouter(prefix="/devices", tags=["Devices"])


class BlockRequest(BaseModel):
    """Router credentials required to authenticate and block/unblock a device."""
    router_username: str = Field(..., description="Router admin username (e.g. 'telecomadmin' or 'admin')")
    router_password: str = Field(..., description="Router admin password")


@router.get("", response_model=List[DeviceResponse])
async def list_devices(
    search: Optional[str] = Query(None, description="Search term for name, IP, MAC, hostname, or manufacturer"),
    filter_status: Optional[str] = Query(None, description="Filter: all, responding, offline, trusted, untrusted, review"),
    sort_by: str = Query("ip", description="Sort by: ip, name, last_seen, latency, trust"),
    sort_order: str = Query("asc", description="Sort order: asc, desc"),
):
    """
    List all discovered devices with search, filter, and sorting.
    Device names and trust labels are persisted in SQLite.
    """
    devices = get_all_devices(
        search=search,
        filter_status=filter_status,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return devices


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(device_id: str):
    """Retrieve details for a single device by ID."""
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.post("/scan", response_model=ScanResponse)
async def scan_local_network(scan_req: Optional[ScanRequest] = None):
    """
    Trigger safe local network discovery using ICMP echo sweep and Linux kernel ARP resolution.
    Updates device presence and timestamps without deleting previous devices.
    """
    try:
        subnet = scan_req.subnet if scan_req else None
        interface = scan_req.interface if scan_req else None
        scanner = NetworkScanner(subnet=subnet, interface=interface)
        result = await scanner.scan()
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid scan parameters: {str(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Network scan error: {str(e)}"
        )


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(device_id: str, patch_data: DevicePatchRequest):
    """
    Update friendly name, trust label, or notes for a device.
    Matches devices primarily by ID (tied to MAC address) and persists to SQLite.
    """
    updated = update_device_metadata(
        device_id=device_id,
        custom_name=patch_data.custom_name,
        is_trusted=patch_data.is_trusted,
        notes=patch_data.notes,
        device_type=patch_data.device_type,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Device not found")
    return updated


@router.post("/{device_id}/block")
async def block_device(
    device_id: str,
    body: Optional[BlockRequest] = None,
):
    """
    Block a device by adding its MAC address to the Huawei HG8145V6 Wi-Fi deny list.

    Requires your router admin credentials. If no credentials are supplied,
    returns HTTP 501 explaining that router hardware authentication is required.
    """
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    mac = device.get("mac_address")
    name = device.get("custom_name") or device.get("hostname") or device.get("ip_address")

    if not body or not body.router_password:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "status": "unavailable_requires_router_auth",
                "message": (
                    "Device blocking cannot be safely performed via local ARP scans. "
                    "Authoritative hardware MAC filtering requires direct Huawei HG8145V6 "
                    "router credentials to update the Wi-Fi deny list."
                ),
                "device_id": device_id,
                "mac_address": mac,
                "router_gateway": "https://192.168.100.1",
                "how_to_block_safely": [
                    "Log in to Huawei HG8145V6 router web portal at https://192.168.100.1",
                    "Navigate to Security -> MAC Filter Configuration",
                    f"Add target MAC address {mac or 'device-mac'} to Deny List / Blacklist",
                ],
            },
        )

    if not mac:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Cannot block device: No MAC address is known for this device.",
                "tip": "Devices using private/randomized MACs cannot be reliably blocked by MAC address."
            }
        )

    success, message = await block_device_on_router(
        mac=mac,
        username=body.router_username,
        password=body.router_password,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": message,
                "device": name,
                "mac_address": mac,
                "tip": "Check your router credentials and ensure the router web UI is reachable at https://192.168.100.1"
            }
        )

    return {
        "status": "blocked",
        "device": name,
        "mac_address": mac,
        "message": message,
    }


@router.post("/{device_id}/unblock")
async def unblock_device(
    device_id: str,
    body: BlockRequest,
):
    """
    Remove a device from the Huawei HG8145V6 Wi-Fi deny list.
    The device will be able to reconnect to Wi-Fi after this.
    """
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    mac = device.get("mac_address")
    name = device.get("custom_name") or device.get("hostname") or device.get("ip_address")

    if not mac:
        raise HTTPException(status_code=400, detail="No MAC address known for this device")

    success, message = await unblock_device_on_router(
        mac=mac,
        username=body.router_username,
        password=body.router_password,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": message, "device": name}
        )

    return {"status": "unblocked", "device": name, "mac_address": mac, "message": message}


@router.delete("/{device_id}")
async def delete_device(device_id: str):
    """Remove a previously seen device record from the database."""
    conn = get_connection()
    try:
        with conn:
            existing = conn.execute("SELECT id FROM devices WHERE id = ?", (device_id,)).fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Device not found")
            conn.execute("DELETE FROM devices WHERE id = ?", (device_id,))
        return {"status": "success", "message": "Device record removed"}
    finally:
        conn.close()

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
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
from backend.app.services.router_service import router_service, RouterOperationError

router = APIRouter(prefix="/devices", tags=["Devices"])


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
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Device not found")
    return updated


@router.post("/{device_id}/block")
async def block_device_attempt(device_id: str):
    """
    Device blocking endpoint.
    Strictly documents that genuine blocking requires authenticated Huawei HG8145V6 integration.
    Simulated blocking is forbidden.
    """
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    mac = device.get("mac_address")
    name = device.get("custom_name") or device.get("hostname") or device.get("ip_address")

    if not mac:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block device: No MAC address available for this device."
        )

    # Invoke router service, which explains the requirement
    try:
        await router_service.block_device(mac_address=mac, device_name=name)
    except RouterOperationError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "message": str(e),
                "device_id": device_id,
                "target_device": name,
                "mac_address": mac,
                "status": "unavailable_requires_router_auth",
                "recommendation": "Device blocking requires adding an Access Control / MAC filter rule directly inside the Huawei HG8145V6 web administration interface (https://192.168.100.1)."
            }
        )


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

from typing import Optional, List
from pydantic import BaseModel, Field


class DevicePatchRequest(BaseModel):
    custom_name: Optional[str] = Field(None, max_length=100, description="Friendly user-assigned device name")
    is_trusted: Optional[int] = Field(None, ge=0, le=2, description="Trust status: 0=Untrusted, 1=Trusted, 2=Needs Review")
    notes: Optional[str] = Field(None, max_length=500, description="Custom notes about this device")
    device_type: Optional[str] = Field(None, description="Device category: smart_tv, smartphone, laptop, router, iot, printer, unknown")


class DeviceResponse(BaseModel):
    id: str
    mac_address: Optional[str] = None
    ip_address: str
    custom_name: Optional[str] = None
    hostname: Optional[str] = None
    manufacturer: str = "Unknown"
    device_type: Optional[str] = "unknown"
    model_name: Optional[str] = None
    is_trusted: int = 2 # 0: untrusted, 1: trusted, 2: unassigned
    is_active: int = 1  # 0: offline, 1: responding now
    latency_ms: Optional[float] = None
    is_randomized_mac: int = 0
    interface: Optional[str] = None
    notes: Optional[str] = None
    first_seen: str
    last_seen: str


class ScanRequest(BaseModel):
    subnet: Optional[str] = Field(None, description="Optional custom subnet to scan (must be private IPv4, e.g. 192.168.100.0/24)")
    interface: Optional[str] = Field(None, description="Optional network interface (e.g. wlan0)")


class ScanResponse(BaseModel):
    subnet: str
    interface: str
    duration_seconds: float
    devices_found: int
    devices: List[DeviceResponse]


class StatsResponse(BaseModel):
    total_devices: int
    responding_devices: int
    offline_devices: int
    trusted_devices: int
    untrusted_devices: int
    review_devices: int
    manufacturers: List[dict]
    last_scan: Optional[dict] = None
    router_status: Optional[dict] = None
    internet_status: Optional[dict] = None

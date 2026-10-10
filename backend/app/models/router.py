from typing import Optional, Dict, Any
from pydantic import BaseModel


class RouterStatusResponse(BaseModel):
    model: str
    firmware: str
    gateway_ip: str
    gateway_port: int
    protocol: str
    reachable: bool
    ping_latency_ms: Optional[float] = None
    web_interface: Dict[str, Any]
    adapter_mode: str
    authenticated: bool
    internet_online: bool
    internet_verified_target: Optional[str] = None
    internet_latency_ms: Optional[float] = None


class RouterDiagnosticsResponse(BaseModel):
    router_status: Dict[str, Any]
    internet_status: Dict[str, Any]
    local_interface: Dict[str, Any]
    kernel_arp_entry: Optional[Dict[str, Any]] = None
    integration_guide: Dict[str, Any]


class BlockDeviceRequest(BaseModel):
    device_id: str
    mac_address: str
    device_name: Optional[str] = None
    confirmation: bool = False

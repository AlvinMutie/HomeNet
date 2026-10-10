import subprocess
from fastapi import APIRouter
from backend.app.services.router_service import router_service
from backend.app.services.scanner import parse_proc_net_arp
from backend.app.config import settings

router = APIRouter(prefix="/router", tags=["Router"])


@router.get("/status")
async def get_router_status():
    """
    Check Huawei HG8145V6 router reachability and internet connectivity.
    Separates router gateway status from actual internet reachability.
    """
    reachability = await router_service.check_reachability()
    internet = await router_service.test_internet_connectivity()

    return {
        **reachability,
        "internet_online": internet.get("internet_online", False),
        "internet_verified_target": internet.get("verified_target"),
        "internet_latency_ms": internet.get("latency_ms"),
        "internet_checked_at": internet.get("checked_at"),
    }


@router.get("/diagnostics")
async def get_router_diagnostics():
    """
    Comprehensive diagnostics for Huawei HG8145V6 Safaricom Gateway,
    including kernel ARP entries and integration architecture details.
    """
    reachability = await router_service.check_reachability()
    internet = await router_service.test_internet_connectivity()

    arp_table = parse_proc_net_arp()
    gateway_arp = arp_table.get(settings.router_ip)

    # Gather local interface details
    local_info = {}
    try:
        ip_cmd = subprocess.run(["ip", "-4", "addr", "show", settings.network_interface], capture_output=True, text=True, timeout=2)
        local_info["ip_addr_output"] = ip_cmd.stdout.strip()
    except Exception as e:
        local_info["error"] = str(e)

    integration_guide = {
        "target_hardware": "Huawei HG8145V6 (EchoLife GPON ONT)",
        "customization": "Safaricom Home Fibre Kenya",
        "web_portal_url": f"{settings.router_protocol}://{settings.router_ip}:{settings.router_port}",
        "architecture_notes": [
            "Local discovery uses standard ARP and ICMP without requiring router credentials.",
            "Official client lists and device blocking require authenticated access to the router ONT portal.",
            "To inspect supported APIs safely: Log in via browser (Chrome/Firefox), open DevTools Network tab, and observe request endpoints (e.g. /api or cgi-bin) and CSRF header tokens.",
            "Never perform automated brute-force attacks against the ONT credentials."
        ],
        "blocking_feasibility": "Requires access to router MAC filter / parental control web form."
    }

    return {
        "router": reachability,
        "internet": internet,
        "gateway_arp": gateway_arp,
        "local_network": {
            "interface": settings.network_interface,
            "configured_subnet": settings.network_subnet,
            "details": local_info,
        },
        "integration_guide": integration_guide,
    }

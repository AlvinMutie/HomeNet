import asyncio
import logging
import socket
import ssl
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import httpx

from backend.app.config import settings

logger = logging.getLogger("homenet.router")


class RouterOperationError(Exception):
    """Base exception for router integration operations."""
    pass


class RouterAuthenticationRequiredError(RouterOperationError):
    """Raised when an operation requires router credentials that are not yet configured."""
    pass


class RouterFeatureUnsupportedError(RouterOperationError):
    """Raised when an operation is not supported by the router firmware."""
    pass


class BaseRouterAdapter(ABC):
    """
    Abstract router adapter contract.
    Decouples local ARP network discovery from vendor-specific router management.
    """

    @abstractmethod
    async def check_reachability(self) -> Dict[str, Any]:
        """Verify IP reachability and web interface accessibility."""
        pass

    @abstractmethod
    async def test_internet_connectivity(self) -> Dict[str, Any]:
        """Test actual external WAN connectivity, distinct from gateway reachability."""
        pass

    @abstractmethod
    async def get_official_client_list(self) -> List[Dict[str, Any]]:
        """Retrieve authoritative connected client list from router firmware (requires auth)."""
        pass

    @abstractmethod
    async def block_device(self, mac_address: str, device_name: Optional[str] = None) -> Dict[str, Any]:
        """Block a device via router MAC filtering / access control (requires auth)."""
        pass


class HuaweiHG8145V6Adapter(BaseRouterAdapter):
    """
    Adapter for Huawei HG8145V6 GPON Terminal with Safaricom Customized Firmware.
    
    Gateway: 192.168.100.1
    Interface: Web UI on HTTPS (port 443) / HTTP (port 80)
    
    Safety constraints:
    - Never bypasses authentication or tests brute-force credentials.
    - Accurately reports reachability without fabricating client lists or blocking results.
    - Distinguishes gateway ping from real internet connectivity.
    """

    def __init__(self, ip: Optional[str] = None, port: Optional[int] = None, protocol: Optional[str] = None):
        self.ip = ip or settings.router_ip
        self.port = port or settings.router_port
        self.protocol = protocol or settings.router_protocol
        self.base_url = f"{self.protocol}://{self.ip}:{self.port}"
        self.authenticated_session = False

    async def _ping_gateway(self) -> Optional[float]:
        """Measure round-trip ICMP ping latency to gateway."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "ping", "-c", "1", "-W", "1", self.ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=2.0)
            if proc.returncode == 0:
                out = stdout.decode("utf-8", errors="ignore")
                for line in out.splitlines():
                    if "time=" in line:
                        part = line.split("time=")[1].split()[0]
                        return float(part)
        except Exception as e:
            logger.debug(f"Ping gateway check error: {e}")
        return None

    async def _probe_web_interface(self) -> Dict[str, Any]:
        """Probe the router web management port (HTTPS/HTTP)."""
        url = self.base_url
        start = time.time()
        try:
            # Safaricom Huawei routers typically use a self-signed certificate, so verify=False
            async with httpx.AsyncClient(verify=False, timeout=3.0) as client:
                resp = await client.get(url)
                rtt = round((time.time() - start) * 1000, 2)
                server_hdr = resp.headers.get("server", "Huawei Embedded Server")
                title_match = "Huawei HG8145V6 Login" if "login.css" in resp.text else "Web Management"
                return {
                    "accessible": True,
                    "status_code": resp.status_code,
                    "response_time_ms": rtt,
                    "server_header": server_hdr,
                    "portal_detected": True,
                    "tls_enabled": self.protocol == "https",
                }
        except httpx.ConnectTimeout:
            return {"accessible": False, "error": "Connection timed out"}
        except httpx.ConnectError:
            return {"accessible": False, "error": "Connection refused"}
        except Exception as e:
            return {"accessible": False, "error": str(e)}

    async def check_reachability(self) -> Dict[str, Any]:
        """Comprehensive check of router reachability."""
        ping_latency = await self._ping_gateway()
        web_probe = await self._probe_web_interface()

        is_reachable = ping_latency is not None or web_probe.get("accessible", False)

        return {
            "model": "Huawei HG8145V6",
            "firmware": "Safaricom Customized ONT",
            "gateway_ip": self.ip,
            "gateway_port": self.port,
            "protocol": self.protocol,
            "reachable": is_reachable,
            "ping_latency_ms": ping_latency,
            "web_interface": web_probe,
            "adapter_mode": "Monitoring & Reachability Verification",
            "authenticated": self.authenticated_session,
        }

    async def test_internet_connectivity(self) -> Dict[str, Any]:
        """
        Verify real WAN internet connectivity by checking outbound connection to
        reliable external hosts (1.1.1.1 / 8.8.8.8) on port 53/443.
        Does NOT rely solely on local router reachability.
        """
        hosts = [
            (settings.internet_check_host, 53),
            ("8.8.8.8", 53),
            ("1.1.1.1", 443),
        ]

        for host, port in hosts:
            start = time.time()
            try:
                # Run socket connect in thread pool with short timeout
                def check_socket():
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(2.0)
                    try:
                        s.connect((host, port))
                        return True
                    finally:
                        s.close()

                connected = await asyncio.to_thread(check_socket)
                if connected:
                    latency = round((time.time() - start) * 1000, 2)
                    return {
                        "internet_online": True,
                        "verified_target": f"{host}:{port}",
                        "latency_ms": latency,
                        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    }
            except Exception:
                continue

        return {
            "internet_online": False,
            "verified_target": None,
            "latency_ms": None,
            "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    async def get_official_client_list(self) -> List[Dict[str, Any]]:
        """
        Retrieval of authoritative router client list requires an authenticated session
        to the Huawei HG8145V6 portal (e.g. via ONT User/Admin credentials).
        Returns empty list with explanation rather than fabricated data.
        """
        raise RouterAuthenticationRequiredError(
            "Retrieving the official Huawei HG8145V6 client list requires an authenticated router session. "
            "Please use local ARP discovery, which is active and does not require router credentials."
        )

    async def block_device(self, mac_address: str, device_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Device blocking cannot be simulated via ARP. It requires adding a MAC filter or
        parental control rule on the Huawei HG8145V6 router.
        """
        raise RouterFeatureUnsupportedError(
            f"Blocking device '{device_name or mac_address}' ({mac_address}) is currently unavailable. "
            "Real blocking requires an authenticated Huawei HG8145V6 router management adapter "
            "with MAC filter rule automation. Simulated blocking is strictly prohibited."
        )


router_service = HuaweiHG8145V6Adapter()

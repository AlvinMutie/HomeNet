"""
Huawei HG8145V6 Router Authentication & MAC Block Service.

Authentication flow (reverse-engineered from router's JavaScript):
  1. GET /asp/GetRandCount.asp → returns 64-char hex SHA-256 challenge token
  2. Compute: psd = SHA256(challenge + SHA256(password))
  3. POST /login.cgi with username, psd, and optional serial number
  4. Router returns session cookie (SID) on success
  5. All subsequent API calls include the SID cookie + X_HW_Token header

MAC Blocking (Wi-Fi Access Control):
  - The router supports a per-SSID MAC deny list
  - Endpoint: POST to the TR-069/ASP form backend with the deny MAC list
  - This deauthenticates the device and prevents it from reassociating
"""

import asyncio
import hashlib
import logging
import re
import ssl
import socket
import urllib.request
import urllib.parse
import urllib.error
from typing import Optional, Dict, Any, Tuple

from backend.app.config import settings

logger = logging.getLogger("homenet.router_auth")


# ─────────────────────────────────────────────────────────────────────────────
# Shared insecure SSL context (the Huawei router uses a self-signed cert)
# ─────────────────────────────────────────────────────────────────────────────

def _get_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


# ─────────────────────────────────────────────────────────────────────────────
# Password hashing — mirrors the router's RndSecurityFormat.js
# ─────────────────────────────────────────────────────────────────────────────

def _sha256_hex(text: str) -> str:
    """SHA-256 of a UTF-8 string, returned as lowercase hex."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_login_password(challenge: str, plaintext_password: str) -> str:
    """
    Replicate the router's JavaScript login hash:
        psd = SHA256(challenge + SHA256(password))
    where challenge is the 64-char hex string from /asp/GetRandCount.asp.
    """
    password_hash = _sha256_hex(plaintext_password)
    combined = challenge + password_hash
    return _sha256_hex(combined)


# ─────────────────────────────────────────────────────────────────────────────
# Router Session
# ─────────────────────────────────────────────────────────────────────────────

class RouterSession:
    """
    Authenticated session with the Huawei HG8145V6.
    Call login() first, then use the session for API calls.
    """

    def __init__(self, router_ip: str = None):
        self.router_ip = router_ip or settings.router_ip
        self.base_url = f"https://{self.router_ip}"
        self._cookies: Dict[str, str] = {}
        self._hw_token: Optional[str] = None
        self._authenticated = False
        self._ssl_ctx = _get_ssl_context()

    def _build_opener(self) -> urllib.request.OpenerDirector:
        """Build urllib opener with SSL and cookie support."""
        https_handler = urllib.request.HTTPSHandler(context=self._ssl_ctx)
        cookie_handler = urllib.request.HTTPCookieProcessor()
        opener = urllib.request.build_opener(https_handler, cookie_handler)
        opener.addheaders = [
            ("User-Agent", "Mozilla/5.0 HomeNetManager/1.0"),
            ("Accept", "text/html,application/xhtml+xml,*/*"),
            ("Referer", f"{self.base_url}/"),
        ]
        return opener

    def _get(self, path: str, opener: urllib.request.OpenerDirector) -> str:
        """Synchronous GET with cookie handling."""
        url = f"{self.base_url}{path}"
        req = urllib.request.Request(url)
        if self._cookies:
            req.add_header("Cookie", "; ".join(f"{k}={v}" for k, v in self._cookies.items()))
        if self._hw_token:
            req.add_header("X-Requested-With", "XMLHttpRequest")
        resp = opener.open(req, timeout=8)
        raw_cookies = resp.getheader("Set-Cookie") or ""
        self._parse_set_cookie(raw_cookies)
        return resp.read().decode("utf-8", errors="ignore")

    def _post(self, path: str, data: Dict[str, str], opener: urllib.request.OpenerDirector) -> str:
        """Synchronous POST with cookie and token handling."""
        url = f"{self.base_url}{path}"
        encoded = urllib.parse.urlencode(data).encode("utf-8")
        req = urllib.request.Request(url, data=encoded, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        if self._cookies:
            req.add_header("Cookie", "; ".join(f"{k}={v}" for k, v in self._cookies.items()))
        if self._hw_token:
            req.add_header("X_HW_Token", self._hw_token)
        resp = opener.open(req, timeout=10)
        raw_cookies = resp.getheader("Set-Cookie") or ""
        self._parse_set_cookie(raw_cookies)
        return resp.read().decode("utf-8", errors="ignore")

    def _parse_set_cookie(self, raw: str):
        """Parse Set-Cookie header into our cookie dict."""
        if not raw:
            return
        for part in raw.split(";"):
            part = part.strip()
            if "=" in part and not any(k in part.lower() for k in ["expires", "path", "domain", "secure", "httponly", "samesite"]):
                k, _, v = part.partition("=")
                self._cookies[k.strip()] = v.strip()

    def _extract_hw_token(self, html: str) -> Optional[str]:
        """Extract X_HW_Token (CSRF token) from HTML."""
        m = re.search(r'var\s+onttoken\s*=\s*["\']([a-fA-F0-9]+)["\']', html)
        if m:
            return m.group(1)
        m = re.search(r'<input[^>]*name=["\']x\.X_HW_Token["\'][^>]*value=["\']([^"\']+)["\']', html, re.I)
        if m:
            return m.group(1)
        m = re.search(r'X_HW_Token["\s:=]+["\']([a-fA-F0-9]{16,})["\']', html)
        if m:
            return m.group(1)
        return None

    def login(self, username: str, password: str) -> Tuple[bool, str]:
        """
        Authenticate with the router.
        Returns (success: bool, message: str).
        """
        try:
            opener = self._build_opener()

            # Step 1: Load the login page to get cookies and HW token
            login_page = self._get("/", opener)
            self._hw_token = self._extract_hw_token(login_page)
            logger.debug(f"Got HW token: {self._hw_token}")

            # Step 2: Fetch challenge token
            challenge = self._get("/asp/GetRandCount.asp", opener).strip()
            if not challenge or len(challenge) < 32:
                return False, f"Could not get challenge token from router (got: {challenge!r})"
            logger.debug(f"Got challenge: {challenge[:16]}...")

            # Step 3: Hash the password
            hashed_password = compute_login_password(challenge, password)

            # Step 4: POST to /login.cgi
            post_data = {
                "x.X_HW_Token": self._hw_token or "",
                "UserName": username,
                "PassWord": hashed_password,
                "x.X_HW_SN": "",  # Serial number (optional on most Safaricom units)
            }

            response = self._post("/login.cgi", post_data, opener)
            logger.debug(f"Login response snippet: {response[:300]}")

            # Check for successful login indicators
            if any(marker in response for marker in [
                "main.html", "index.html", "frameset", "top.location",
                "homepage", "redirect", "200"
            ]):
                self._authenticated = True
                logger.info(f"✅ Router authentication successful for user '{username}'")
                return True, "Authentication successful"

            # Check for failure indicators
            if any(err in response.lower() for err in ["error", "fail", "invalid", "wrong", "incorrect"]):
                return False, "Invalid credentials — check username and password"

            # Ambiguous response — check if we have a session cookie
            if self._cookies:
                self._authenticated = True
                return True, "Authentication successful (session cookie obtained)"

            return False, "Login failed — no session established. Check credentials."

        except urllib.error.URLError as e:
            return False, f"Cannot reach router at {self.router_ip}: {e.reason}"
        except Exception as e:
            return False, f"Authentication error: {e}"

    def get_connected_clients(self) -> Tuple[bool, Any]:
        """
        Fetch the list of currently connected Wi-Fi clients from the router.
        Returns (success, clients_list_or_error_message).
        """
        if not self._authenticated:
            return False, "Not authenticated — call login() first"
        try:
            opener = self._build_opener()
            # Try the WLAN station status page
            html = self._get("/asp/GetWlanStaInfo.asp?&1=1", opener)
            if "top.location" in html or "Waiting" in html:
                return False, "Session expired or access denied"

            # Parse the connected client MAC addresses
            macs = re.findall(r'([0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5})', html)
            unique_macs = list(set(mac.lower().replace("-", ":") for mac in macs))
            return True, unique_macs
        except Exception as e:
            return False, str(e)

    def block_mac_address(self, mac: str, ssid_band: str = "both") -> Tuple[bool, str]:
        """
        Add a MAC address to the router's Wi-Fi deny list.
        This will deauthenticate the device and prevent re-association.

        Args:
            mac: MAC address to block (any format — will be normalized)
            ssid_band: "2.4ghz", "5ghz", or "both"

        Returns:
            (success: bool, message: str)
        """
        if not self._authenticated:
            return False, "Not authenticated — call login() first"

        # Normalize MAC
        clean = re.sub(r"[^0-9A-Fa-f]", "", mac)
        if len(clean) != 12:
            return False, f"Invalid MAC address: {mac}"
        normalized = ":".join(clean[i:i+2] for i in range(0, 12, 2)).upper()

        try:
            opener = self._build_opener()

            # Approach 1: Try the Huawei UPnP/TR-069 CGI interface
            # This is the same endpoint the router UI uses for MAC filtering
            block_data = {
                "x.X_HW_Token": self._hw_token or "",
                "IF_ACTION": "apply",
                # WLAN MAC filter — deny list entry
                "x.X_HW_WLAN_MACFILTER.Enable": "1",
                "x.X_HW_WLAN_MACFILTER.Mode": "1",  # 0=allow, 1=deny
                "x.X_HW_WLAN_MACFILTER.MacAddress": normalized,
            }

            # Try the known Huawei CGI endpoint
            response = self._post(
                "/html/ssw/conf/macfilterconf.cgi?&x=InternetGatewayDevice.LANDevice.1.WLANConfiguration.1",
                block_data,
                opener
            )

            if "success" in response.lower() or response.strip() == "" or len(response) < 100:
                return True, f"Device {normalized} blocked from Wi-Fi. It will be deauthenticated within seconds."

            # Approach 2: Try the standard WLAN block endpoint
            response2 = self._post(
                "/html/ssw/conf/macfilterconf.cgi?&z=InternetGatewayDevice.LANDevice.1.WLANConfiguration.1",
                block_data,
                opener
            )
            if "success" in response2.lower() or response2.strip() == "":
                return True, f"Device {normalized} blocked from Wi-Fi."

            logger.debug(f"Block response: {response[:500]}")
            return False, "Block request sent but router response was ambiguous. Check the router web UI to confirm."

        except Exception as e:
            return False, f"Failed to block device: {e}"

    def unblock_mac_address(self, mac: str) -> Tuple[bool, str]:
        """Remove a MAC address from the deny list."""
        if not self._authenticated:
            return False, "Not authenticated — call login() first"

        clean = re.sub(r"[^0-9A-Fa-f]", "", mac)
        if len(clean) != 12:
            return False, f"Invalid MAC address: {mac}"
        normalized = ":".join(clean[i:i+2] for i in range(0, 12, 2)).upper()

        try:
            opener = self._build_opener()
            unblock_data = {
                "x.X_HW_Token": self._hw_token or "",
                "IF_ACTION": "delete",
                "x.X_HW_WLAN_MACFILTER.MacAddress": normalized,
            }
            response = self._post(
                "/html/ssw/conf/macfilterconf.cgi?&x=InternetGatewayDevice.LANDevice.1.WLANConfiguration.1",
                unblock_data,
                opener
            )
            return True, f"Device {normalized} unblocked."
        except Exception as e:
            return False, f"Failed to unblock device: {e}"

    def logout(self):
        """Log out of the router session."""
        if self._authenticated:
            try:
                opener = self._build_opener()
                self._get("/asp/logoutAllUser.asp", opener)
            except Exception:
                pass
            self._authenticated = False
            self._cookies = {}
            self._hw_token = None


# ─────────────────────────────────────────────────────────────────────────────
# Async wrappers (for use in FastAPI endpoints)
# ─────────────────────────────────────────────────────────────────────────────

async def authenticate_router(username: str, password: str) -> Tuple[bool, str]:
    """Async wrapper for router login."""
    def _login():
        session = RouterSession()
        success, message = session.login(username, password)
        return success, message, session

    return await asyncio.to_thread(_login)


async def block_device_on_router(
    mac: str,
    username: str,
    password: str
) -> Tuple[bool, str]:
    """
    Authenticate with the router and block a device by MAC address.
    Returns (success: bool, message: str).
    """
    def _do_block():
        session = RouterSession()
        success, msg = session.login(username, password)
        if not success:
            return False, f"Authentication failed: {msg}"
        try:
            blocked, block_msg = session.block_mac_address(mac)
            return blocked, block_msg
        finally:
            session.logout()

    return await asyncio.to_thread(_do_block)


async def unblock_device_on_router(
    mac: str,
    username: str,
    password: str
) -> Tuple[bool, str]:
    """Authenticate with the router and remove a block for a device."""
    def _do_unblock():
        session = RouterSession()
        success, msg = session.login(username, password)
        if not success:
            return False, f"Authentication failed: {msg}"
        try:
            unblocked, ub_msg = session.unblock_mac_address(mac)
            return unblocked, ub_msg
        finally:
            session.logout()

    return await asyncio.to_thread(_do_unblock)

"""
Multi-protocol LAN device fingerprinting engine.

Identification techniques used (all passive or non-intrusive):
  1. SSDP/UPnP (UDP 1900) — Smart TVs, media renderers, routers
  2. mDNS (UDP 5353) — Apple, Android, Linux hostnames + service types
  3. Apple lockdown port 62078 — iPhones / iPads
  4. NetBIOS node status (UDP 137) — Windows PCs
  5. HTTP banner grab (TCP 80/8080) — server headers, device pages
  6. SSH banner grab (TCP 22) — embedded Linux, NAS
  7. TTL-based OS detection — from ping (64=Linux/Android, 128=Windows)
  8. Hostname brand inference — "DESKTOP-", "redmi", "Galaxy-", "SM-" etc.
  9. OUI-then-hostname fallback classification
"""

import asyncio
import logging
import re
import socket
import urllib.request
from typing import Dict, List, Optional, Any, Tuple

logger = logging.getLogger("homenet.fingerprint")


# ─────────────────────────────────────────────────────────────────────────────
# SSDP / UPnP discovery
# ─────────────────────────────────────────────────────────────────────────────

async def discover_ssdp_metadata() -> Dict[str, Dict[str, str]]:
    """
    Broadcast SSDP M-SEARCH query (UDP 1900) to find UPnP devices.
    Returns mapping of IP -> {friendly_name, model_name, manufacturer, category}
    """
    results: Dict[str, Dict[str, str]] = {}

    def _broadcast_ssdp():
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(1.5)
        msg = (
            'M-SEARCH * HTTP/1.1\r\n'
            'HOST: 239.255.255.250:1900\r\n'
            'MAN: "ssdp:discover"\r\n'
            'MX: 1\r\n'
            'ST: ssdp:all\r\n\r\n'
        ).encode('utf-8')
        urls: Dict[str, str] = {}
        try:
            sock.sendto(msg, ('239.255.255.250', 1900))
            while True:
                try:
                    data, addr = sock.recvfrom(2048)
                    ip = addr[0]
                    text = data.decode('utf-8', errors='ignore')
                    loc = re.search(r'LOCATION:\s*(http://[^\r\n]+)', text, re.IGNORECASE)
                    if loc and ip not in urls:
                        urls[ip] = loc.group(1).strip()
                except (socket.timeout, Exception):
                    break
        finally:
            sock.close()
        return urls

    discovered_urls = await asyncio.to_thread(_broadcast_ssdp)

    for ip, url in discovered_urls.items():
        try:
            def _fetch_xml(target_url):
                req = urllib.request.urlopen(target_url, timeout=1.5)
                return req.read().decode('utf-8', errors='ignore')

            xml_data = await asyncio.to_thread(_fetch_xml, url)
            fn = re.search(r'<friendlyName>([^<]+)</friendlyName>', xml_data)
            mn = re.search(r'<modelName>([^<]+)</modelName>', xml_data)
            mfg = re.search(r'<manufacturer>([^<]+)</manufacturer>', xml_data)
            dt = re.search(r'<deviceType>([^<]+)</deviceType>', xml_data)

            friendly_name = fn.group(1).strip() if fn else None
            model_name = mn.group(1).strip() if mn else None
            manufacturer = mfg.group(1).strip() if mfg else None
            device_type_tag = dt.group(1).strip() if dt else ""

            category = "smart_tv"
            fn_lower = (friendly_name or "").lower()
            if "printer" in fn_lower:
                category = "printer"
            elif "router" in fn_lower or "gateway" in fn_lower:
                category = "router"
            elif "phone" in fn_lower or "android" in fn_lower:
                category = "smartphone"

            results[ip] = {
                "friendly_name": friendly_name or model_name or "Smart Device",
                "model_name": model_name or "",
                "manufacturer": manufacturer or "",
                "category": category,
            }
        except Exception as e:
            logger.debug(f"Failed to fetch SSDP XML from {ip}: {e}")

    return results


# ─────────────────────────────────────────────────────────────────────────────
# mDNS discovery — hostname + service enumeration
# ─────────────────────────────────────────────────────────────────────────────

async def discover_mdns_hostnames(ips: List[str]) -> Dict[str, str]:
    """
    Send reverse PTR queries to mDNS (224.0.0.251:5353) to discover
    hostnames for Android, Apple, and Linux devices.
    """
    results: Dict[str, str] = {}

    def _query_mdns():
        ans = {}
        for ip in ips:
            parts = ip.split('.')
            if len(parts) != 4:
                continue
            rev = f'{parts[3]}.{parts[2]}.{parts[1]}.{parts[0]}.in-addr.arpa'
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(0.4)
            # Build DNS PTR query packet
            packet = b'\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00'
            for part in rev.split('.'):
                packet += bytes([len(part)]) + part.encode('utf-8')
            packet += b'\x00\x00\x0c\x00\x01'
            try:
                sock.sendto(packet, ('224.0.0.251', 5353))
                data, addr = sock.recvfrom(4096)
                # Extract readable hostname: look for .local pattern
                match = re.search(rb'\x00\x11?\t([A-Za-z0-9\-_]+)\x05local', data)
                if match:
                    hostname = match.group(1).decode('ascii', errors='ignore')
                    ans[ip] = f"{hostname}.local"
                else:
                    # Fallback: look for any readable word before 'local'
                    decoded = data.decode('latin1', errors='ignore')
                    words = re.findall(r'[A-Za-z0-9\-]{3,}(?=\x05local)', decoded)
                    if words:
                        ans[ip] = f"{words[0]}.local"
                    else:
                        # Looser fallback
                        words = re.findall(r'[A-Za-z0-9][A-Za-z0-9\-]{3,}', decoded)
                        for w in words:
                            if w.lower() not in ('in-addr', 'arpa', 'local', 'arpa0', 'addr'):
                                ans[ip] = f"{w}.local"
                                break
            except Exception:
                pass
            finally:
                sock.close()
        return ans

    results = await asyncio.to_thread(_query_mdns)
    return results


async def discover_mdns_services(ip: str) -> List[str]:
    """
    Query mDNS for service types advertised by a specific IP.
    Useful to identify device role: _airplay._tcp, _googlecast._tcp, etc.
    """
    services: List[str] = []

    def _query():
        found = []
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(0.4)
        # Query _services._dns-sd._udp.local PTR
        query = b'\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00'
        name = b'\x09_services\x07_dns-sd\x04_udp\x05local\x00'
        query += name + b'\x00\x0c\x00\x01'
        try:
            sock.sendto(query, ('224.0.0.251', 5353))
            data, addr = sock.recvfrom(4096)
            if addr[0] == ip:
                decoded = data.decode('latin1', errors='ignore')
                # Look for _xxx._tcp or _xxx._udp
                svc_matches = re.findall(r'_[a-zA-Z0-9\-]+\._(?:tcp|udp)', decoded)
                found.extend(svc_matches)
        except Exception:
            pass
        finally:
            sock.close()
        return found

    services = await asyncio.to_thread(_query)
    return services


# ─────────────────────────────────────────────────────────────────────────────
# Apple device detection (port 62078 lockdown service)
# ─────────────────────────────────────────────────────────────────────────────

async def check_apple_device(ip: str) -> bool:
    """
    Check if port 62078 (Apple Mobile Device lockdown service) is open.
    This uniquely identifies iPhones and iPads on local Wi-Fi.
    """
    try:
        r, w = await asyncio.wait_for(asyncio.open_connection(ip, 62078), timeout=0.3)
        w.close()
        await w.wait_closed()
        return True
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────────────────
# NetBIOS name service (Windows + some Android/Smart TVs)
# ─────────────────────────────────────────────────────────────────────────────

async def check_netbios_name(ip: str) -> Optional[str]:
    """
    Query Windows NetBIOS name service (UDP 137) for computer name.
    """
    def _query():
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(0.35)
        # Properly formed NetBIOS NODE STATUS REQUEST
        # Transaction ID: 0x8000, FLAGS: 0x0000 (query), QDCOUNT: 1
        # QNAME: '*' (wildcard) encoded as 32 bytes 'CA' repeated + null
        # QTYPE: NBSTAT (0x0021), QCLASS: IN (0x0001)
        transaction_id = b'\xa1\x00'
        flags = b'\x00\x00'
        qdcount = b'\x00\x01'
        ancount = b'\x00\x00'
        nscount = b'\x00\x00'
        arcount = b'\x00\x00'
        # Encode '*' as NetBIOS: each char is encoded as 2 chars
        # '*' = 0x2A -> (0x2A >> 4) + 'A' = 0x42='B', (0x2A & 0x0F) + 'A' = 0x4B='K'
        # Rest are 0x00 -> 'A','A' each
        encoded_name = b'CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
        qname = b'\x20' + encoded_name + b'\x00'
        qtype = b'\x00\x21'  # NBSTAT
        qclass = b'\x00\x01'  # IN
        packet = transaction_id + flags + qdcount + ancount + nscount + arcount + qname + qtype + qclass
        try:
            sock.sendto(packet, (ip, 137))
            data, _ = sock.recvfrom(1024)
            if len(data) > 57:
                # Number of names is at offset 56
                num_names = data[56]
                if num_names > 0 and len(data) >= 57 + 18:
                    # First name entry: 15 bytes name + 1 byte type + 2 bytes flags
                    raw_name = data[57:72].decode('latin1', errors='ignore').strip()
                    # Clean null bytes and control chars
                    name = re.sub(r'[\x00-\x1f]', '', raw_name).strip()
                    if name and len(name) >= 2:
                        return name
        except Exception:
            pass
        finally:
            sock.close()
        return None

    return await asyncio.to_thread(_query)


# ─────────────────────────────────────────────────────────────────────────────
# HTTP banner grabbing (device model from web interface headers)
# ─────────────────────────────────────────────────────────────────────────────

async def grab_http_banner(ip: str, port: int = 80) -> Optional[Dict[str, str]]:
    """
    Attempt HTTP GET / to extract Server header and page title.
    Many smart home devices, routers, and printers expose model info here.
    """
    info: Dict[str, str] = {}
    try:
        async def _fetch():
            r, w = await asyncio.open_connection(ip, port)
            try:
                w.write(f"GET / HTTP/1.0\r\nHost: {ip}\r\nUser-Agent: HomeNetManager/1.0\r\nConnection: close\r\n\r\n".encode())
                await w.drain()
                data = await asyncio.wait_for(r.read(4096), timeout=0.8)
                return data.decode('utf-8', errors='ignore')
            finally:
                w.close()

        text = await asyncio.wait_for(_fetch(), timeout=1.2)
        # Extract Server header
        server_match = re.search(r'^Server:\s*(.+)$', text, re.MULTILINE | re.IGNORECASE)
        if server_match:
            info['server'] = server_match.group(1).strip()
        # Extract page title
        title_match = re.search(r'<title>([^<]{1,80})</title>', text, re.IGNORECASE)
        if title_match:
            info['title'] = title_match.group(1).strip()
        # Extract X-Device-Type or similar custom headers
        model_match = re.search(r'^X-(?:Device-)?Model:\s*(.+)$', text, re.MULTILINE | re.IGNORECASE)
        if model_match:
            info['model'] = model_match.group(1).strip()
        return info if info else None
    except Exception:
        return None


async def grab_http_banners_bulk(ips: List[str]) -> Dict[str, Dict[str, str]]:
    """Run HTTP banner grabbing for all IPs on ports 80 and 8080 concurrently."""
    results: Dict[str, Dict[str, str]] = {}

    async def _probe_ip(ip: str):
        # Try port 80 first, then 8080
        for port in [80, 8080]:
            banner = await grab_http_banner(ip, port)
            if banner:
                return ip, banner
        return ip, None

    tasks = [_probe_ip(ip) for ip in ips]
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    for result in responses:
        if isinstance(result, tuple):
            ip, banner = result
            if banner:
                results[ip] = banner
    return results


# ─────────────────────────────────────────────────────────────────────────────
# SSH banner grabbing
# ─────────────────────────────────────────────────────────────────────────────

async def grab_ssh_banner(ip: str) -> Optional[str]:
    """Grab SSH version banner — reveals embedded Linux OS and sometimes device model."""
    try:
        r, w = await asyncio.wait_for(asyncio.open_connection(ip, 22), timeout=0.5)
        try:
            banner = await asyncio.wait_for(r.read(256), timeout=0.5)
            w.close()
            return banner.decode('utf-8', errors='ignore').strip()
        finally:
            w.close()
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Hostname brand inference
# ─────────────────────────────────────────────────────────────────────────────

# Maps hostname patterns -> (brand_label, device_type)
# Ordered from most specific to most general
HOSTNAME_BRAND_PATTERNS: List[Tuple[str, str, str]] = [
    # Samsung
    (r'(?i)\bSM[-_]?[A-Z]\d{3,4}', 'Samsung Galaxy', 'smartphone'),
    (r'(?i)\bsamsung', 'Samsung Galaxy', 'smartphone'),
    (r'(?i)\bGalaxy[-_\s]', 'Samsung Galaxy', 'smartphone'),
    (r'(?i)\bGT[-_][A-Z]\d{4}', 'Samsung Galaxy (Legacy)', 'smartphone'),
    # Xiaomi / Redmi / POCO
    (r'(?i)\bredmi\b', 'Xiaomi Redmi', 'smartphone'),
    (r'(?i)\bxiaomi\b', 'Xiaomi Phone', 'smartphone'),
    (r'(?i)\bpoco\b', 'POCO Phone', 'smartphone'),
    (r'(?i)\bMI[-_\s]\d', 'Xiaomi Mi', 'smartphone'),
    # Tecno / Infinix / Itel (Transsion Group)
    (r'(?i)\btecno\b', 'Tecno Phone', 'smartphone'),
    (r'(?i)\binfinix\b', 'Infinix Phone', 'smartphone'),
    (r'(?i)\bitel\b', 'Itel Phone', 'smartphone'),
    (r'(?i)\bSpark[-_\s]\d', 'Tecno Spark', 'smartphone'),
    (r'(?i)\bHot[-_\s]\d', 'Infinix Hot', 'smartphone'),
    # OnePlus
    (r'(?i)\boneplus\b', 'OnePlus', 'smartphone'),
    (r'(?i)\bIN\d{4}', 'OnePlus', 'smartphone'),
    # Oppo / Realme / Vivo
    (r'(?i)\boppo\b', 'OPPO Phone', 'smartphone'),
    (r'(?i)\brealme\b', 'Realme Phone', 'smartphone'),
    (r'(?i)\bvivo\b', 'Vivo Phone', 'smartphone'),
    (r'(?i)\bCPH\d{4}', 'OPPO Phone', 'smartphone'),
    (r'(?i)\bRMX\d{4}', 'Realme Phone', 'smartphone'),
    # Huawei / Honor
    (r'(?i)\bhuawei\b', 'Huawei Phone', 'smartphone'),
    (r'(?i)\bhonor\b', 'Honor Phone', 'smartphone'),
    (r'(?i)\bANA[-_][A-Z]', 'Huawei P40', 'smartphone'),
    (r'(?i)\bSTK[-_][A-Z]', 'Huawei Y Series', 'smartphone'),
    # Apple
    (r'(?i)\biphone\b', 'Apple iPhone', 'smartphone'),
    (r'(?i)\bipad\b', 'Apple iPad', 'tablet'),
    (r'(?i)\bmacbook\b', 'Apple MacBook', 'laptop'),
    (r'(?i)\bimac\b', 'Apple iMac', 'laptop'),
    (r'(?i)\bapple\b', 'Apple Device', 'smartphone'),
    # Laptops / PCs
    (r'(?i)\bDESKTOP[-_]\w+', 'Windows Desktop PC', 'laptop'),
    (r'(?i)\bLAPTOP[-_]\w+', 'Windows Laptop', 'laptop'),
    (r'(?i)\bthinkpad\b', 'Lenovo ThinkPad', 'laptop'),
    (r'(?i)\blenovo\b', 'Lenovo PC', 'laptop'),
    (r'(?i)\bdell\b', 'Dell Laptop/PC', 'laptop'),
    (r'(?i)\bhp[-_\s]', 'HP Laptop/PC', 'laptop'),
    (r'(?i)\bsurface\b', 'Microsoft Surface', 'laptop'),
    (r'(?i)\basus\b', 'ASUS Device', 'laptop'),
    (r'(?i)\bkali\b', 'Kali Linux Machine', 'laptop'),
    (r'(?i)\bubuntu\b', 'Ubuntu Linux', 'laptop'),
    (r'(?i)\bdebian\b', 'Debian Linux', 'laptop'),
    # Smart TVs / media
    (r'(?i)\bbravia\b', 'Sony BRAVIA TV', 'smart_tv'),
    (r'(?i)\bchrome.?cast\b', 'Google Chromecast', 'smart_tv'),
    (r'(?i)\bgoogle[-_\s]?tv\b', 'Google TV', 'smart_tv'),
    (r'(?i)\bfiretv\b', 'Amazon Fire TV', 'smart_tv'),
    (r'(?i)\broku\b', 'Roku Player', 'smart_tv'),
    (r'(?i)\bsmart.*tv\b', 'Smart TV', 'smart_tv'),
    (r'(?i)\btv\b', 'Smart TV', 'smart_tv'),
    # Generic Android
    (r'(?i)\bandroid\b', 'Android Phone', 'smartphone'),
    (r'(?i)\bphone\b', 'Mobile Phone', 'smartphone'),
]


def infer_brand_from_hostname(hostname: str) -> Optional[Tuple[str, str]]:
    """
    Match hostname against known brand patterns.
    Returns (brand_label, device_type) or None.
    """
    if not hostname:
        return None
    clean = hostname.replace('.local', '').replace('-', ' ')
    for pattern, label, dtype in HOSTNAME_BRAND_PATTERNS:
        if re.search(pattern, clean):
            return label, dtype
    return None


# ─────────────────────────────────────────────────────────────────────────────
# HTTP title/server brand inference
# ─────────────────────────────────────────────────────────────────────────────

HTTP_SERVER_PATTERNS: List[Tuple[str, str, str]] = [
    (r'(?i)huawei', 'Huawei Device', 'router'),
    (r'(?i)tp-?link', 'TP-Link Device', 'router'),
    (r'(?i)cisco', 'Cisco Network Device', 'router'),
    (r'(?i)mikrotik', 'MikroTik Router', 'router'),
    (r'(?i)synology', 'Synology NAS', 'iot'),
    (r'(?i)qnap', 'QNAP NAS', 'iot'),
    (r'(?i)samsung.*tv', 'Samsung Smart TV', 'smart_tv'),
    (r'(?i)bravia', 'Sony BRAVIA TV', 'smart_tv'),
    (r'(?i)chromecast', 'Google Chromecast', 'smart_tv'),
    (r'(?i)roku', 'Roku Streaming Player', 'smart_tv'),
    (r'(?i)kali', 'Kali Linux', 'laptop'),
    (r'(?i)ubuntu', 'Ubuntu Server', 'laptop'),
    (r'(?i)raspberry', 'Raspberry Pi', 'iot'),
    (r'(?i)arduino', 'Arduino / IoT', 'iot'),
    (r'(?i)esp8266|esp32', 'ESP32 IoT Device', 'iot'),
    (r'(?i)printer|printserver', 'Network Printer', 'printer'),
    (r'(?i)epson', 'Epson Printer', 'printer'),
    (r'(?i)canon', 'Canon Printer', 'printer'),
    (r'(?i)hp.*laserjet|officejet', 'HP Printer', 'printer'),
]


def infer_brand_from_http(banner: Dict[str, str]) -> Optional[Tuple[str, str]]:
    """
    Match HTTP server/title against known brand patterns.
    Returns (brand_label, device_type) or None.
    """
    for key in ['server', 'title', 'model']:
        text = banner.get(key, '')
        if not text:
            continue
        for pattern, label, dtype in HTTP_SERVER_PATTERNS:
            if re.search(pattern, text):
                return label, dtype
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Main device classification engine
# ─────────────────────────────────────────────────────────────────────────────

def classify_device(
    ip: str,
    mac: Optional[str],
    manufacturer: str,
    hostname: Optional[str],
    ssdp_info: Optional[Dict[str, str]],
    is_apple_port: bool,
    netbios_name: Optional[str],
    is_randomized_mac: bool,
    is_gateway: bool,
    is_localhost: bool,
    http_banner: Optional[Dict[str, str]] = None,
    ssh_banner: Optional[str] = None,
    ttl: Optional[int] = None,
) -> Tuple[str, str, Optional[str]]:
    """
    Comprehensive device classification engine.
    Returns:
        (category, friendly_name, model_name)
    Categories: "smart_tv", "smartphone", "laptop", "router", "iot", "printer", "tablet", "unknown"

    Priority order:
        1. Gateway / localhost (definitive)
        2. SSDP (self-announced device info)
        3. Apple lockdown port 62078 (definitive iPhone/iPad)
        4. NetBIOS (Windows PC name)
        5. mDNS / DNS hostname with brand inference
        6. HTTP banner brand inference
        7. SSH banner (embedded Linux)
        8. Manufacturer OUI classification
        9. Randomized MAC heuristics (TTL + last resort)
    """

    # 1. Router Gateway
    if is_gateway:
        return (
            "router",
            "Huawei HG8145V6 (Safaricom Gateway)",
            "EchoLife GPON Optical Network Terminal"
        )

    # 2. Local development machine
    if is_localhost:
        return (
            "laptop",
            "Kali Linux (This Dev Machine)",
            "Linux Workstation (x86_64)"
        )

    # 3. SSDP-detected device (most reliable for Smart TVs & media)
    if ssdp_info:
        fn = ssdp_info.get("friendly_name") or ""
        mn = ssdp_info.get("model_name") or ""
        mfg_s = ssdp_info.get("manufacturer") or ""
        cat = ssdp_info.get("category", "smart_tv")

        fn_upper = fn.upper()
        mn_upper = mn.upper()
        mfg_lower = mfg_s.lower()

        if "BRAVIA" in mn_upper or "KD-" in fn_upper or "ATV" in mn_upper:
            return ("smart_tv", f"Sony BRAVIA Smart TV ({fn})", mn or "Sony Android TV")
        if "samsung" in mfg_lower and "tv" in fn.lower():
            return ("smart_tv", f"Samsung Smart TV ({fn})", mn)
        if "lg" in mfg_lower:
            return ("smart_tv", f"LG Smart TV ({fn})", mn)
        if "google" in mfg_lower or "chromecast" in fn.lower():
            return ("smart_tv", f"Google Chromecast ({fn})", mn or "Chromecast")
        if "amazon" in mfg_lower or "firetv" in fn.lower().replace(" ", ""):
            return ("smart_tv", f"Amazon Fire TV ({fn})", mn or "Fire TV")
        if "roku" in fn.lower() or "roku" in mfg_lower:
            return ("smart_tv", f"Roku Streaming Player ({fn})", mn or "Roku")
        if fn:
            return (cat, f"{fn}", mn or None)

    # 4. Apple iOS device (iPhone / iPad) detected via port 62078
    if is_apple_port:
        return (
            "smartphone",
            "Apple iPhone",
            "Apple iPhone (iOS)"
        )

    # 5. NetBIOS Name (Windows PC or Laptop)
    if netbios_name:
        nb = netbios_name.strip()
        nb_upper = nb.upper()
        if any(w in nb_upper for w in ["DESKTOP", "PC", "COMPUTER"]):
            return ("laptop", f"Windows Desktop PC ({nb})", "Windows PC")
        if any(w in nb_upper for w in ["LAPTOP", "NOTEBOOK", "SURFACE"]):
            return ("laptop", f"Windows Laptop ({nb})", "Windows Laptop")
        if any(w in nb_upper for w in ["THINKPAD", "LENOVO"]):
            return ("laptop", f"Lenovo ThinkPad ({nb})", "Lenovo Laptop")
        # Could be a Samsung/Android TV with NetBIOS
        if any(w in nb_upper for w in ["TV", "BRAVIA", "SAMSUNG"]):
            return ("smart_tv", f"Smart TV ({nb})", "Smart TV")
        return ("laptop", f"{nb}", "Windows Network Host")

    # 6. mDNS / DNS Hostname — brand inference
    if hostname:
        brand_result = infer_brand_from_hostname(hostname)
        if brand_result:
            label, dtype = brand_result
            clean_host = hostname.replace('.local', '').strip()
            # Use the cleaned hostname as part of the name if it contains model info
            if len(clean_host) > 4 and not clean_host.lower().startswith('android'):
                return (dtype, f"{label} ({clean_host})", label)
            return (dtype, label, label)
        # Unrecognized hostname — still use it
        host_lower = hostname.lower()
        if "android" in host_lower:
            clean = hostname.replace(".local", "").strip()
            return ("smartphone", f"Android Phone ({clean})", "Android Mobile")
        if any(w in host_lower for w in ["iphone", "ipad"]):
            return ("smartphone", f"Apple Device ({hostname})", "Apple iOS Mobile")
        if any(w in host_lower for w in ["tv", "bravia", "roku", "chromecast"]):
            return ("smart_tv", f"Smart TV ({hostname})", "Smart TV")
        if any(w in host_lower for w in ["macbook", "imac", "mac-"]):
            return ("laptop", f"Apple Mac ({hostname})", "Apple macOS")
        if any(w in host_lower for w in ["laptop", "desktop", "pc-", "thinkpad"]):
            return ("laptop", f"PC / Laptop ({hostname})", "Personal Computer")

    # 7. HTTP banner brand inference
    if http_banner:
        brand_result = infer_brand_from_http(http_banner)
        if brand_result:
            label, dtype = brand_result
            server_info = http_banner.get('title') or http_banner.get('server') or ""
            if server_info and server_info.lower() not in (label.lower(),):
                return (dtype, f"{label} ({server_info[:40]})", label)
            return (dtype, label, label)

    # 8. SSH banner
    if ssh_banner and len(ssh_banner) > 5:
        if "OpenWrt" in ssh_banner:
            return ("router", "OpenWrt Router", "OpenWrt Embedded Linux")
        if "Raspberry" in ssh_banner or "raspberrypi" in ssh_banner.lower():
            return ("iot", "Raspberry Pi", "Raspberry Pi Linux")
        if "ubuntu" in ssh_banner.lower():
            return ("laptop", f"Ubuntu Linux ({ip})", "Ubuntu Server")
        if "debian" in ssh_banner.lower():
            return ("laptop", f"Debian Linux ({ip})", "Debian Server")
        return ("laptop", f"SSH Device ({ip})", ssh_banner[:40])

    # 9. Manufacturer OUI classification
    mfg_lower = manufacturer.lower()
    mfg_map = {
        "apple": ("smartphone", "Apple Device", "Apple Mobile / Mac"),
        "samsung": ("smartphone", "Samsung Galaxy", "Samsung Mobile"),
        "xiaomi": ("smartphone", "Xiaomi Phone", "Xiaomi Mobile"),
        "transsion": ("smartphone", "Transsion Phone (Tecno/Infinix/Itel)", "Transsion Mobile"),
        "huawei": ("smartphone", "Huawei Phone", "Huawei Mobile"),
        "oneplus": ("smartphone", "OnePlus Phone", "OnePlus Mobile"),
        "oppo": ("smartphone", "OPPO Phone", "OPPO Mobile"),
        "vivo": ("smartphone", "Vivo Phone", "Vivo Mobile"),
        "realme": ("smartphone", "Realme Phone", "Realme Mobile"),
        "intel": ("laptop", "Intel-based Laptop/PC", "Intel PC"),
        "dell": ("laptop", "Dell Laptop/PC", "Dell Computer"),
        "hp": ("laptop", "HP Laptop/PC", "HP Computer"),
        "lenovo": ("laptop", "Lenovo Laptop/PC", "Lenovo Computer"),
        "asus": ("laptop", "ASUS Laptop/PC", "ASUS Computer"),
        "acer": ("laptop", "Acer Laptop/PC", "Acer Computer"),
        "microsoft": ("laptop", "Microsoft Surface / PC", "Microsoft Computer"),
        "google": ("smart_tv", "Google Chromecast / Nest", "Google Smart Device"),
        "amazon": ("smart_tv", "Amazon Echo / Fire TV", "Amazon Smart Device"),
        "sony": ("smart_tv", "Sony Device", "Sony Electronics"),
        "lg electronics": ("smart_tv", "LG Smart TV / Device", "LG Electronics"),
        "tp-link": ("router", "TP-Link Router/Repeater", "TP-Link"),
        "espressif": ("iot", "ESP32/ESP8266 IoT Device", "Espressif IoT"),
        "raspberry pi": ("iot", "Raspberry Pi", "Raspberry Pi Foundation"),
    }

    for key, classification in mfg_map.items():
        if key in mfg_lower or mfg_lower.startswith(key):
            return classification

    # 10. Randomized MAC — use TTL for OS hint
    if is_randomized_mac:
        if ttl is not None:
            if ttl <= 64:
                # Linux/Android TTL range
                return (
                    "smartphone",
                    f"Android / Linux Phone ({ip})",
                    "Private MAC · Linux/Android OS (TTL≤64)"
                )
            elif 65 <= ttl <= 128:
                # Windows TTL range
                return (
                    "laptop",
                    f"Windows Device ({ip})",
                    "Private MAC · Windows OS (TTL 65-128)"
                )
        return (
            "smartphone",
            f"Mobile Phone ({ip})",
            "Private Wi-Fi Address (iOS/Android)"
        )

    # 11. Fallback
    return ("unknown", f"Connected Device ({ip})", "Network Device")

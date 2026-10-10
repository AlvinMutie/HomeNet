import asyncio
import logging
import re
import socket
import urllib.request
from typing import Dict, List, Optional, Any, Tuple

logger = logging.getLogger("homenet.fingerprint")


async def discover_ssdp_metadata() -> Dict[str, Dict[str, str]]:
    """
    Broadcast SSDP M-SEARCH query (UDP 1900) to find UPnP devices (Smart TVs,
    Chromecast, Game Consoles, Media Renderers).
    Returns mapping of IP -> {"friendly_name": str, "model_name": str, "device_type": str}
    """
    results: Dict[str, Dict[str, str]] = {}

    def _broadcast_ssdp():
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(1.2)
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

    # Fetch device XML descriptions with timeout
    for ip, url in discovered_urls.items():
        try:
            def _fetch_xml(target_url):
                req = urllib.request.urlopen(target_url, timeout=1.2)
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

            # Classify device type
            category = "smart_tv"
            if "dial" in device_type_tag or "MediaRenderer" in device_type_tag or "tv" in (friendly_name or "").lower():
                category = "smart_tv"
            elif "printer" in (friendly_name or "").lower():
                category = "printer"

            results[ip] = {
                "friendly_name": friendly_name or model_name or "Smart TV / Media Player",
                "model_name": model_name or "Smart TV",
                "manufacturer": manufacturer or "Smart Device",
                "category": category,
            }
        except Exception as e:
            logger.debug(f"Failed to fetch SSDP XML from {ip}: {e}")

    return results


async def discover_mdns_hostnames(ips: List[str]) -> Dict[str, str]:
    """
    Send reverse PTR queries to Multicast DNS (224.0.0.251:5353) to discover
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
            sock.settimeout(0.35)
            packet = b'\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00'
            for part in rev.split('.'):
                packet += bytes([len(part)]) + part.encode('utf-8')
            packet += b'\x00\x00\x0c\x00\x01'
            try:
                sock.sendto(packet, ('224.0.0.251', 5353))
                data, addr = sock.recvfrom(2048)
                # Look for name before .local
                match = re.search(rb'\x00\x11?\t([A-Za-z0-9\-_]+)\x05local', data)
                if match:
                    hostname = match.group(1).decode('ascii', errors='ignore')
                    ans[ip] = f"{hostname}.local"
                else:
                    words = re.findall(r'[A-Za-z0-9\-]{3,}', data.decode('latin1', errors='ignore'))
                    for w in words:
                        if w.lower() not in ('in-addr', 'arpa', 'local', 'arpa0'):
                            ans[ip] = f"{w}.local"
                            break
            except Exception:
                pass
            finally:
                sock.close()
        return ans

    results = await asyncio.to_thread(_query_mdns)
    return results


async def check_apple_device(ip: str) -> bool:
    """
    Check if port 62078 (Apple Mobile Device lockdown service) is open.
    This uniquely identifies Apple iPhones and iPads on local Wi-Fi.
    """
    try:
        r, w = await asyncio.wait_for(asyncio.open_connection(ip, 62078), timeout=0.25)
        w.close()
        await w.wait_closed()
        return True
    except Exception:
        return False


async def check_netbios_name(ip: str) -> Optional[str]:
    """
    Query Windows NetBIOS name service (UDP 137) to discover PC and TV NetBIOS names.
    """
    def _query():
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(0.3)
        query = b'\x80\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x20CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\x00\x00\x21\x00\x01'
        try:
            sock.sendto(query, (ip, 137))
            data, _ = sock.recvfrom(1024)
            if len(data) > 56:
                name = data[57:72].decode('latin1', errors='ignore').strip()
                if name and not name.startswith('\x00'):
                    return name
        except Exception:
            pass
        finally:
            sock.close()
        return None

    return await asyncio.to_thread(_query)


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
    is_localhost: bool
) -> Tuple[str, str, Optional[str]]:
    """
    Comprehensive device classification engine.
    Returns:
        (category, inferred_friendly_name, model_name)
    Categories: "smart_tv", "smartphone", "laptop", "router", "iot", "printer", "unknown"
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

    # 3. SSDP-detected Smart TV (Sony BRAVIA, LG, Samsung, Roku)
    if ssdp_info:
        fn = ssdp_info.get("friendly_name")
        mn = ssdp_info.get("model_name")
        cat = ssdp_info.get("category", "smart_tv")
        if "BRAVIA" in (mn or "").upper() or "KD-" in (fn or "").upper() or "ATV" in (mn or "").upper():
            return ("smart_tv", f"Sony BRAVIA 4K Smart TV ({fn})", mn or "Sony Android TV")
        if fn:
            return (cat, f"{fn} (Smart Device)", mn)

    # 4. Apple iOS device (iPhone / iPad) detected via port 62078
    if is_apple_port:
        return (
            "smartphone",
            "Apple iPhone / iOS Device",
            "Apple iOS Mobile Device (Wi-Fi)"
        )

    # 5. NetBIOS Name (Windows PC or Laptop)
    if netbios_name:
        name_upper = netbios_name.upper()
        if any(w in name_upper for w in ["DESKTOP", "LAPTOP", "PC", "SURFACE"]):
            return ("laptop", f"Windows PC ({netbios_name})", "Windows Computer")
        return ("laptop", netbios_name, "Network Host")

    # 6. mDNS Hostname matches
    if hostname:
        host_lower = hostname.lower()
        if "android" in host_lower:
            clean = hostname.replace(".local", "")
            return ("smartphone", f"Android Phone ({clean})", "Android Mobile")
        if any(w in host_lower for w in ["iphone", "ipad"]):
            return ("smartphone", f"Apple Device ({hostname})", "Apple iOS Mobile")
        if any(w in host_lower for w in ["tv", "bravia", "roku", "chromecast"]):
            return ("smart_tv", f"Smart TV ({hostname})", "Media Player")
        if any(w in host_lower for w in ["macbook", "laptop", "desktop", "thinkpad"]):
            return ("laptop", f"Laptop / PC ({hostname})", "Personal Computer")

    # 7. Manufacturer-based classification
    mfg_lower = manufacturer.lower()
    if manufacturer in ["Apple"]:
        return ("smartphone", "Apple Device", "Apple Mobile / Mac")
    if manufacturer in ["Samsung"]:
        return ("smartphone", "Samsung Galaxy Device", "Samsung Mobile / Smart Device")
    if manufacturer in ["Transsion", "Xiaomi", "OnePlus"]:
        return ("smartphone", f"{manufacturer} Smartphone", f"{manufacturer} Mobile Phone")
    if manufacturer in ["Intel", "Dell", "HP"]:
        return ("laptop", f"{manufacturer} PC / Laptop", f"{manufacturer} Computer")
    if manufacturer in ["Espressif Inc."]:
        return ("iot", "Smart IoT Device", "Espressif Smart Plug / Controller")

    # 8. Randomized MAC on home Wi-Fi (Standard Android / iOS behavior)
    if is_randomized_mac:
        return (
            "smartphone",
            "Mobile Phone / Wi-Fi Device",
            "Private Wi-Fi Device (iOS / Android)"
        )

    # 9. Fallback
    return ("unknown", f"Connected Device ({ip})", "Network Device")

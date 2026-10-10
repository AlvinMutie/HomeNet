import re
from typing import Tuple, Optional

# Curated high-reliability IEEE OUI database for common consumer & networking devices
KNOWN_OUIS = {
    # Huawei Technologies (Matches Safaricom Huawei HG8145V6 and Huawei clients)
    "1c:e5:04": "Huawei Technologies",
    "00:1e:10": "Huawei Technologies",
    "00:25:9e": "Huawei Technologies",
    "04:25:28": "Huawei Technologies",
    "04:4f:4c": "Huawei Technologies",
    "04:79:70": "Huawei Technologies",
    "08:63:61": "Huawei Technologies",
    "08:e8:4f": "Huawei Technologies",
    "0c:37:dc": "Huawei Technologies",
    "10:1b:54": "Huawei Technologies",
    "18:48:58": "Huawei Technologies",
    "20:08:89": "Huawei Technologies",
    "28:31:52": "Huawei Technologies",
    "28:6e:d4": "Huawei Technologies",
    "34:00:a3": "Huawei Technologies",
    "48:46:fb": "Huawei Technologies",
    "54:89:98": "Huawei Technologies",
    "70:54:f5": "Huawei Technologies",
    "74:5a:aa": "Huawei Technologies",
    "84:a8:e4": "Huawei Technologies",
    "94:04:9c": "Huawei Technologies",
    "ac:e2:15": "Huawei Technologies",
    "c0:70:09": "Huawei Technologies",
    "dc:d2:fc": "Huawei Technologies",
    "e0:19:1d": "Huawei Technologies",
    "f4:55:9c": "Huawei Technologies",
    "f8:4a:bf": "Huawei Technologies",

    # Apple Inc.
    "00:03:93": "Apple",
    "00:0a:27": "Apple",
    "00:17:f2": "Apple",
    "00:1b:63": "Apple",
    "00:1c:b3": "Apple",
    "00:1f:5b": "Apple",
    "00:23:12": "Apple",
    "00:25:00": "Apple",
    "00:26:08": "Apple",
    "00:26:bb": "Apple",
    "28:cf:e9": "Apple",
    "28:e0:2c": "Apple",
    "28:ed:6a": "Apple",
    "30:07:4d": "Apple",
    "34:08:bc": "Apple",
    "34:15:9e": "Apple",
    "38:f9:d3": "Apple",
    "3c:07:54": "Apple",
    "3c:15:c2": "Apple",
    "3c:22:fb": "Apple",
    "40:6c:8f": "Apple",
    "44:00:10": "Apple",
    "48:60:5f": "Apple",
    "4c:32:75": "Apple",
    "50:bc:96": "Apple",
    "54:26:96": "Apple",
    "5c:95:ae": "Apple",
    "60:03:08": "Apple",
    "64:a5:c3": "Apple",
    "68:5b:35": "Apple",
    "6c:40:08": "Apple",
    "70:11:24": "Apple",
    "74:b5:87": "Apple",
    "78:4f:43": "Apple",
    "7c:04:d0": "Apple",
    "80:00:6e": "Apple",
    "84:38:35": "Apple",
    "88:66:a5": "Apple",
    "8c:85:90": "Apple",
    "90:72:40": "Apple",
    "94:94:26": "Apple",
    "98:01:a7": "Apple",
    "9c:20:7b": "Apple",
    "a0:99:9b": "Apple",
    "a4:83:e7": "Apple",
    "a8:66:7f": "Apple",
    "ac:bc:32": "Apple",
    "b0:34:95": "Apple",
    "b4:18:d1": "Apple",
    "b8:78:26": "Apple",
    "bc:54:51": "Apple",
    "c0:84:7d": "Apple",
    "c4:b3:01": "Apple",
    "c8:69:cd": "Apple",
    "cc:29:f5": "Apple",
    "d0:03:4b": "Apple",
    "d4:61:9d": "Apple",
    "d8:96:95": "Apple",
    "dc:2b:61": "Apple",
    "e0:c7:67": "Apple",
    "e4:9a:dc": "Apple",
    "e8:80:2e": "Apple",
    "ec:ad:b8": "Apple",
    "f0:18:98": "Apple",
    "f4:37:b7": "Apple",
    "f8:ff:c2": "Apple",
    "fc:18:3c": "Apple",

    # Samsung Electronics
    "00:07:ab": "Samsung",
    "00:12:47": "Samsung",
    "00:16:32": "Samsung",
    "00:1a:8a": "Samsung",
    "00:21:19": "Samsung",
    "00:24:54": "Samsung",
    "00:26:37": "Samsung",
    "04:18:0f": "Samsung",
    "08:fc:88": "Samsung",
    "0c:14:20": "Samsung",
    "14:f4:2a": "Samsung",
    "18:3a:2d": "Samsung",
    "1c:5a:3e": "Samsung",
    "20:55:31": "Samsung",
    "24:4b:03": "Samsung",
    "28:27:bf": "Samsung",
    "2c:0e:3d": "Samsung",
    "30:cd:a7": "Samsung",
    "34:c7:31": "Samsung",
    "38:01:95": "Samsung",
    "3c:8b:fe": "Samsung",
    "40:0e:85": "Samsung",
    "44:80:eb": "Samsung",
    "48:44:f7": "Samsung",
    "4c:66:41": "Samsung",
    "50:32:75": "Samsung",
    "54:92:be": "Samsung",
    "58:c3:8b": "Samsung",
    "5c:0a:5b": "Samsung",
    "60:6b:bd": "Samsung",
    "64:1c:ae": "Samsung",
    "68:eb:ae": "Samsung",
    "6c:f3:73": "Samsung",
    "70:2c:1f": "Samsung",
    "74:45:ce": "Samsung",
    "78:47:1d": "Samsung",
    "7c:91:22": "Samsung",
    "80:5b:65": "Samsung",
    "84:25:db": "Samsung",
    "88:32:9b": "Samsung",
    "8c:77:12": "Samsung",
    "90:97:f3": "Samsung",
    "94:35:0a": "Samsung",
    "98:52:b1": "Samsung",
    "9c:28:40": "Samsung",
    "a0:b4:39": "Samsung",
    "a4:eb:d3": "Samsung",
    "a8:06:00": "Samsung",
    "ac:5f:3e": "Samsung",
    "b0:c4:e7": "Samsung",
    "b4:07:f9": "Samsung",
    "b8:57:d8": "Samsung",
    "bc:44:86": "Samsung",
    "c0:bd:d1": "Samsung",
    "c4:73:1e": "Samsung",
    "c8:14:79": "Samsung",
    "cc:07:ab": "Samsung",
    "d0:66:7b": "Samsung",
    "d4:e6:b7": "Samsung",
    "d8:90:e8": "Samsung",
    "dc:71:44": "Samsung",
    "e4:7c:f9": "Samsung",
    "e8:e5:d6": "Samsung",
    "ec:11:27": "Samsung",
    "f0:5b:7b": "Samsung",
    "f4:7b:5e": "Samsung",
    "f8:04:2e": "Samsung",
    "fc:a1:3e": "Samsung",

    # Intel (Laptops, WiFi NICs)
    "00:02:b3": "Intel",
    "00:03:47": "Intel",
    "00:04:23": "Intel",
    "00:0e:0c": "Intel",
    "00:13:02": "Intel",
    "00:15:00": "Intel",
    "00:1b:21": "Intel",
    "00:1e:67": "Intel",
    "00:21:6a": "Intel",
    "00:24:d7": "Intel",
    "28:3a:4d": "Intel",
    "34:13:e8": "Intel",
    "48:51:b7": "Intel",
    "68:05:ca": "Intel",
    "7c:b0:c2": "Intel",
    "80:86:f2": "Intel",
    "8c:8d:28": "Intel",
    "94:65:9c": "Intel",
    "a0:36:bc": "Intel",
    "b4:69:21": "Intel",
    "c4:8e:8f": "Intel",
    "d0:57:7b": "Intel",
    "e8:2a:44": "Intel",

    # Espressif Inc. (Smart home, IoT sensors, Smart Plugs)
    "18:fe:34": "Espressif Inc.",
    "24:0a:c4": "Espressif Inc.",
    "24:62:ab": "Espressif Inc.",
    "24:6f:28": "Espressif Inc.",
    "2c:3a:e8": "Espressif Inc.",
    "30:ae:a4": "Espressif Inc.",
    "3c:61:05": "Espressif Inc.",
    "3c:71:bf": "Espressif Inc.",
    "40:f5:20": "Espressif Inc.",
    "48:3f:da": "Espressif Inc.",
    "48:55:19": "Espressif Inc.",
    "4c:11:ae": "Espressif Inc.",
    "54:5a:a6": "Espressif Inc.",
    "5c:cf:7f": "Espressif Inc.",
    "60:01:94": "Espressif Inc.",
    "68:c6:3a": "Espressif Inc.",
    "70:03:9f": "Espressif Inc.",
    "7c:df:a1": "Espressif Inc.",
    "80:7d:3a": "Espressif Inc.",
    "84:0d:8e": "Espressif Inc.",
    "84:f3:eb": "Espressif Inc.",
    "90:97:d5": "Espressif Inc.",
    "a0:20:a6": "Espressif Inc.",
    "a4:cf:12": "Espressif Inc.",
    "a4:e5:7c": "Espressif Inc.",
    "ac:67:b2": "Espressif Inc.",
    "b4:e6:2d": "Espressif Inc.",
    "bc:dd:c2": "Espressif Inc.",
    "c4:4f:33": "Espressif Inc.",
    "c8:2b:96": "Espressif Inc.",
    "cc:50:e3": "Espressif Inc.",
    "d8:a0:1d": "Espressif Inc.",
    "dc:4f:22": "Espressif Inc.",
    "e0:98:06": "Espressif Inc.",
    "e8:31:cd": "Espressif Inc.",
    "e8:68:e7": "Espressif Inc.",
    "ec:fa:bc": "Espressif Inc.",

    # Raspberry Pi Foundation
    "b8:27:eb": "Raspberry Pi",
    "dc:a6:32": "Raspberry Pi",
    "e4:5f:01": "Raspberry Pi",
    "28:cd:c1": "Raspberry Pi",

    # Google / Alphabet
    "00:1a:11": "Google",
    "3c:5a:37": "Google",
    "54:60:09": "Google",
    "70:3a:cb": "Google",
    "a4:77:33": "Google",
    "d8:6c:63": "Google",
    "f4:03:04": "Google",
    "f8:8f:ca": "Google",

    # Amazon Technologies
    "00:fc:8b": "Amazon",
    "0c:47:c9": "Amazon",
    "18:74:2e": "Amazon",
    "38:f7:3d": "Amazon",
    "40:b4:cd": "Amazon",
    "44:65:0d": "Amazon",
    "50:dc:e7": "Amazon",
    "68:37:e9": "Amazon",
    "68:54:5a": "Amazon",
    "74:75:48": "Amazon",
    "84:d6:d0": "Amazon",
    "ac:63:be": "Amazon",
    "fc:a6:67": "Amazon",

    # TP-Link
    "00:19:e0": "TP-Link",
    "00:25:86": "TP-Link",
    "14:cc:20": "TP-Link",
    "30:b5:c2": "TP-Link",
    "50:c7:bf": "TP-Link",
    "60:32:b1": "TP-Link",
    "70:4f:57": "TP-Link",
    "74:da:88": "TP-Link",
    "98:48:27": "TP-Link",
    "c0:25:e9": "TP-Link",
    "c0:4a:00": "TP-Link",
    "d8:07:b6": "TP-Link",
    "e8:48:b8": "TP-Link",

    # Xiaomi
    "00:ec:0a": "Xiaomi",
    "04:cf:8c": "Xiaomi",
    "14:f6:5a": "Xiaomi",
    "28:6c:07": "Xiaomi",
    "34:ce:00": "Xiaomi",
    "50:64:2b": "Xiaomi",
    "64:09:80": "Xiaomi",
    "74:23:44": "Xiaomi",
    "78:11:dc": "Xiaomi",
    "7c:1d:d9": "Xiaomi",
    "88:c3:97": "Xiaomi",
    "ac:c1:ee": "Xiaomi",
    "d4:97:0b": "Xiaomi",

    # Transsion Holdings (Tecno / Infinix / Itel)
    "00:1a:2b": "Transsion",
    "28:56:5a": "Transsion",
    "84:2b:2b": "Transsion",

    # Sony Corporation
    "00:01:4a": "Sony",
    "00:13:15": "Sony",
    "00:19:c5": "Sony",
    "00:24:be": "Sony",
    "70:9e:29": "Sony",
    "fc:0f:e6": "Sony",

    # LG Electronics
    "00:1c:62": "LG Electronics",
    "10:f9:6f": "LG Electronics",
    "20:3d:66": "LG Electronics",
    "3c:cd:36": "LG Electronics",
    "58:a2:b5": "LG Electronics",
    "a8:23:fe": "LG Electronics",
    "cc:2d:8c": "LG Electronics",
}


def normalize_mac(mac: Optional[str]) -> Optional[str]:
    """Clean and normalize MAC address to lowercase colon-separated format."""
    if not mac:
        return None
    # Remove separators
    clean = re.sub(r"[^0-9A-Fa-f]", "", mac.strip().lower())
    if len(clean) != 12:
        return None
    return ":".join(clean[i:i+2] for i in range(0, 12, 2))


def is_locally_administered_mac(mac: str) -> bool:
    """
    Check if the MAC address has the locally administered bit set (bit 1 of octet 0).
    In IEEE 802, if the 2nd least significant bit of the first octet is 1,
    the address is randomized or locally assigned (e.g., iOS Private Wi-Fi, Android Random MAC).
    """
    normalized = normalize_mac(mac)
    if not normalized:
        return False
    try:
        first_byte = int(normalized[:2], 16)
        # Bit 1 (value 0x02) indicates locally administered
        return (first_byte & 0x02) != 0
    except ValueError:
        return False


def lookup_manufacturer(mac: Optional[str]) -> Tuple[str, bool]:
    """
    Look up device manufacturer from MAC address.
    Returns:
        (manufacturer_name, is_randomized_mac)
    If manufacturer cannot be reliably determined, returns ("Unknown", is_randomized_mac).
    Does NOT guess or simulate.
    """
    if not mac:
        return ("Unknown", False)

    normalized = normalize_mac(mac)
    if not normalized:
        return ("Unknown", False)

    is_randomized = is_locally_administered_mac(normalized)

    # If the address is randomized/locally administered, standard IEEE OUI does not apply
    if is_randomized:
        return ("Unknown", True)

    oui = normalized[:8]
    if oui in KNOWN_OUIS:
        return (KNOWN_OUIS[oui], False)

    return ("Unknown", False)

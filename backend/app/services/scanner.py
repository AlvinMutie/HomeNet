import asyncio
import ipaddress
import logging
import re
import socket
import subprocess
import time
import uuid
from typing import Dict, List, Optional, Any
from pathlib import Path

from backend.app.config import settings
from backend.app.services.oui_lookup import lookup_manufacturer, normalize_mac
from backend.app.database import (
    upsert_scanned_device,
    mark_devices_inactive_except,
    save_scan_history,
)

logger = logging.getLogger("homenet.scanner")


def parse_proc_net_arp() -> Dict[str, Dict[str, str]]:
    """
    Parse Linux /proc/net/arp table.
    Returns mapping of ip -> {"mac": str, "device": str, "flags": str}
    """
    results: Dict[str, Dict[str, str]] = {}
    arp_file = Path("/proc/net/arp")
    if not arp_file.exists():
        return results

    try:
        with open(arp_file, "r") as f:
            lines = f.readlines()
        for line in lines[1:]:
            parts = line.split()
            if len(parts) >= 6:
                ip = parts[0]
                flags = parts[2]
                hw_addr = parts[3]
                dev = parts[5]
                if flags != "0x0" and hw_addr != "00:00:00:00:00:00":
                    normalized = normalize_mac(hw_addr)
                    if normalized:
                        results[ip] = {
                            "mac": normalized,
                            "device": dev,
                            "flags": flags,
                        }
    except Exception as e:
        logger.warning(f"Failed to read /proc/net/arp: {e}")
    return results


def parse_ip_neigh() -> Dict[str, Dict[str, str]]:
    """
    Parse Linux `ip neigh` output.
    Returns mapping of ip -> {"mac": str, "device": str, "state": str}
    """
    results: Dict[str, Dict[str, str]] = {}
    try:
        res = subprocess.run(
            ["ip", "neigh"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False
        )
        if res.returncode == 0:
            for line in res.stdout.splitlines():
                parts = line.split()
                if len(parts) >= 4 and "lladdr" in parts:
                    ip = parts[0]
                    ll_idx = parts.index("lladdr")
                    if ll_idx + 1 < len(parts):
                        mac = parts[ll_idx + 1]
                        normalized = normalize_mac(mac)
                        dev = parts[parts.index("dev") + 1] if "dev" in parts else None
                        state = parts[-1]
                        if normalized and state != "FAILED":
                            results[ip] = {
                                "mac": normalized,
                                "device": dev or "",
                                "state": state,
                            }
    except Exception as e:
        logger.warning(f"Failed to run ip neigh: {e}")
    return results


def get_local_interface_info(interface: str) -> Dict[str, Optional[str]]:
    """Get local IP and MAC address of the host machine on the given interface."""
    info: Dict[str, Optional[str]] = {"ip": None, "mac": None}
    try:
        # MAC
        mac_file = Path(f"/sys/class/net/{interface}/address")
        if mac_file.exists():
            info["mac"] = normalize_mac(mac_file.read_text().strip())

        # IP
        res = subprocess.run(
            ["ip", "-4", "addr", "show", interface],
            capture_output=True,
            text=True,
            timeout=2,
            check=False
        )
        if res.returncode == 0:
            match = re.search(r"inet\s+([0-9\.]+)/\d+", res.stdout)
            if match:
                info["ip"] = match.group(1)
    except Exception as e:
        logger.debug(f"Could not retrieve local interface info: {e}")
    return info


async def ping_single_host(
    ip: str,
    semaphore: asyncio.Semaphore,
    timeout_sec: float = 1.0
) -> Optional[Dict[str, Any]]:
    """
    Ping a single host with strict 1s deadline.
    Returns dict with latency_ms and ttl if responding, else None.
    """
    async with semaphore:
        try:
            # -c 1 (1 count), -w 1 (deadline 1 sec), -W 1 (wait 1 sec)
            proc = await asyncio.create_subprocess_exec(
                "ping", "-c", "1", "-w", "1", "-W", "1", ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout_sec + 0.5)
            if proc.returncode == 0:
                out = stdout.decode("utf-8", errors="ignore")
                latency = None
                ttl = None
                match = re.search(r"time=([\d\.]+)\s*ms", out)
                if match:
                    latency = float(match.group(1))
                else:
                    avg_match = re.search(r"rtt [^=]+=\s*[\d\.]+/([\d\.]+)/", out)
                    if avg_match:
                        latency = float(avg_match.group(1))
                # Extract TTL for OS fingerprinting
                ttl_match = re.search(r"ttl=([\d]+)", out, re.IGNORECASE)
                if ttl_match:
                    ttl = int(ttl_match.group(1))
                return {"ip": ip, "latency_ms": latency, "ttl": ttl}
        except (asyncio.TimeoutError, Exception):
            pass
    return None


async def resolve_hostname_fast(ip: str) -> Optional[str]:
    """Resolve reverse DNS with strict timeout to avoid blocking."""
    try:
        def _get_host():
            return socket.gethostbyaddr(ip)[0]
        host = await asyncio.wait_for(asyncio.to_thread(_get_host), timeout=0.2)
        if host and host != ip:
            return host
    except Exception:
        pass
    return None


class NetworkScanner:
    """Safe local network discovery engine for Kali Linux and home subnets."""

    def __init__(self, subnet: Optional[str] = None, interface: Optional[str] = None):
        self.subnet = subnet or settings.network_subnet
        self.interface = interface or settings.network_interface
        self._validate_subnet()

    def _validate_subnet(self):
        try:
            net = ipaddress.ip_network(self.subnet, strict=False)
            if not net.is_private:
                raise ValueError(f"Scan target {self.subnet} is not a private IP subnet! Prohibited for security.")
            if net.num_addresses > 1024:
                raise ValueError(f"Subnet {self.subnet} is too large (> 1024 hosts). Home networks typically use /24.")
            self.network = net
        except Exception as e:
            logger.error(f"Invalid subnet {self.subnet}: {e}")
            raise

    async def scan(self) -> Dict[str, Any]:
        """
        Execute safe local network discovery:
        1. Fast concurrent ICMP sweep to populate Linux kernel ARP table.
        2. Read kernel ARP cache (/proc/net/arp + ip neigh).
        3. Merge local machine and gateway records.
        4. Match MAC against IEEE OUI table and identify randomized MACs.
        5. Persist to SQLite, preserving user names and trust labels.
        """
        start_time = time.time()
        logger.info(f"Starting discovery on {self.subnet} via {self.interface}...")

        semaphore = asyncio.Semaphore(settings.max_scan_workers)
        host_ips = [str(ip) for ip in self.network.hosts()]

        # Perform asynchronous ICMP echo probes
        ping_tasks = [
            ping_single_host(ip, semaphore, timeout_sec=settings.scan_timeout_seconds)
            for ip in host_ips
        ]
        ping_results = await asyncio.gather(*ping_tasks)

        # Map responding IPs to latency and TTL
        responding_ips: Dict[str, float] = {}
        ip_to_ttl: Dict[str, Optional[int]] = {}
        for res in ping_results:
            if res:
                responding_ips[res["ip"]] = res.get("latency_ms")
                if res.get("ttl") is not None:
                    ip_to_ttl[res["ip"]] = res["ttl"]

        # Read updated ARP tables after network probes
        proc_arp = parse_proc_net_arp()
        neigh_arp = parse_ip_neigh()

        # Combine ARP findings
        all_arp_entries: Dict[str, Dict[str, str]] = {}
        for ip, data in proc_arp.items():
            all_arp_entries[ip] = data
        for ip, data in neigh_arp.items():
            if ip in all_arp_entries:
                if not all_arp_entries[ip].get("mac") and data.get("mac"):
                    all_arp_entries[ip]["mac"] = data["mac"]
            else:
                all_arp_entries[ip] = data

        # Add local machine info
        local_host = get_local_interface_info(self.interface)
        if local_host.get("ip") and local_host["ip"] in host_ips:
            local_ip = local_host["ip"]
            responding_ips[local_ip] = 0.05
            if local_host.get("mac"):
                all_arp_entries[local_ip] = {
                    "mac": local_host["mac"],
                    "device": self.interface,
                    "state": "LOCAL",
                }

        # Discover devices: all hosts that responded to ping OR have a REACHABLE entry in ARP
        discovered_devices: List[Dict[str, Any]] = []
        active_db_ids: List[str] = []

        all_target_ips = set(responding_ips.keys()).union(
            [ip for ip, data in all_arp_entries.items() if ip in host_ips]
        )

        # Resolve hostnames concurrently for all target IPs
        target_ip_list = sorted(all_target_ips, key=lambda x: [int(p) for p in x.split(".")])
        host_tasks = [resolve_hostname_fast(ip) for ip in target_ip_list]
        hostnames = await asyncio.gather(*host_tasks)
        ip_to_host = dict(zip(target_ip_list, hostnames))

        # Run multi-protocol LAN fingerprinting concurrently
        # (SSDP, mDNS, Apple lockdown, NetBIOS, HTTP banners, SSH banners)
        from backend.app.services.fingerprint import (
            discover_ssdp_metadata,
            discover_mdns_hostnames,
            check_apple_device,
            check_netbios_name,
            grab_http_banners_bulk,
            grab_ssh_banner,
            classify_device,
        )

        ssdp_task = discover_ssdp_metadata()
        mdns_task = discover_mdns_hostnames(target_ip_list)
        apple_tasks = [check_apple_device(ip) for ip in target_ip_list]
        netbios_tasks = [check_netbios_name(ip) for ip in target_ip_list]
        http_task = grab_http_banners_bulk(target_ip_list)
        ssh_tasks = [grab_ssh_banner(ip) for ip in target_ip_list]

        ssdp_map, mdns_map, apple_res, netbios_res, http_banners, ssh_res = await asyncio.gather(
            ssdp_task,
            mdns_task,
            asyncio.gather(*apple_tasks),
            asyncio.gather(*netbios_tasks),
            http_task,
            asyncio.gather(*ssh_tasks),
        )
        apple_map = dict(zip(target_ip_list, apple_res))
        netbios_map = dict(zip(target_ip_list, netbios_res))
        ssh_map = dict(zip(target_ip_list, ssh_res))

        for ip in target_ip_list:
            arp_data = all_arp_entries.get(ip, {})
            mac = arp_data.get("mac")
            dev_interface = arp_data.get("device") or self.interface
            latency = responding_ips.get(ip)

            # Look up manufacturer from MAC
            manufacturer, is_randomized = lookup_manufacturer(mac)
            mdns_host = mdns_map.get(ip) or ip_to_host.get(ip)
            ssdp_info = ssdp_map.get(ip)
            is_apple = apple_map.get(ip, False)
            netbios = netbios_map.get(ip)
            http_banner = http_banners.get(ip)
            ssh_banner = ssh_map.get(ip)
            ttl = ip_to_ttl.get(ip)

            # Generate stable deterministic ID based on MAC if available, else IP
            if mac:
                stable_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"homenet-mac-{mac}"))
            else:
                stable_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"homenet-ip-{ip}"))

            active_db_ids.append(stable_id)

            # Multi-engine device classification
            category, inferred_name, model_name = classify_device(
                ip=ip,
                mac=mac,
                manufacturer=manufacturer,
                hostname=mdns_host,
                ssdp_info=ssdp_info,
                is_apple_port=is_apple,
                netbios_name=netbios,
                is_randomized_mac=is_randomized,
                is_gateway=(ip == settings.router_ip),
                is_localhost=(local_host.get("ip") == ip),
                http_banner=http_banner,
                ssh_banner=ssh_banner,
                ttl=ttl,
            )

            # Use SSDP manufacturer if MAC manufacturer is unknown
            effective_mfg = manufacturer
            if effective_mfg == "Unknown" and ssdp_info and ssdp_info.get("manufacturer"):
                effective_mfg = ssdp_info["manufacturer"]
            elif effective_mfg == "Unknown" and is_apple:
                effective_mfg = "Apple"

            saved = upsert_scanned_device(
                device_id=stable_id,
                ip_address=ip,
                mac_address=mac,
                hostname=mdns_host,
                manufacturer=effective_mfg,
                latency_ms=latency,
                is_randomized_mac=is_randomized,
                interface=dev_interface,
                device_type=category,
                model_name=model_name,
                inferred_name=inferred_name,
            )

            discovered_devices.append(saved)

        # Mark devices in DB that did not respond in this scan as offline
        mark_devices_inactive_except(active_db_ids)

        duration = round(time.time() - start_time, 2)
        save_scan_history(
            devices_found=len(discovered_devices),
            duration_seconds=duration,
            subnet=str(self.subnet),
            interface=self.interface,
            method="icmp_arp"
        )

        logger.info(
            f"Discovery finished in {duration}s. Found {len(discovered_devices)} active devices."
        )

        return {
            "subnet": str(self.subnet),
            "interface": self.interface,
            "duration_seconds": duration,
            "devices_found": len(discovered_devices),
            "devices": discovered_devices,
        }

import sqlite3
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
from backend.app.config import settings

logger = logging.getLogger("homenet.database")


_db_initialized = False

def get_connection() -> sqlite3.Connection:
    global _db_initialized
    db_path = settings.resolved_db_path
    conn = sqlite3.connect(str(db_path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for concurrent reads and writes
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    if not _db_initialized:
        _db_initialized = True
        init_db()
    return conn


def init_db():
    conn = get_connection()
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS devices (
                    id TEXT PRIMARY KEY,
                    mac_address TEXT UNIQUE,
                    ip_address TEXT NOT NULL,
                    custom_name TEXT,
                    hostname TEXT,
                    manufacturer TEXT DEFAULT 'Unknown',
                    device_type TEXT DEFAULT 'unknown',
                    model_name TEXT,
                    is_trusted INTEGER DEFAULT 2, -- 0: untrusted/needs review, 1: trusted, 2: unassigned
                    is_active INTEGER DEFAULT 1,  -- 0: offline/previously seen, 1: responding now
                    latency_ms REAL,
                    is_randomized_mac INTEGER DEFAULT 0,
                    interface TEXT,
                    notes TEXT,
                    first_seen TEXT NOT NULL,
                    last_seen TEXT NOT NULL
                )
            """)

            # Ensure columns exist in case of older SQLite file
            for col in ["device_type", "model_name"]:
                try:
                    conn.execute(f"ALTER TABLE devices ADD COLUMN {col} TEXT")
                except sqlite3.OperationalError:
                    pass

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac_address);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip_address);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS scan_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_time TEXT NOT NULL,
                    devices_found INTEGER NOT NULL,
                    duration_seconds REAL NOT NULL,
                    subnet TEXT NOT NULL,
                    interface TEXT,
                    method TEXT NOT NULL
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
        logger.info(f"Database initialized at {settings.resolved_db_path}")
    finally:
        conn.close()


def upsert_scanned_device(
    device_id: str,
    ip_address: str,
    mac_address: Optional[str],
    hostname: Optional[str],
    manufacturer: str,
    latency_ms: Optional[float],
    is_randomized_mac: bool,
    interface: Optional[str] = None,
    device_type: str = "unknown",
    model_name: Optional[str] = None,
    inferred_name: Optional[str] = None
) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        with conn:
            existing = None
            if mac_address:
                existing = conn.execute(
                    "SELECT * FROM devices WHERE mac_address = ?", (mac_address.lower(),)
                ).fetchone()

            if not existing and ip_address:
                existing = conn.execute(
                    "SELECT * FROM devices WHERE ip_address = ?", (ip_address,)
                ).fetchone()

            if existing:
                # Update existing record, keeping user-assigned custom_name, is_trusted, notes
                current_mfg = existing["manufacturer"]
                new_mfg = manufacturer if (manufacturer != "Unknown" or current_mfg == "Unknown") else current_mfg
                
                # If custom_name is not set, use newly inferred friendly name
                effective_name = existing["custom_name"] or inferred_name

                conn.execute("""
                    UPDATE devices SET
                        ip_address = ?,
                        mac_address = COALESCE(?, mac_address),
                        custom_name = ?,
                        hostname = COALESCE(?, hostname),
                        manufacturer = ?,
                        device_type = COALESCE(?, device_type),
                        model_name = COALESCE(?, model_name),
                        is_active = 1,
                        latency_ms = ?,
                        is_randomized_mac = ?,
                        interface = COALESCE(?, interface),
                        last_seen = ?
                    WHERE id = ?
                """, (
                    ip_address,
                    mac_address.lower() if mac_address else None,
                    effective_name,
                    hostname or existing["hostname"],
                    new_mfg,
                    device_type if device_type != "unknown" else existing["device_type"],
                    model_name or existing["model_name"],
                    latency_ms,
                    1 if is_randomized_mac else 0,
                    interface or existing["interface"],
                    now_iso,
                    existing["id"]
                ))
                updated = conn.execute("SELECT * FROM devices WHERE id = ?", (existing["id"],)).fetchone()
                return dict(updated)
            else:
                # Insert brand new device
                default_name = inferred_name
                is_trusted = 2 # unassigned/review
                if ip_address == settings.router_ip:
                    default_name = "Huawei HG8145V6 (Safaricom Gateway)"
                    is_trusted = 1

                conn.execute("""
                    INSERT INTO devices (
                        id, mac_address, ip_address, custom_name, hostname,
                        manufacturer, device_type, model_name, is_trusted, is_active, latency_ms,
                        is_randomized_mac, interface, notes, first_seen, last_seen
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
                """, (
                    device_id,
                    mac_address.lower() if mac_address else None,
                    ip_address,
                    default_name,
                    hostname,
                    manufacturer,
                    device_type,
                    model_name,
                    is_trusted,
                    latency_ms,
                    1 if is_randomized_mac else 0,
                    interface,
                    None,
                    now_iso,
                    now_iso
                ))
                created = conn.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
                return dict(created)
    finally:
        conn.close()


def mark_devices_inactive_except(active_ids: List[str]):
    conn = get_connection()
    try:
        with conn:
            if not active_ids:
                conn.execute("UPDATE devices SET is_active = 0, latency_ms = NULL")
            else:
                placeholders = ",".join(["?"] * len(active_ids))
                conn.execute(
                    f"UPDATE devices SET is_active = 0, latency_ms = NULL WHERE id NOT IN ({placeholders})",
                    active_ids
                )
    finally:
        conn.close()


def get_all_devices(
    search: Optional[str] = None,
    filter_status: Optional[str] = None,
    sort_by: str = "ip",
    sort_order: str = "asc"
) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        query = "SELECT * FROM devices WHERE 1=1"
        params: List[Any] = []

        if search:
            term = f"%{search.strip().lower()}%"
            query += " AND (LOWER(ip_address) LIKE ? OR LOWER(COALESCE(mac_address, '')) LIKE ? OR LOWER(COALESCE(custom_name, '')) LIKE ? OR LOWER(COALESCE(hostname, '')) LIKE ? OR LOWER(manufacturer) LIKE ?)"
            params.extend([term, term, term, term, term])

        if filter_status:
            status = filter_status.lower()
            if status == "responding":
                query += " AND is_active = 1"
            elif status == "offline":
                query += " AND is_active = 0"
            elif status == "trusted":
                query += " AND is_trusted = 1"
            elif status == "untrusted":
                query += " AND is_trusted = 0"
            elif status == "review":
                query += " AND is_trusted = 2"

        rows = conn.execute(query, params).fetchall()
        result = [dict(r) for r in rows]

        # Sorting: numeric IP sorting for proper natural ordering
        reverse = (sort_order.lower() == "desc")

        if sort_by == "ip":
            def ip_sort_key(d):
                try:
                    parts = [int(p) for p in d["ip_address"].split(".")]
                    return tuple(parts)
                except Exception:
                    return (999, 999, 999, 999)
            result.sort(key=ip_sort_key, reverse=reverse)
        elif sort_by == "name":
            result.sort(key=lambda d: (d.get("custom_name") or d.get("hostname") or d["ip_address"]).lower(), reverse=reverse)
        elif sort_by == "last_seen":
            result.sort(key=lambda d: d.get("last_seen") or "", reverse=reverse)
        elif sort_by == "latency":
            result.sort(key=lambda d: d.get("latency_ms") if d.get("latency_ms") is not None else 999999, reverse=reverse)
        elif sort_by == "trust":
            result.sort(key=lambda d: d.get("is_trusted", 2), reverse=reverse)

        return result
    finally:
        conn.close()


def get_device_by_id(device_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_device_metadata(
    device_id: str,
    custom_name: Optional[str] = None,
    is_trusted: Optional[int] = None,
    notes: Optional[str] = None,
    device_type: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn:
            existing = conn.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
            if not existing:
                return None

            updates = []
            params = []
            if custom_name is not None:
                updates.append("custom_name = ?")
                params.append(custom_name.strip() if custom_name.strip() else None)
            if is_trusted is not None:
                updates.append("is_trusted = ?")
                params.append(is_trusted)
            if notes is not None:
                updates.append("notes = ?")
                params.append(notes.strip() if notes.strip() else None)
            if device_type is not None:
                updates.append("device_type = ?")
                params.append(device_type.strip() if device_type.strip() else "unknown")

            if updates:
                params.append(device_id)
                conn.execute(f"UPDATE devices SET {', '.join(updates)} WHERE id = ?", params)

            row = conn.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def save_scan_history(
    devices_found: int,
    duration_seconds: float,
    subnet: str,
    interface: Optional[str],
    method: str
):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        with conn:
            conn.execute("""
                INSERT INTO scan_history (scan_time, devices_found, duration_seconds, subnet, interface, method)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (now_iso, devices_found, duration_seconds, subnet, interface, method))
    finally:
        conn.close()


def get_last_scan_record() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM scan_history ORDER BY id DESC LIMIT 1").fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_system_stats() -> Dict[str, Any]:
    conn = get_connection()
    try:
        total = conn.execute("SELECT COUNT(*) FROM devices").fetchone()[0]
        responding = conn.execute("SELECT COUNT(*) FROM devices WHERE is_active = 1").fetchone()[0]
        offline = total - responding
        trusted = conn.execute("SELECT COUNT(*) FROM devices WHERE is_trusted = 1").fetchone()[0]
        untrusted = conn.execute("SELECT COUNT(*) FROM devices WHERE is_trusted = 0").fetchone()[0]
        review = conn.execute("SELECT COUNT(*) FROM devices WHERE is_trusted = 2").fetchone()[0]

        # Manufacturer breakdown
        mfg_rows = conn.execute("""
            SELECT manufacturer, COUNT(*) as count
            FROM devices
            GROUP BY manufacturer
            ORDER BY count DESC
        """).fetchall()
        manufacturers = [{"name": r["manufacturer"], "count": r["count"]} for r in mfg_rows]

        last_scan = get_last_scan_record()

        return {
            "total_devices": total,
            "responding_devices": responding,
            "offline_devices": offline,
            "trusted_devices": trusted,
            "untrusted_devices": untrusted,
            "review_devices": review,
            "manufacturers": manufacturers,
            "last_scan": last_scan,
        }
    finally:
        conn.close()

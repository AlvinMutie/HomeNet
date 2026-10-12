import asyncio
import logging
from typing import Optional
from backend.app.services.scanner import NetworkScanner, scan_lock

logger = logging.getLogger("homenet.heartbeat")

# Heartbeat interval in seconds
HEARTBEAT_INTERVAL_SECONDS = 45

_heartbeat_task: Optional[asyncio.Task] = None
_stop_event = asyncio.Event()


async def heartbeat_worker():
    """
    Continuous background worker that periodically runs network discovery.
    Ensures that device active/offline states remain real-time and accurate
    without requiring the user to manually click 'Scan Subnet'.
    """
    logger.info(f"Background network heartbeat started (interval={HEARTBEAT_INTERVAL_SECONDS}s).")
    
    # Initial delay so FastAPI startup completes first
    await asyncio.sleep(2)

    while not _stop_event.is_set():
        try:
            # Only run if not already scanning
            if not scan_lock.locked():
                async with scan_lock:
                    logger.debug("Running scheduled background subnet scan...")
                    scanner = NetworkScanner()
                    result = await scanner.scan()
                    logger.info(
                        f"Heartbeat scan complete: {result.get('devices_found', 0)} active device(s) verified."
                    )
            else:
                logger.debug("Scan already in progress, skipping heartbeat iteration.")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Error during background heartbeat scan: {e}")

        try:
            # Wait for interval or until stopped
            await asyncio.wait_for(_stop_event.wait(), timeout=HEARTBEAT_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            pass


def start_heartbeat():
    global _heartbeat_task, _stop_event
    _stop_event.clear()
    if _heartbeat_task is None or _heartbeat_task.done():
        _heartbeat_task = asyncio.create_task(heartbeat_worker())


def stop_heartbeat():
    global _heartbeat_task, _stop_event
    _stop_event.set()
    if _heartbeat_task and not _heartbeat_task.done():
        _heartbeat_task.cancel()

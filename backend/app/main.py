from contextlib import asynccontextmanager
import logging
import subprocess
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.api import health, devices, router as router_api, stats

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("homenet.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing HomeNet database...")
    init_db()
    logger.info("HomeNet Manager API initialized.")
    from backend.app.services.heartbeat import start_heartbeat, stop_heartbeat
    start_heartbeat()
    yield
    stop_heartbeat()
    logger.info("HomeNet Manager API shutdown.")


app = FastAPI(
    title="HomeNet Manager API",
    description="Safaricom Fibre Router Dashboard & Local Network Monitor (Huawei HG8145V6)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration restricted to local development frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(health.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(router_api.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.get("/api/network/interfaces", tags=["Network"])
async def get_network_interfaces():
    """Detect available local network interfaces and active configuration."""
    interfaces = []
    try:
        proc = subprocess.run(["ip", "-j", "addr"], capture_output=True, text=True, timeout=3)
        if proc.returncode == 0:
            import json
            interfaces = json.loads(proc.stdout)
    except Exception as e:
        logger.warning(f"Could not fetch JSON network interfaces: {e}")

    return {
        "configured_interface": settings.network_interface,
        "configured_subnet": settings.network_subnet,
        "router_ip": settings.router_ip,
        "interfaces": interfaces,
    }

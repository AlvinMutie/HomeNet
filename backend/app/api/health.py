from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "HomeNet Manager API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

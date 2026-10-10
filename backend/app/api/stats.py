from fastapi import APIRouter
from backend.app.database import get_system_stats
from backend.app.services.router_service import router_service

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("")
async def get_dashboard_stats():
    """
    Get consolidated dashboard metrics:
    - Device discovery and active response numbers
    - Trust classification counts
    - Manufacturer distribution
    - Last-scanned timestamp
    - Router reachability and verified internet status
    """
    stats = get_system_stats()

    # Get quick router reachability and internet status
    try:
        router_status = await router_service.check_reachability()
        internet_status = await router_service.test_internet_connectivity()
    except Exception:
        router_status = {"reachable": False}
        internet_status = {"internet_online": False}

    stats["router_status"] = router_status
    stats["internet_status"] = internet_status

    return stats

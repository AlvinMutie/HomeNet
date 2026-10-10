import os
import pytest
from starlette.testclient import TestClient

# Use an in-memory or temporary test SQLite DB
os.environ["DATABASE_PATH"] = "data/test_homenet.db"
os.environ["NETWORK_SUBNET"] = "192.168.100.0/24"
os.environ["ROUTER_IP"] = "192.168.100.1"

from backend.app.config import settings
from backend.app.database import init_db, get_connection
from backend.app.main import app


@pytest.fixture(autouse=True)
def setup_test_db():
    # Ensure test DB is clean
    init_db()
    conn = get_connection()
    with conn:
        conn.execute("DELETE FROM devices")
        conn.execute("DELETE FROM scan_history")
    conn.close()
    yield
    # Cleanup
    db_file = settings.resolved_db_path
    if db_file.exists() and "test" in str(db_file):
        try:
            db_file.unlink()
        except Exception:
            pass


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

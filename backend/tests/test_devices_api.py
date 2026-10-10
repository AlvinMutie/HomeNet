from starlette.testclient import TestClient
from backend.app.database import upsert_scanned_device


def test_health_endpoint(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_list_devices_empty(client: TestClient):
    response = client.get("/api/devices")
    assert response.status_code == 200
    assert response.json() == []


def test_patch_device_custom_name_and_trust(client: TestClient):
    # Seed a device
    upsert_scanned_device(
        device_id="dev-101",
        ip_address="192.168.100.25",
        mac_address="28:3a:4d:1c:50:8d",
        hostname="work-laptop",
        manufacturer="Intel",
        latency_ms=12.4,
        is_randomized_mac=False,
    )

    # Patch with friendly name and trusted status
    patch_payload = {
        "custom_name": "My Primary Laptop",
        "is_trusted": 1,
        "notes": "Dev machine on 5GHz Wi-Fi"
    }
    patch_res = client.patch("/api/devices/dev-101", json=patch_payload)
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["custom_name"] == "My Primary Laptop"
    assert data["is_trusted"] == 1
    assert data["notes"] == "Dev machine on 5GHz Wi-Fi"

    # Verify persistence via GET /api/devices
    get_res = client.get("/api/devices")
    assert get_res.status_code == 200
    devices = get_res.json()
    assert len(devices) == 1
    assert devices[0]["custom_name"] == "My Primary Laptop"
    assert devices[0]["is_trusted"] == 1


def test_devices_filtering_and_search(client: TestClient):
    upsert_scanned_device(
        device_id="dev-phone",
        ip_address="192.168.100.4",
        mac_address="00:1a:8a:11:22:33",
        hostname="galaxy-s22",
        manufacturer="Samsung",
        latency_ms=4.5,
        is_randomized_mac=False,
    )
    upsert_scanned_device(
        device_id="dev-iot",
        ip_address="192.168.100.20",
        mac_address="24:0a:c4:aa:bb:cc",
        hostname=None,
        manufacturer="Espressif Inc.",
        latency_ms=30.2,
        is_randomized_mac=False,
    )

    # Update phone to trusted
    client.patch("/api/devices/dev-phone", json={"is_trusted": 1})
    # Update iot to untrusted
    client.patch("/api/devices/dev-iot", json={"is_trusted": 0})

    # Filter trusted
    trusted_res = client.get("/api/devices?filter_status=trusted")
    assert trusted_res.status_code == 200
    trusted_list = trusted_res.json()
    assert len(trusted_list) == 1
    assert trusted_list[0]["id"] == "dev-phone"

    # Search for Espressif
    search_res = client.get("/api/devices?search=Espressif")
    assert search_res.status_code == 200
    search_list = search_res.json()
    assert len(search_list) == 1
    assert search_list[0]["id"] == "dev-iot"


def test_device_block_endpoint_safety(client: TestClient):
    """
    Ensure device blocking endpoint does NOT simulate blocking,
    and returns HTTP 501 with clear explanation that router integration is required.
    """
    upsert_scanned_device(
        device_id="dev-target",
        ip_address="192.168.100.55",
        mac_address="44:55:66:77:88:99",
        hostname="unrecognized-box",
        manufacturer="Unknown",
        latency_ms=15.0,
        is_randomized_mac=False,
    )

    block_res = client.post("/api/devices/dev-target/block")
    assert block_res.status_code == 501
    err_data = block_res.json()["detail"]
    assert "unavailable_requires_router_auth" in err_data["status"]
    assert "Huawei HG8145V6" in err_data["message"]

from starlette.testclient import TestClient


def test_router_status_endpoint(client: TestClient):
    response = client.get("/api/router/status")
    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "Huawei HG8145V6"
    assert "Safaricom" in data["firmware"]
    assert data["gateway_ip"] == "192.168.100.1"
    assert "reachable" in data
    assert "internet_online" in data
    # Router status and internet status must be clearly differentiated
    assert isinstance(data["reachable"], bool)
    assert isinstance(data["internet_online"], bool)


def test_router_diagnostics_endpoint(client: TestClient):
    response = client.get("/api/router/diagnostics")
    assert response.status_code == 200
    data = response.json()
    assert "integration_guide" in data
    assert "Huawei HG8145V6" in data["integration_guide"]["target_hardware"]
    assert "Safaricom Home Fibre" in data["integration_guide"]["customization"]


def test_dashboard_stats_endpoint(client: TestClient):
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_devices" in data
    assert "responding_devices" in data
    assert "trusted_devices" in data
    assert "manufacturers" in data
    assert "router_status" in data

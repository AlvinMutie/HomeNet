from backend.app.database import (
    upsert_scanned_device,
    get_device_by_id,
    update_device_metadata,
    mark_devices_inactive_except,
    get_all_devices,
)


def test_persistence_preserves_custom_names_across_scans():
    # Initial scan finds device
    dev1 = upsert_scanned_device(
        device_id="id-mac-1",
        ip_address="192.168.100.8",
        mac_address="1c:e5:04:77:c1:ab",
        hostname="huawei-router",
        manufacturer="Huawei Technologies",
        latency_ms=3.2,
        is_randomized_mac=False,
    )

    # User assigns custom name and marks as trusted
    update_device_metadata(
        device_id=dev1["id"],
        custom_name="Main Huawei HG8145V6 Gateway",
        is_trusted=1,
        notes="Connected via Fibre GPON"
    )

    # Next scan runs with different latency or updated IP
    dev2 = upsert_scanned_device(
        device_id="id-mac-different-id", # Even if scanner generates new temp ID, MAC matches
        ip_address="192.168.100.8",
        mac_address="1c:e5:04:77:c1:ab",
        hostname="huawei-router",
        manufacturer="Huawei Technologies",
        latency_ms=2.9,
        is_randomized_mac=False,
    )

    # Custom name, trust status, and notes MUST remain intact
    record = get_device_by_id(dev1["id"])
    assert record["custom_name"] == "Main Huawei HG8145V6 Gateway"
    assert record["is_trusted"] == 1
    assert record["notes"] == "Connected via Fibre GPON"
    assert record["latency_ms"] == 2.9


def test_marking_devices_inactive_without_deleting():
    devA = upsert_scanned_device(
        device_id="dev-a",
        ip_address="192.168.100.10",
        mac_address="aa:bb:cc:dd:ee:01",
        hostname="tablet",
        manufacturer="Apple",
        latency_ms=10.0,
        is_randomized_mac=False,
    )
    devB = upsert_scanned_device(
        device_id="dev-b",
        ip_address="192.168.100.11",
        mac_address="aa:bb:cc:dd:ee:02",
        hostname="printer",
        manufacturer="HP",
        latency_ms=15.0,
        is_randomized_mac=False,
    )

    # Subsequent scan only finds devA
    mark_devices_inactive_except([devA["id"]])

    all_devs = get_all_devices()
    assert len(all_devs) == 2

    # devA should still be active
    recA = get_device_by_id(devA["id"])
    assert recA["is_active"] == 1

    # devB should now be inactive/offline, not deleted!
    recB = get_device_by_id(devB["id"])
    assert recB["is_active"] == 0
    assert recB["latency_ms"] is None


def test_pruning_inactive_devices():
    from backend.app.database import prune_inactive_devices

    # devA active, devB inactive
    devA = upsert_scanned_device(
        device_id="dev-active",
        ip_address="192.168.100.20",
        mac_address="aa:bb:cc:dd:ee:20",
        hostname="active-laptop",
        manufacturer="Dell",
        latency_ms=5.0,
        is_randomized_mac=False,
    )
    devB = upsert_scanned_device(
        device_id="dev-offline",
        ip_address="192.168.100.21",
        mac_address="aa:bb:cc:dd:ee:21",
        hostname="old-phone",
        manufacturer="Samsung",
        latency_ms=12.0,
        is_randomized_mac=False,
    )

    # Mark devB as inactive
    mark_devices_inactive_except([devA["id"]])

    # Pruning inactive devices deletes devB, keeps devA
    deleted = prune_inactive_devices(older_than_hours=None)
    assert deleted >= 1
    assert get_device_by_id(devA["id"]) is not None
    assert get_device_by_id(devB["id"]) is None


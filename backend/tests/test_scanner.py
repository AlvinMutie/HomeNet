import pytest
from backend.app.services.oui_lookup import (
    lookup_manufacturer,
    is_locally_administered_mac,
    normalize_mac
)
from backend.app.services.scanner import NetworkScanner


def test_normalize_mac():
    assert normalize_mac("1c-e5-04-77-c1-ab") == "1c:e5:04:77:c1:ab"
    assert normalize_mac("1CE50477C1AB") == "1c:e5:04:77:c1:ab"
    assert normalize_mac(None) is None
    assert normalize_mac("invalid") is None


def test_oui_lookup_huawei_and_known():
    # User's actual router MAC OUI 1c:e5:04
    mfg, is_rand = lookup_manufacturer("1c:e5:04:77:c1:ab")
    assert mfg == "Huawei Technologies"
    assert not is_rand

    # Intel
    mfg, is_rand = lookup_manufacturer("28:3a:4d:1c:50:8d")
    assert mfg == "Intel"
    assert not is_rand

    # Unknown MAC
    mfg, is_rand = lookup_manufacturer("00:00:00:11:22:33")
    assert mfg == "Unknown"
    assert not is_rand


def test_locally_administered_randomized_mac_detection():
    # Second hex digit with bit 1 set (2, 6, A, E)
    # e.g., 42:18:4f:a4:71:c7 (found in user's ARP table earlier!)
    assert is_locally_administered_mac("42:18:4f:a4:71:c7") is True

    mfg, is_rand = lookup_manufacturer("42:18:4f:a4:71:c7")
    assert is_rand is True
    # Never guesses manufacturer on randomized MAC
    assert mfg == "Unknown"


def test_scanner_rejects_public_ip_ranges():
    # Prohibits scanning external public IP ranges
    with pytest.raises(ValueError, match="not a private IP subnet"):
        NetworkScanner(subnet="8.8.8.0/24")

    with pytest.raises(ValueError, match="not a private IP subnet"):
        NetworkScanner(subnet="1.1.1.0/24")


def test_scanner_rejects_excessively_large_subnets():
    # Prohibits scanning massive subnets like /16 which would flood
    with pytest.raises(ValueError, match="too large"):
        NetworkScanner(subnet="10.0.0.0/16")

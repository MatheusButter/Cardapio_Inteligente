"""V2 backend tests: store, menus, staff (RBAC), orders flow."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://food-filter-2.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@cardapio.com"
ADMIN_PASSWORD = "admin123"


# --- Fixtures ---
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def waiter(admin_h):
    """Create a waiter staff and return its credentials and token."""
    email = f"TEST_waiter_{uuid.uuid4().hex[:8]}@cardapio.com"
    pwd = "waiter123"
    r = requests.post(f"{BASE_URL}/api/staff", json={
        "email": email, "password": pwd, "name": "TEST Waiter", "role": "waiter"
    }, headers=admin_h)
    assert r.status_code == 200, r.text
    user = r.json()
    # Login as waiter
    r2 = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd})
    assert r2.status_code == 200, r2.text
    token = r2.json()["access_token"]
    yield {"id": user["id"], "email": email, "token": token,
           "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}}
    # Teardown
    requests.delete(f"{BASE_URL}/api/staff/{user['id']}", headers=admin_h)


@pytest.fixture(scope="module")
def manager(admin_h):
    email = f"TEST_mgr_{uuid.uuid4().hex[:8]}@cardapio.com"
    pwd = "mgr12345"
    r = requests.post(f"{BASE_URL}/api/staff", json={
        "email": email, "password": pwd, "name": "TEST Manager", "role": "manager"
    }, headers=admin_h)
    assert r.status_code == 200, r.text
    user = r.json()
    r2 = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd})
    token = r2.json()["access_token"]
    yield {"id": user["id"], "token": token,
           "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}}
    requests.delete(f"{BASE_URL}/api/staff/{user['id']}", headers=admin_h)


# --- Store settings ---
def test_store_get_public():
    r = requests.get(f"{BASE_URL}/api/store")
    assert r.status_code == 200
    s = r.json()
    assert "is_open" in s
    assert "store_name" in s


def test_store_update_admin(admin_h):
    # Set is_open True (baseline)
    r = requests.put(f"{BASE_URL}/api/store",
                     json={"is_open": True, "store_name": "TEST Store", "whatsapp": "+5511999999999"},
                     headers=admin_h)
    assert r.status_code == 200
    s = r.json()
    assert s["is_open"] is True
    assert s["store_name"] == "TEST Store"
    assert s["whatsapp"] == "+5511999999999"


def test_store_update_unauth():
    r = requests.put(f"{BASE_URL}/api/store", json={"is_open": False})
    assert r.status_code == 401


# --- Menus ---
def test_menus_list_public():
    r = requests.get(f"{BASE_URL}/api/menus")
    assert r.status_code == 200
    menus = r.json()
    assert len(menus) >= 3  # auto-seeded
    names = [m["name"]["pt"] for m in menus]
    assert "Cardápio Principal" in names
    assert "Café da Manhã" in names
    assert "Happy Hour" in names


def test_menus_crud_admin(admin_h):
    payload = {"name": {"pt": "TEST_menu", "en": "TEST_menu", "es": "TEST_menu"}, "icon": "wine", "sort_order": 99}
    r = requests.post(f"{BASE_URL}/api/menus", json=payload, headers=admin_h)
    assert r.status_code == 200, r.text
    m = r.json()
    mid = m["id"]
    assert m["name"]["pt"] == "TEST_menu"

    # update
    r = requests.put(f"{BASE_URL}/api/menus/{mid}", json={"icon": "coffee"}, headers=admin_h)
    assert r.status_code == 200
    assert r.json()["icon"] == "coffee"

    # confirm in list
    r = requests.get(f"{BASE_URL}/api/menus")
    assert any(x["id"] == mid for x in r.json())

    # delete
    r = requests.delete(f"{BASE_URL}/api/menus/{mid}", headers=admin_h)
    assert r.status_code == 200
    r = requests.get(f"{BASE_URL}/api/menus")
    assert not any(x["id"] == mid for x in r.json())


def test_menus_create_unauth():
    r = requests.post(f"{BASE_URL}/api/menus", json={"name": {"pt": "x", "en": "x", "es": "x"}})
    assert r.status_code == 401


def test_manager_can_crud_menus(manager):
    payload = {"name": {"pt": "TEST_m_mgr", "en": "TEST_m_mgr", "es": "TEST_m_mgr"}}
    r = requests.post(f"{BASE_URL}/api/menus", json=payload, headers=manager["headers"])
    assert r.status_code == 200, r.text
    mid = r.json()["id"]
    requests.delete(f"{BASE_URL}/api/menus/{mid}", headers=manager["headers"])


# --- Staff RBAC ---
def test_staff_list_admin(admin_h):
    r = requests.get(f"{BASE_URL}/api/staff", headers=admin_h)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_waiter_login_and_me(waiter):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=waiter["headers"])
    assert r.status_code == 200
    assert r.json()["role"] == "waiter"


def test_waiter_cannot_create_product(waiter):
    payload = {"name": {"pt": "x", "en": "x", "es": "x"}, "category": "x", "price": 1.0}
    r = requests.post(f"{BASE_URL}/api/products", json=payload, headers=waiter["headers"])
    assert r.status_code == 403


def test_waiter_cannot_create_menu(waiter):
    r = requests.post(f"{BASE_URL}/api/menus",
                      json={"name": {"pt": "x", "en": "x", "es": "x"}}, headers=waiter["headers"])
    assert r.status_code == 403


def test_waiter_cannot_create_staff(waiter):
    r = requests.post(f"{BASE_URL}/api/staff",
                      json={"email": "x@x.com", "password": "x", "name": "x", "role": "waiter"},
                      headers=waiter["headers"])
    assert r.status_code == 403


def test_manager_can_crud_products(manager):
    payload = {"name": {"pt": "TEST_pmgr", "en": "TEST_pmgr", "es": "TEST_pmgr"},
               "category": "TEST", "price": 5.0}
    r = requests.post(f"{BASE_URL}/api/products", json=payload, headers=manager["headers"])
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    requests.delete(f"{BASE_URL}/api/products/{pid}", headers=manager["headers"])


def test_manager_cannot_create_staff(manager):
    r = requests.post(f"{BASE_URL}/api/staff",
                      json={"email": "x@x.com", "password": "x", "name": "x", "role": "waiter"},
                      headers=manager["headers"])
    assert r.status_code == 403


# --- Orders ---
def _sample_item():
    # Use any product
    products = requests.get(f"{BASE_URL}/api/products").json()
    p = products[0]
    return {
        "product_id": p["id"],
        "name": p["name"],
        "unit_price": p["price"],
        "qty": 2,
    }


def test_create_guest_order_open(admin_h):
    # ensure store open
    requests.put(f"{BASE_URL}/api/store", json={"is_open": True}, headers=admin_h)
    payload = {
        "customer_name": "TEST Cliente",
        "mode": "table",
        "table_number": "5",
        "note": "sem cebola",
        "items": [_sample_item()],
    }
    r = requests.post(f"{BASE_URL}/api/orders", json=payload)
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["status"] == "pending"
    assert o["payment_method"] == "pending"
    assert o["staff_id"] is None
    assert o["code"].startswith("#")
    assert o["total"] > 0
    assert len(o["status_history"]) == 1


def test_guest_order_blocked_when_closed(admin_h):
    requests.put(f"{BASE_URL}/api/store", json={"is_open": False}, headers=admin_h)
    try:
        payload = {
            "customer_name": "TEST Closed",
            "mode": "takeout",
            "items": [_sample_item()],
        }
        r = requests.post(f"{BASE_URL}/api/orders", json=payload)
        assert r.status_code == 403, r.text
    finally:
        requests.put(f"{BASE_URL}/api/store", json={"is_open": True}, headers=admin_h)


def test_staff_order_works_when_closed(admin_h, waiter):
    requests.put(f"{BASE_URL}/api/store", json={"is_open": False}, headers=admin_h)
    try:
        payload = {
            "customer_name": "TEST StaffOrder",
            "mode": "table",
            "table_number": "10",
            "items": [_sample_item()],
            "payment_method": "cash",
        }
        r = requests.post(f"{BASE_URL}/api/orders", json=payload, headers=waiter["headers"])
        assert r.status_code == 200, r.text
        o = r.json()
        assert o["payment_method"] == "cash"
        assert o["staff_id"] == waiter["id"]
    finally:
        requests.put(f"{BASE_URL}/api/store", json={"is_open": True}, headers=admin_h)


def test_order_status_flow(admin_h, waiter):
    # Create as guest
    payload = {
        "customer_name": "TEST Flow",
        "mode": "table",
        "table_number": "7",
        "items": [_sample_item()],
    }
    r = requests.post(f"{BASE_URL}/api/orders", json=payload)
    assert r.status_code == 200
    oid = r.json()["id"]

    # Waiter advances each status
    for status in ["kitchen", "ready", "delivered", "completed"]:
        r = requests.patch(f"{BASE_URL}/api/orders/{oid}/status",
                           json={"status": status}, headers=waiter["headers"])
        assert r.status_code == 200, r.text
        assert r.json()["status"] == status

    # Verify history accumulated
    r = requests.get(f"{BASE_URL}/api/orders/{oid}", headers=waiter["headers"])
    o = r.json()
    statuses = [h["status"] for h in o["status_history"]]
    assert statuses == ["pending", "kitchen", "ready", "delivered", "completed"]
    # Each status_history entry except first should have 'by'
    for h in o["status_history"][1:]:
        assert h.get("by") == "TEST Waiter"


def test_order_cancelled(admin_h, waiter):
    payload = {
        "customer_name": "TEST Cancel",
        "mode": "takeout",
        "items": [_sample_item()],
    }
    r = requests.post(f"{BASE_URL}/api/orders", json=payload)
    oid = r.json()["id"]
    r = requests.patch(f"{BASE_URL}/api/orders/{oid}/status",
                       json={"status": "cancelled"}, headers=waiter["headers"])
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"


def test_invalid_status(waiter):
    # Need a real order id; create one
    payload = {"customer_name": "TEST Invalid", "mode": "takeout", "items": [_sample_item()]}
    r = requests.post(f"{BASE_URL}/api/orders", json=payload)
    oid = r.json()["id"]
    r = requests.patch(f"{BASE_URL}/api/orders/{oid}/status",
                       json={"status": "bogus"}, headers=waiter["headers"])
    assert r.status_code == 400


def test_orders_list_unauth():
    r = requests.get(f"{BASE_URL}/api/orders")
    assert r.status_code == 401


def test_orders_list_waiter(waiter):
    r = requests.get(f"{BASE_URL}/api/orders", headers=waiter["headers"])
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_order_no_items():
    r = requests.post(f"{BASE_URL}/api/orders", json={"customer_name": "x", "mode": "takeout", "items": []})
    assert r.status_code == 400


def test_create_order_table_no_number():
    r = requests.post(f"{BASE_URL}/api/orders", json={
        "customer_name": "x", "mode": "table", "items": [_sample_item()]
    })
    assert r.status_code == 400

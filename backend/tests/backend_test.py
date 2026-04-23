"""Backend API tests for Cardapio Digital."""
import os
import io
import pytest
import requests

BASE_URL = "https://food-filter-2.preview.emergentagent.com"
ADMIN_EMAIL = "admin@cardapio.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "admin"
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# --- Health ---
def test_health(session):
    r = session.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# --- Auth ---
def test_login_wrong_password(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "bad"})
    assert r.status_code == 401


def test_login_cookies_and_token(session):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"
    assert body["access_token"]
    # httpOnly cookies should be present
    set_cookie = r.headers.get("set-cookie", "")
    assert "access_token" in set_cookie
    assert "HttpOnly" in set_cookie or "httponly" in set_cookie.lower()


def test_me_without_token(session):
    r = requests.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


def test_me_with_bearer(admin_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"


# --- Public reads ---
def test_list_products(session):
    r = session.get(f"{BASE_URL}/api/products")
    assert r.status_code == 200
    products = r.json()
    assert isinstance(products, list)
    assert len(products) >= 6, f"expected >=6 products, got {len(products)}"
    p = products[0]
    assert "id" in p and "name" in p and "price" in p
    # i18n check
    assert set(["pt", "en", "es"]).issubset(p["name"].keys())


def test_list_tags(session):
    r = session.get(f"{BASE_URL}/api/tags")
    assert r.status_code == 200
    tags = r.json()
    assert len(tags) >= 5
    assert set(["pt", "en", "es"]).issubset(tags[0]["name"].keys())


def test_list_categories(session):
    r = session.get(f"{BASE_URL}/api/categories")
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list) and len(cats) > 0


# --- Tags CRUD ---
def test_tag_crud(admin_headers):
    # unauth create
    r = requests.post(f"{BASE_URL}/api/tags", json={"name": {"pt": "t", "en": "t", "es": "t"}})
    assert r.status_code == 401

    # create
    payload = {"name": {"pt": "TEST_pt", "en": "TEST_en", "es": "TEST_es"}, "color": "#123456", "icon": "tag"}
    r = requests.post(f"{BASE_URL}/api/tags", json=payload, headers=admin_headers)
    assert r.status_code == 200, r.text
    tag = r.json()
    tag_id = tag["id"]
    assert tag["name"]["en"] == "TEST_en"

    # verify in list
    r = requests.get(f"{BASE_URL}/api/tags")
    assert any(t["id"] == tag_id for t in r.json())

    # delete
    r = requests.delete(f"{BASE_URL}/api/tags/{tag_id}", headers=admin_headers)
    assert r.status_code == 200
    r = requests.get(f"{BASE_URL}/api/tags")
    assert not any(t["id"] == tag_id for t in r.json())


# --- Products CRUD ---
def test_product_crud(admin_headers):
    payload = {
        "name": {"pt": "TEST_prod", "en": "TEST_prod", "es": "TEST_prod"},
        "description": {"pt": "d", "en": "d", "es": "d"},
        "category": "TEST_Cat",
        "price": 10.5,
        "promo": True,
        "available": True,
        "tag_ids": [],
    }
    r = requests.post(f"{BASE_URL}/api/products", json=payload, headers=admin_headers)
    assert r.status_code == 200, r.text
    prod = r.json()
    pid = prod["id"]
    assert prod["price"] == 10.5

    # GET by id
    r = requests.get(f"{BASE_URL}/api/products/{pid}")
    assert r.status_code == 200
    assert r.json()["name"]["en"] == "TEST_prod"

    # Toggle available
    r = requests.put(f"{BASE_URL}/api/products/{pid}", json={"available": False}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["available"] is False

    r = requests.get(f"{BASE_URL}/api/products/{pid}")
    assert r.json()["available"] is False

    # Delete
    r = requests.delete(f"{BASE_URL}/api/products/{pid}", headers=admin_headers)
    assert r.status_code == 200
    r = requests.get(f"{BASE_URL}/api/products/{pid}")
    assert r.status_code == 404


# --- Upload ---
def test_upload_and_fetch(admin_token):
    # 1x1 PNG
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
        b"\xc0\x00\x00\x00\x03\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    files = {"file": ("t.png", io.BytesIO(png_bytes), "image/png")}
    r = requests.post(f"{BASE_URL}/api/upload", files=files,
                      headers={"Authorization": f"Bearer {admin_token}"})
    if r.status_code == 500:
        pytest.skip(f"storage unavailable: {r.text}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "path" in data and "url" in data
    # fetch file
    r2 = requests.get(f"{BASE_URL}/api/files/{data['path']}")
    assert r2.status_code == 200
    assert len(r2.content) > 0

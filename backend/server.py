from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Query, Header
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# -------- Setup --------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = os.environ.get("APP_NAME", "cardapio-digital")
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
storage_key: Optional[str] = None

app = FastAPI(title="Cardapio Digital API")
api_router = APIRouter(prefix="/api")

# -------- Auth helpers --------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

STAFF_ROLES = {"admin", "manager", "waiter", "kitchen", "cashier"}
MGMT_ROLES = {"admin", "manager"}

def require_roles(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Access denied")
        return user
    return _dep

# -------- Storage helpers --------
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# -------- Models --------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

class I18nField(BaseModel):
    pt: str = ""
    en: str = ""
    es: str = ""

class TagCreate(BaseModel):
    name: Dict[str, str]  # {pt, en, es}
    color: str = "#A0522D"
    icon: str = "tag"

class TagUpdate(BaseModel):
    name: Optional[Dict[str, str]] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class PortionSize(BaseModel):
    label: Dict[str, str]
    price: float

class ProductCreate(BaseModel):
    name: Dict[str, str]
    description: Dict[str, str] = Field(default_factory=dict)
    category: str
    price: float
    promo: bool = False
    available: bool = True
    tag_ids: List[str] = Field(default_factory=list)
    image_path: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    ingredients: List[Dict[str, str]] = Field(default_factory=list)
    prep_time: Optional[int] = None
    portion_sizes: List[PortionSize] = Field(default_factory=list)
    pairing_ids: List[str] = Field(default_factory=list)

class ProductUpdate(BaseModel):
    name: Optional[Dict[str, str]] = None
    description: Optional[Dict[str, str]] = None
    category: Optional[str] = None
    price: Optional[float] = None
    promo: Optional[bool] = None
    available: Optional[bool] = None
    tag_ids: Optional[List[str]] = None
    image_path: Optional[str] = None
    images: Optional[List[str]] = None
    ingredients: Optional[List[Dict[str, str]]] = None
    prep_time: Optional[int] = None
    portion_sizes: Optional[List[PortionSize]] = None
    pairing_ids: Optional[List[str]] = None
    menu_ids: Optional[List[str]] = None

# -------- Auth endpoints --------
@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return {
        "id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"],
        "access_token": access,
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)

# -------- Tags --------
@api_router.get("/tags")
async def list_tags():
    tags = await db.tags.find({}, {"_id": 0}).to_list(500)
    return tags

@api_router.post("/tags")
async def create_tag(payload: TagCreate, _: dict = Depends(require_roles("admin","manager"))):
    tag = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "color": payload.color,
        "icon": payload.icon,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tags.insert_one(tag)
    tag.pop("_id", None)
    return tag

@api_router.put("/tags/{tag_id}")
async def update_tag(tag_id: str, payload: TagUpdate, _: dict = Depends(require_roles("admin","manager"))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.tags.update_one({"id": tag_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tag not found")
    tag = await db.tags.find_one({"id": tag_id}, {"_id": 0})
    return tag

@api_router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: str, _: dict = Depends(require_roles("admin","manager"))):
    await db.tags.delete_one({"id": tag_id})
    await db.products.update_many({}, {"$pull": {"tag_ids": tag_id}})
    return {"ok": True}

# -------- Products --------
@api_router.get("/products")
async def list_products():
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p

@api_router.post("/products")
async def create_product(payload: ProductCreate, _: dict = Depends(require_roles("admin","manager"))):
    product = {
        "id": str(uuid.uuid4()),
        **payload.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.products.insert_one(product)
    product.pop("_id", None)
    return product

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, payload: ProductUpdate, _: dict = Depends(require_roles("admin","manager"))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.update_one({"id": product_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    return p

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(require_roles("admin","manager"))):
    await db.products.delete_one({"id": product_id})
    return {"ok": True}

@api_router.get("/categories")
async def list_categories():
    cats = await db.products.distinct("category")
    return sorted([c for c in cats if c])

# -------- Uploads --------
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(require_roles("admin","manager"))):
    ext = (file.filename.split(".")[-1] if "." in (file.filename or "") else "bin").lower()
    safe_ext = ext if ext in {"png", "jpg", "jpeg", "webp", "gif"} else "bin"
    path = f"{APP_NAME}/images/{uuid.uuid4()}.{safe_ext}"
    data = await file.read()
    content_type = file.content_type or "application/octet-stream"
    result = put_object(path, data, content_type)
    doc = {
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.uploads.insert_one(doc)
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api_router.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.uploads.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return FastAPIResponse(content=data, media_type=record.get("content_type", content_type))

# ============================================================================
# V2: Store settings, Menus, Staff (users CRUD), Orders
# ============================================================================

STORE_SINGLETON_ID = "default"

class StoreSettingsUpdate(BaseModel):
    is_open: Optional[bool] = None
    store_name: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    logo_path: Optional[str] = None

async def get_store_settings() -> dict:
    s = await db.store_settings.find_one({"id": STORE_SINGLETON_ID}, {"_id": 0})
    if not s:
        s = {
            "id": STORE_SINGLETON_ID,
            "is_open": True,
            "store_name": "Cardápio Digital",
            "whatsapp": "",
            "address": "",
            "logo_path": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.store_settings.insert_one(dict(s))
        s.pop("_id", None)
    return s

@api_router.get("/store")
async def read_store():
    return await get_store_settings()

@api_router.put("/store")
async def update_store(payload: StoreSettingsUpdate, _: dict = Depends(require_roles("admin", "manager"))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.store_settings.update_one({"id": STORE_SINGLETON_ID}, {"$set": updates}, upsert=True)
    return await get_store_settings()

# ---- Menus (café da manhã, happy hour, almoço, etc.) ----
class MenuCreate(BaseModel):
    name: Dict[str, str]
    description: Dict[str, str] = Field(default_factory=dict)
    icon: str = "utensils"
    active: bool = True
    sort_order: int = 0

class MenuUpdate(BaseModel):
    name: Optional[Dict[str, str]] = None
    description: Optional[Dict[str, str]] = None
    icon: Optional[str] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None

@api_router.get("/menus")
async def list_menus():
    menus = await db.menus.find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    return menus

@api_router.post("/menus")
async def create_menu(payload: MenuCreate, _: dict = Depends(require_roles("admin", "manager"))):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(),
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.menus.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc

@api_router.put("/menus/{menu_id}")
async def update_menu(menu_id: str, payload: MenuUpdate, _: dict = Depends(require_roles("admin", "manager"))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    r = await db.menus.update_one({"id": menu_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu not found")
    return await db.menus.find_one({"id": menu_id}, {"_id": 0})

@api_router.delete("/menus/{menu_id}")
async def delete_menu(menu_id: str, _: dict = Depends(require_roles("admin", "manager"))):
    await db.menus.delete_one({"id": menu_id})
    await db.products.update_many({}, {"$pull": {"menu_ids": menu_id}})
    return {"ok": True}

# ---- Staff (users CRUD) ----
class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # admin | manager | waiter | kitchen | cashier

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

@api_router.get("/staff")
async def list_staff(_: dict = Depends(require_roles("admin", "manager"))):
    staff = await db.users.find({"role": {"$in": list(STAFF_ROLES)}}, {"_id": 0, "password_hash": 0}).to_list(500)
    return staff

@api_router.post("/staff")
async def create_staff(payload: StaffCreate, _: dict = Depends(require_admin)):
    if payload.role not in STAFF_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already in use")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": payload.role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(dict(doc))
    doc.pop("password_hash"); doc.pop("_id", None)
    return doc

@api_router.put("/staff/{user_id}")
async def update_staff(user_id: str, payload: StaffUpdate, _: dict = Depends(require_admin)):
    updates = {}
    if payload.name is not None: updates["name"] = payload.name
    if payload.role is not None:
        if payload.role not in STAFF_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role")
        updates["role"] = payload.role
    if payload.password:
        updates["password_hash"] = hash_password(payload.password)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    r = await db.users.update_one({"id": user_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return u

@api_router.delete("/staff/{user_id}")
async def delete_staff(user_id: str, current: dict = Depends(require_admin)):
    if user_id == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}

# ---- Orders ----
ORDER_STATUSES = ["pending", "kitchen", "ready", "delivered", "completed", "cancelled"]

class OrderItem(BaseModel):
    product_id: str
    name: Dict[str, str]
    portion_label: Optional[Dict[str, str]] = None
    unit_price: float
    qty: int

class OrderCreate(BaseModel):
    customer_name: str
    mode: str  # "table" | "takeout"
    table_number: Optional[str] = None
    note: Optional[str] = None
    items: List[OrderItem]
    payment_method: Optional[str] = None  # "cash" | "pending" | "card"
    staff_id: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str

def _gen_order_code() -> str:
    # Short 4-digit code per day
    import random
    return f"#{random.randint(1000, 9999)}"

@api_router.post("/orders")
async def create_order(payload: OrderCreate, request: Request):
    settings = await get_store_settings()
    # Allow staff orders always; guest orders require store open
    auth_user = None
    try:
        auth_user = await get_current_user(request)
    except HTTPException:
        auth_user = None

    if not auth_user and not settings.get("is_open"):
        raise HTTPException(status_code=403, detail="Store is closed — ordering unavailable")

    if payload.mode not in ("table", "takeout"):
        raise HTTPException(status_code=400, detail="Invalid mode")
    if payload.mode == "table" and not payload.table_number:
        raise HTTPException(status_code=400, detail="Table number required")
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order has no items")

    total = sum(i.unit_price * i.qty for i in payload.items)
    doc = {
        "id": str(uuid.uuid4()),
        "code": _gen_order_code(),
        "customer_name": payload.customer_name.strip() or "Cliente",
        "mode": payload.mode,
        "table_number": payload.table_number,
        "note": payload.note or "",
        "items": [i.model_dump() for i in payload.items],
        "total": round(total, 2),
        "status": "pending",
        "payment_method": payload.payment_method or ("cash" if auth_user else "pending"),
        "staff_id": auth_user["id"] if auth_user else None,
        "staff_name": auth_user["name"] if auth_user else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "status_history": [{"status": "pending", "at": datetime.now(timezone.utc).isoformat()}],
    }
    await db.orders.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc

@api_router.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    limit: int = 200,
    _: dict = Depends(require_roles("admin", "manager", "waiter", "kitchen", "cashier")),
):
    q = {}
    if status:
        q["status"] = status
    orders = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, _: dict = Depends(require_roles(*STAFF_ROLES))):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: OrderStatusUpdate, user: dict = Depends(require_roles(*STAFF_ROLES))):
    if payload.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    now = datetime.now(timezone.utc).isoformat()
    r = await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {"status": payload.status, "updated_at": now},
            "$push": {"status_history": {"status": payload.status, "at": now, "by": user["name"]}},
        },
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return await db.orders.find_one({"id": order_id}, {"_id": 0})

# ---- Analytics / Dashboard ----
@api_router.get("/analytics")
async def get_analytics(_: dict = Depends(require_roles("admin", "manager"))):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())  # Monday
    month_start = today_start.replace(day=1)

    def iso(dt): return dt.isoformat()

    revenue_statuses = ["ready", "delivered", "completed"]  # consider sold

    async def sum_range(start_dt):
        cursor = db.orders.aggregate([
            {"$match": {"created_at": {"$gte": iso(start_dt)}, "status": {"$in": revenue_statuses}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
        ])
        async for r in cursor:
            return {"revenue": round(r.get("total", 0), 2), "orders": r.get("count", 0)}
        return {"revenue": 0.0, "orders": 0}

    today = await sum_range(today_start)
    week = await sum_range(week_start)
    month = await sum_range(month_start)

    # Counts by current status
    by_status = {s: 0 for s in ORDER_STATUSES}
    cursor = db.orders.aggregate([
        {"$group": {"_id": "$status", "n": {"$sum": 1}}}
    ])
    async for r in cursor:
        if r["_id"] in by_status:
            by_status[r["_id"]] = r["n"]

    # Average ticket today
    avg_ticket_today = round(today["revenue"] / today["orders"], 2) if today["orders"] else 0.0

    # Top selling products (last 30 days)
    thirty = (now - timedelta(days=30)).isoformat()
    top_products = []
    cursor = db.orders.aggregate([
        {"$match": {"created_at": {"$gte": thirty}, "status": {"$in": revenue_statuses}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.product_id",
            "name": {"$first": "$items.name"},
            "qty": {"$sum": "$items.qty"},
            "revenue": {"$sum": {"$multiply": ["$items.qty", "$items.unit_price"]}},
        }},
        {"$sort": {"qty": -1}},
        {"$limit": 5},
    ])
    async for r in cursor:
        top_products.append({
            "product_id": r["_id"],
            "name": r.get("name") or {"pt": "?"},
            "qty": r["qty"],
            "revenue": round(r["revenue"], 2),
        })

    # Hourly distribution today
    hourly = [{"hour": h, "orders": 0, "revenue": 0.0} for h in range(24)]
    cursor = db.orders.find(
        {"created_at": {"$gte": iso(today_start)}, "status": {"$in": revenue_statuses}},
        {"_id": 0, "created_at": 1, "total": 1},
    )
    async for o in cursor:
        try:
            dt = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00"))
            h = dt.hour
            hourly[h]["orders"] += 1
            hourly[h]["revenue"] = round(hourly[h]["revenue"] + (o.get("total", 0) or 0), 2)
        except Exception:
            pass

    # Revenue last 7 days
    last_7_days = []
    for i in range(6, -1, -1):
        day = (today_start - timedelta(days=i))
        nxt = day + timedelta(days=1)
        d = await db.orders.aggregate([
            {"$match": {"created_at": {"$gte": iso(day), "$lt": iso(nxt)}, "status": {"$in": revenue_statuses}}},
            {"$group": {"_id": None, "rev": {"$sum": "$total"}, "n": {"$sum": 1}}},
        ]).to_list(1)
        last_7_days.append({
            "day": day.strftime("%a %d/%m"),
            "date": day.strftime("%Y-%m-%d"),
            "revenue": round(d[0]["rev"], 2) if d else 0.0,
            "orders": d[0]["n"] if d else 0,
        })

    # Active counts
    active_products = await db.products.count_documents({"available": True})
    total_products = await db.products.count_documents({})
    active_tags = await db.tags.count_documents({})
    staff_count = await db.users.count_documents({"role": {"$in": list(STAFF_ROLES)}})

    return {
        "today": today,
        "week": week,
        "month": month,
        "avg_ticket_today": avg_ticket_today,
        "by_status": by_status,
        "top_products": top_products,
        "hourly": hourly,
        "last_7_days": last_7_days,
        "catalog": {
            "active_products": active_products,
            "total_products": total_products,
            "tags": active_tags,
            "staff": staff_count,
        },
    }

# -------- Health --------
@api_router.get("/")
async def root():
    return {"message": "Cardapio Digital API", "status": "ok"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- Startup: seed admin + demo data --------
@app.on_event("startup")
async def on_startup():
    init_storage()
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.tags.create_index("id", unique=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@cardapio.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "name": "Gerente",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    # Backfill existing products with new fields (idempotent)
    async for p in db.products.find({}):
        updates = {}
        if "images" not in p or p.get("images") is None:
            updates["images"] = [p["image_path"]] if p.get("image_path") else []
        if "ingredients" not in p:
            updates["ingredients"] = []
        if "portion_sizes" not in p:
            updates["portion_sizes"] = []
        if "pairing_ids" not in p:
            updates["pairing_ids"] = []
        if "menu_ids" not in p:
            updates["menu_ids"] = []
        if "prep_time" not in p:
            updates["prep_time"] = None
        if updates:
            await db.products.update_one({"id": p["id"]}, {"$set": updates})

    # Seed default menus if empty
    if await db.menus.count_documents({}) == 0:
        default_menus = [
            {"id": str(uuid.uuid4()), "name": {"pt": "Cardápio Principal", "en": "Main Menu", "es": "Menú Principal"}, "description": {}, "icon": "utensils", "active": True, "sort_order": 0, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": {"pt": "Café da Manhã", "en": "Breakfast", "es": "Desayuno"}, "description": {}, "icon": "coffee", "active": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": {"pt": "Happy Hour", "en": "Happy Hour", "es": "Happy Hour"}, "description": {}, "icon": "wine", "active": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.menus.insert_many([dict(m) for m in default_menus])
        main_menu_id = default_menus[0]["id"]
        # Link existing products with empty menu_ids to main menu
        await db.products.update_many({"$or": [{"menu_ids": {"$exists": False}}, {"menu_ids": []}]},
                                       {"$set": {"menu_ids": [main_menu_id]}})

    # Seed demo tags + products if empty
    if await db.tags.count_documents({}) == 0:
        demo_tags = [
            {"id": str(uuid.uuid4()), "name": {"pt": "Vegano", "en": "Vegan", "es": "Vegano"}, "color": "#205427", "icon": "leaf"},
            {"id": str(uuid.uuid4()), "name": {"pt": "Sem Lactose", "en": "Lactose-Free", "es": "Sin Lactosa"}, "color": "#A0522D", "icon": "milk-off"},
            {"id": str(uuid.uuid4()), "name": {"pt": "Sem Glúten", "en": "Gluten-Free", "es": "Sin Gluten"}, "color": "#303226", "icon": "wheat-off"},
            {"id": str(uuid.uuid4()), "name": {"pt": "Picante", "en": "Spicy", "es": "Picante"}, "color": "#DC2626", "icon": "flame"},
            {"id": str(uuid.uuid4()), "name": {"pt": "Novo", "en": "New", "es": "Nuevo"}, "color": "#D97706", "icon": "sparkles"},
        ]
        await db.tags.insert_many([dict(t) for t in demo_tags])
        tag_map = {t["name"]["en"]: t["id"] for t in demo_tags}

        if await db.products.count_documents({}) == 0:
            demo_products = [
                {
                    "id": str(uuid.uuid4()),
                    "name": {"pt": "Hambúrguer Artesanal da Casa", "en": "House Artisan Burger", "es": "Hamburguesa Artesanal de la Casa"},
                    "description": {
                        "pt": "Pão brioche, blend 180g, queijo cheddar, bacon crocante e molho especial.",
                        "en": "Brioche bun, 180g blend, cheddar, crispy bacon, and house sauce.",
                        "es": "Pan brioche, blend 180g, queso cheddar, tocino crujiente y salsa de la casa.",
                    },
                    "category": "Burgers",
                    "price": 42.90, "promo": True, "available": True,
                    "tag_ids": [tag_map["New"]],
                    "image_path": "https://images.unsplash.com/photo-1550547660-d9450f859349?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": {"pt": "Salada Buddha Vegana", "en": "Vegan Buddha Bowl", "es": "Buddha Bowl Vegano"},
                    "description": {
                        "pt": "Quinoa, grão-de-bico, abacate, pepino e tahine de limão.",
                        "en": "Quinoa, chickpea, avocado, cucumber, and lemon tahini.",
                        "es": "Quinoa, garbanzos, aguacate, pepino y tahini de limón.",
                    },
                    "category": "Saladas",
                    "price": 36.00, "promo": False, "available": True,
                    "tag_ids": [tag_map["Vegan"], tag_map["Gluten-Free"]],
                    "image_path": "https://images.pexels.com/photos/3026013/pexels-photo-3026013.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=800",
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": {"pt": "Bolo de Chocolate Quente", "en": "Molten Chocolate Cake", "es": "Volcán de Chocolate"},
                    "description": {
                        "pt": "Bolo com recheio cremoso de chocolate e sorvete de baunilha.",
                        "en": "Cake with molten chocolate center and vanilla ice cream.",
                        "es": "Bizcocho con corazón fundente de chocolate y helado de vainilla.",
                    },
                    "category": "Sobremesas",
                    "price": 28.50, "promo": False, "available": True,
                    "tag_ids": [tag_map["Lactose-Free"]],
                    "image_path": "https://images.pexels.com/photos/33674414/pexels-photo-33674414.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=800",
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": {"pt": "Tacos Mexicanos Picantes", "en": "Spicy Mexican Tacos", "es": "Tacos Mexicanos Picantes"},
                    "description": {
                        "pt": "Três tacos com carne apimentada, guacamole e pico de gallo.",
                        "en": "Three tacos with spicy meat, guacamole and pico de gallo.",
                        "es": "Tres tacos con carne picante, guacamole y pico de gallo.",
                    },
                    "category": "Pratos Principais",
                    "price": 39.90, "promo": False, "available": True,
                    "tag_ids": [tag_map["Spicy"]],
                    "image_path": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": {"pt": "Suco Verde Detox", "en": "Detox Green Juice", "es": "Jugo Verde Detox"},
                    "description": {
                        "pt": "Couve, maçã verde, gengibre e limão — 400ml.",
                        "en": "Kale, green apple, ginger and lime — 400ml.",
                        "es": "Col rizada, manzana verde, jengibre y limón — 400ml.",
                    },
                    "category": "Bebidas",
                    "price": 15.00, "promo": True, "available": True,
                    "tag_ids": [tag_map["Vegan"], tag_map["Gluten-Free"], tag_map["Lactose-Free"]],
                    "image_path": "https://images.pexels.com/photos/3652428/pexels-photo-3652428.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=800",
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": {"pt": "Pizza Margherita", "en": "Margherita Pizza", "es": "Pizza Margherita"},
                    "description": {
                        "pt": "Molho de tomate, muçarela de búfala, manjericão fresco e azeite.",
                        "en": "Tomato sauce, buffalo mozzarella, fresh basil, and olive oil.",
                        "es": "Salsa de tomate, mozzarella de búfala, albahaca fresca y aceite de oliva.",
                    },
                    "category": "Pratos Principais",
                    "price": 54.90, "promo": False, "available": False,
                    "tag_ids": [],
                    "image_path": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
                },
            ]
            for p in demo_products:
                p["created_at"] = datetime.now(timezone.utc).isoformat()
                p["updated_at"] = p["created_at"]
            await db.products.insert_many(demo_products)
            logger.info(f"Seeded {len(demo_products)} demo products")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

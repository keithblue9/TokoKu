from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
import string
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ---------------- MongoDB ----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


# ---------------- App ----------------
app = FastAPI(title="TokoKu API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------------- Auth helpers ----------------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRES_DAYS = 7


def _jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def verify_pin(pin: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRES_DAYS),
        "type": "access",
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


async def require_admin(authorization: Optional[str] = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Tidak terautentikasi.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token tidak valid.")
        admin = await db.admins.find_one({"email": payload["sub"]})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin tidak ditemukan.")
        return {"email": admin["email"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi habis. Silakan login ulang.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid.")


# ---------------- Auth schemas ----------------
class LoginPayload(BaseModel):
    email: EmailStr
    pin: str


class ChangePinPayload(BaseModel):
    old_pin: str
    new_pin: str


class LoginResponse(BaseModel):
    token: str
    email: str


# ---------------- Auth endpoints ----------------
@api.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginPayload):
    email = payload.email.lower().strip()
    admin = await db.admins.find_one({"email": email})
    if not admin or not verify_pin(payload.pin, admin["pin_hash"]):
        raise HTTPException(status_code=401, detail="Email atau PIN salah.")
    return LoginResponse(token=create_access_token(email), email=email)


@api.post("/auth/change-pin")
async def change_pin(payload: ChangePinPayload, admin: dict = Depends(require_admin)):
    if not re.fullmatch(r"\d{6}", payload.new_pin):
        raise HTTPException(status_code=400, detail="PIN baru harus 6 digit angka.")
    a = await db.admins.find_one({"email": admin["email"]})
    if not a or not verify_pin(payload.old_pin, a["pin_hash"]):
        raise HTTPException(status_code=400, detail="PIN lama salah.")
    await db.admins.update_one(
        {"email": admin["email"]},
        {"$set": {"pin_hash": hash_pin(payload.new_pin), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


@api.get("/auth/me")
async def me(admin: dict = Depends(require_admin)):
    return admin


# ---------------- Orders ----------------
PACKAGE_REVISIONS = {"basic": 0, "growth": 1, "pro": 2}


def gen_order_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "ORD-" + "".join(secrets.choice(alphabet) for _ in range(6))


def gen_tracking_token() -> str:
    return secrets.token_urlsafe(24)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


OrderStatus = Literal[
    "pending_review",
    "awaiting_buyer",
    "negotiating",
    "rejected",
    "in_progress",
    "delivered",
    "revision_requested",
    "completed",
    "cancelled",
]


class CreateOrderPayload(BaseModel):
    buyer_name: str = Field(min_length=2, max_length=100)
    buyer_whatsapp: str = Field(min_length=8, max_length=20)
    buyer_business: str = Field(min_length=1, max_length=150)
    buyer_brief: str = Field(min_length=10, max_length=2000)
    package_id: str
    package_name: str
    duration_choice: Literal["monthly", "yearly", "twoYear"] = "yearly"
    package_setup_price: int = 0
    package_domain_price: int = 0


class ProposeDaysPayload(BaseModel):
    proposed_days: int = Field(ge=1, le=365)
    note: Optional[str] = ""


class NegotiatePayload(BaseModel):
    negotiated_days: int = Field(ge=1, le=365)
    reason: str = Field(min_length=3, max_length=1000)


class RejectPayload(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class DeliverPayload(BaseModel):
    url: str = Field(min_length=4, max_length=500)
    notes: Optional[str] = ""


class RevisionPayload(BaseModel):
    message: str = Field(min_length=5, max_length=2000)


class ReviewPayload(BaseModel):
    rating: int = Field(ge=1, le=5)
    message: str = Field(min_length=5, max_length=1500)


class MessagePayload(BaseModel):
    text: str = Field(min_length=1, max_length=1500)


class ToggleReviewVisibilityPayload(BaseModel):
    visible: bool


def _serialize_order(o: dict) -> dict:
    if not o:
        return o
    o.pop("_id", None)
    return o


def _public_order_for_buyer(o: dict) -> dict:
    # Remove internal fields not needed by buyer
    safe = _serialize_order(dict(o))
    return safe


@api.post("/orders")
async def create_order(payload: CreateOrderPayload):
    pkg = payload.package_id.lower()
    revisions_allowed = PACKAGE_REVISIONS.get(pkg, 0)
    order = {
        "code": gen_order_code(),
        "tracking_token": gen_tracking_token(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "status": "pending_review",
        "buyer_name": payload.buyer_name.strip(),
        "buyer_whatsapp": re.sub(r"\D", "", payload.buyer_whatsapp),
        "buyer_business": payload.buyer_business.strip(),
        "buyer_brief": payload.buyer_brief.strip(),
        "package_id": payload.package_id,
        "package_name": payload.package_name,
        "duration_choice": payload.duration_choice,
        "package_setup_price": payload.package_setup_price,
        "package_domain_price": payload.package_domain_price,
        "proposed_days": None,
        "proposed_at": None,
        "proposal_note": None,
        "negotiated_days": None,
        "negotiation_reason": None,
        "negotiated_at": None,
        "accepted_days": None,
        "reject_reason": None,
        "rejected_at": None,
        "started_at": None,
        "expected_finish_at": None,
        "delivered_url": None,
        "delivered_at": None,
        "delivery_notes": None,
        "delivery_history": [],
        "revisions_allowed": revisions_allowed,
        "revisions_used": 0,
        "revision_requests": [],
        "messages": [],
        "finished_at": None,
        "review_rating": None,
        "review_message": None,
        "review_at": None,
        "review_visible": True,
    }
    await db.orders.insert_one(order)
    return {
        "code": order["code"],
        "tracking_token": order["tracking_token"],
        "status": order["status"],
    }


# ---- Buyer endpoints (public, tracked by token) ----
async def _get_by_token(token: str) -> dict:
    o = await db.orders.find_one({"tracking_token": token})
    if not o:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    return o


@api.get("/orders/track/{token}")
async def track_order(token: str):
    o = await _get_by_token(token)
    return _public_order_for_buyer(o)


@api.post("/orders/track/{token}/accept")
async def buyer_accept(token: str):
    o = await _get_by_token(token)
    if o["status"] not in ("awaiting_buyer", "negotiating"):
        raise HTTPException(status_code=400, detail="Order tidak dalam status yang bisa di-accept.")
    days = o["proposed_days"]
    if o["status"] == "negotiating":
        # Buyer accepting their own previous proposal makes no sense; ignore
        raise HTTPException(status_code=400, detail="Order sedang menunggu keputusan seller.")
    started = datetime.now(timezone.utc)
    expected = started + timedelta(days=days)
    update = {
        "status": "in_progress",
        "accepted_days": days,
        "started_at": started.isoformat(),
        "expected_finish_at": expected.isoformat(),
        "updated_at": now_iso(),
    }
    await db.orders.update_one({"tracking_token": token}, {"$set": update})
    return _public_order_for_buyer(await _get_by_token(token))


@api.post("/orders/track/{token}/negotiate")
async def buyer_negotiate(token: str, payload: NegotiatePayload):
    o = await _get_by_token(token)
    if o["status"] != "awaiting_buyer":
        raise HTTPException(status_code=400, detail="Status order tidak memungkinkan negosiasi sekarang.")
    update = {
        "status": "negotiating",
        "negotiated_days": payload.negotiated_days,
        "negotiation_reason": payload.reason.strip(),
        "negotiated_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.orders.update_one({"tracking_token": token}, {"$set": update})
    return _public_order_for_buyer(await _get_by_token(token))


@api.post("/orders/track/{token}/request-revision")
async def buyer_request_revision(token: str, payload: RevisionPayload):
    o = await _get_by_token(token)
    if o["status"] != "delivered":
        raise HTTPException(status_code=400, detail="Revisi hanya bisa diminta saat status 'delivered'.")
    if o["revisions_used"] >= o["revisions_allowed"]:
        raise HTTPException(status_code=400, detail="Jatah revisi sudah habis untuk paket ini.")
    req = {
        "at": now_iso(),
        "message": payload.message.strip(),
        "resolved_at": None,
        "resolution_url": None,
        "resolution_notes": None,
    }
    await db.orders.update_one(
        {"tracking_token": token},
        {
            "$set": {"status": "revision_requested", "updated_at": now_iso()},
            "$push": {"revision_requests": req},
            "$inc": {"revisions_used": 1},
        },
    )
    return _public_order_for_buyer(await _get_by_token(token))


@api.post("/orders/track/{token}/finish")
async def buyer_finish(token: str):
    o = await _get_by_token(token)
    if o["status"] != "delivered":
        raise HTTPException(status_code=400, detail="Order belum siap untuk diselesaikan.")
    await db.orders.update_one(
        {"tracking_token": token},
        {"$set": {"status": "completed", "finished_at": now_iso(), "updated_at": now_iso()}},
    )
    return _public_order_for_buyer(await _get_by_token(token))


@api.post("/orders/track/{token}/review")
async def buyer_review(token: str, payload: ReviewPayload):
    o = await _get_by_token(token)
    if o["status"] != "completed":
        raise HTTPException(status_code=400, detail="Review hanya bisa diberikan setelah order completed.")
    await db.orders.update_one(
        {"tracking_token": token},
        {
            "$set": {
                "review_rating": payload.rating,
                "review_message": payload.message.strip(),
                "review_at": now_iso(),
                "updated_at": now_iso(),
            }
        },
    )
    return _public_order_for_buyer(await _get_by_token(token))


@api.post("/orders/track/{token}/message")
async def buyer_message(token: str, payload: MessagePayload):
    o = await _get_by_token(token)
    msg = {"at": now_iso(), "by": "buyer", "text": payload.text.strip()}
    await db.orders.update_one(
        {"tracking_token": token},
        {"$push": {"messages": msg}, "$set": {"updated_at": now_iso()}},
    )
    return _public_order_for_buyer(await _get_by_token(token))


# ---- Seller endpoints (require admin) ----
@api.get("/admin/orders")
async def list_orders(admin: dict = Depends(require_admin)):
    cursor = db.orders.find({}).sort("created_at", -1)
    items = []
    async for o in cursor:
        items.append(_serialize_order(o))
    return items


@api.get("/admin/orders/{code}")
async def get_order(code: str, admin: dict = Depends(require_admin)):
    o = await db.orders.find_one({"code": code})
    if not o:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    return _serialize_order(o)


@api.post("/admin/orders/{code}/propose")
async def seller_propose(code: str, payload: ProposeDaysPayload, admin: dict = Depends(require_admin)):
    o = await db.orders.find_one({"code": code})
    if not o:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    if o["status"] not in ("pending_review", "negotiating"):
        raise HTTPException(status_code=400, detail="Status tidak memungkinkan untuk mengajukan durasi.")
    await db.orders.update_one(
        {"code": code},
        {
            "$set": {
                "status": "awaiting_buyer",
                "proposed_days": payload.proposed_days,
                "proposed_at": now_iso(),
                "proposal_note": (payload.note or "").strip(),
                "updated_at": now_iso(),
            }
        },
    )
    return _serialize_order(await db.orders.find_one({"code": code}))


@api.post("/admin/orders/{code}/accept-negotiation")
async def seller_accept_negotiation(code: str, admin: dict = Depends(require_admin)):
    o = await db.orders.find_one({"code": code})
    if not o:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    if o["status"] != "negotiating":
        raise HTTPException(status_code=400, detail="Tidak ada negosiasi aktif.")
    days = o["negotiated_days"]
    started = datetime.now(timezone.utc)
    expected = started + timedelta(days=days)
    await db.orders.update_one(
        {"code": code},
        {
            "$set": {
                "status": "in_progress",
                "accepted_days": days,
                "started_at": started.isoformat(),
                "expected_finish_at": expected.isoformat(),
                "updated_at": now_iso(),
            }
        },
    )
    return _serialize_order(await db.orders.find_one({"code": code}))


@api.post("/admin/orders/{code}/reject")
async def seller_reject(code: str, payload: RejectPayload, admin: dict = Depends(require_admin)):
    o = await db.orders.find_one({"code": code})
    if not o:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    if o["status"] in ("completed", "cancelled", "rejected"):
        raise HTTPException(status_code=400, detail="Order sudah final, tidak bisa di-reject.")
    await db.orders.update_one(
        {"code": code},
        {
            "$set": {
                "status": "rejected",
                "reject_reason": payload.reason.strip(),
                "rejected_at": now_iso(),
                "updated_at": now_iso(),
            }
        },
    )
    return _serialize_order(await db.orders.find_one({"code": code}))


@api.post("/admin/orders/{code}/deliver")
async def seller_deliver(code: str, payload: DeliverPayload, admin: dict = Depends(require_admin)):
    o = await db.orders.find_one({"code": code})
    if not o:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    if o["status"] not in ("in_progress", "revision_requested"):
        raise HTTPException(status_code=400, detail="Order tidak dalam status untuk delivery.")
    entry = {
        "at": now_iso(),
        "url": payload.url.strip(),
        "notes": (payload.notes or "").strip(),
        "is_revision": o["status"] == "revision_requested",
    }
    # If revision, mark last revision as resolved
    update_doc = {
        "$set": {
            "status": "delivered",
            "delivered_url": payload.url.strip(),
            "delivered_at": now_iso(),
            "delivery_notes": (payload.notes or "").strip(),
            "updated_at": now_iso(),
        },
        "$push": {"delivery_history": entry},
    }
    await db.orders.update_one({"code": code}, update_doc)
    if o["status"] == "revision_requested" and o.get("revision_requests"):
        idx = len(o["revision_requests"]) - 1
        await db.orders.update_one(
            {"code": code},
            {
                "$set": {
                    f"revision_requests.{idx}.resolved_at": now_iso(),
                    f"revision_requests.{idx}.resolution_url": payload.url.strip(),
                    f"revision_requests.{idx}.resolution_notes": (payload.notes or "").strip(),
                }
            },
        )
    return _serialize_order(await db.orders.find_one({"code": code}))


@api.post("/admin/orders/{code}/message")
async def seller_message(code: str, payload: MessagePayload, admin: dict = Depends(require_admin)):
    o = await db.orders.find_one({"code": code})
    if not o:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    msg = {"at": now_iso(), "by": "seller", "text": payload.text.strip()}
    await db.orders.update_one(
        {"code": code}, {"$push": {"messages": msg}, "$set": {"updated_at": now_iso()}}
    )
    return _serialize_order(await db.orders.find_one({"code": code}))


@api.post("/admin/orders/{code}/toggle-review-visibility")
async def seller_toggle_review(code: str, payload: ToggleReviewVisibilityPayload, admin: dict = Depends(require_admin)):
    o = await db.orders.find_one({"code": code})
    if not o:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    await db.orders.update_one(
        {"code": code},
        {"$set": {"review_visible": bool(payload.visible), "updated_at": now_iso()}},
    )
    return _serialize_order(await db.orders.find_one({"code": code}))


@api.delete("/admin/orders/{code}")
async def seller_delete(code: str, admin: dict = Depends(require_admin)):
    res = await db.orders.delete_one({"code": code})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    return {"ok": True}


# ---- Public reviews ----
@api.get("/reviews")
async def public_reviews():
    cursor = db.orders.find(
        {
            "status": "completed",
            "review_rating": {"$ne": None},
            "review_visible": {"$ne": False},
        }
    ).sort("review_at", -1).limit(24)
    items = []
    async for o in cursor:
        items.append(
            {
                "id": o["code"],
                "name": o.get("buyer_name", ""),
                "business": o.get("buyer_business", ""),
                "message": o.get("review_message", ""),
                "rating": o.get("review_rating", 5),
                "photo": "",
            }
        )
    return items


# ---------------- Startup ----------------
@app.on_event("startup")
async def startup_event():
    # Seed admin
    email = (os.environ.get("SEED_ADMIN_EMAIL") or "admin@website.id").lower().strip()
    pin = os.environ.get("SEED_ADMIN_PIN") or "503625"
    existing = await db.admins.find_one({"email": email})
    if existing is None:
        await db.admins.insert_one(
            {
                "email": email,
                "pin_hash": hash_pin(pin),
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
        )
        logger.info(f"Seeded admin user: {email}")
    # Indexes
    await db.admins.create_index("email", unique=True)
    await db.orders.create_index("code", unique=True)
    await db.orders.create_index("tracking_token", unique=True)
    await db.orders.create_index([("created_at", -1)])


@app.on_event("shutdown")
async def shutdown_event():
    client.close()


# ---------------- Health ----------------
@api.get("/")
async def root():
    return {"message": "TokoKu API ready"}


# Include router & CORS
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

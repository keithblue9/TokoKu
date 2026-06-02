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


# Granular permissions used to gate admin endpoints.
ALL_PERMISSIONS = [
    "view_orders",
    "update_order_status",
    "verify_payment",
    "view_finance_report",
    "manage_team",
    "manage_content",
]
OWNER_ONLY_PERMISSIONS = {"view_finance_report", "manage_team", "manage_content"}
ROLE_DEFAULT_PERMISSIONS = {
    "owner": list(ALL_PERMISSIONS),
    "staff_ops": ["view_orders", "update_order_status"],
    "staff_finance": ["view_orders", "verify_payment"],
}


def effective_permissions(admin_doc: dict) -> List[str]:
    """Owner always has full access; staff use explicit `permissions` list."""
    if admin_doc.get("role") == "owner":
        return list(ALL_PERMISSIONS)
    return list(admin_doc.get("permissions") or [])


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
        if admin.get("active") is False:
            raise HTTPException(status_code=403, detail="Akun kamu telah dinonaktifkan oleh owner.")
        return {
            "email": admin["email"],
            "name": admin.get("name", admin["email"]),
            "role": admin.get("role", "owner"),
            "permissions": effective_permissions(admin),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi habis. Silakan login ulang.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid.")


def require_permission(perm: str):
    """Dependency factory that enforces an admin has the given permission."""
    async def _dep(authorization: Optional[str] = Header(default=None)) -> dict:
        admin = await require_admin(authorization)
        if perm not in admin.get("permissions", []):
            raise HTTPException(
                status_code=403,
                detail="Akses ditolak. Akun kamu tidak punya izin untuk aksi ini.",
            )
        return admin
    return _dep


async def require_owner_dep(authorization: Optional[str] = Header(default=None)) -> dict:
    admin = await require_admin(authorization)
    if admin.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Hanya pemilik akun (owner) yang bisa mengakses fitur ini.")
    return admin


async def log_action(admin: dict, action: str, target_type: str = "", target_id: str = "", details: str = ""):
    """Append an audit log entry. Failure is logged but never blocks the request."""
    try:
        await db.audit_log.insert_one({
            "at": now_iso(),
            "admin_email": admin.get("email"),
            "admin_name": admin.get("name"),
            "admin_role": admin.get("role"),
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details,
        })
    except Exception as exc:
        logger.warning("Failed to write audit log: %s", exc)


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
    name: str = ""
    role: str = "owner"
    permissions: List[str] = []


class TeamMemberCreate(BaseModel):
    email: EmailStr
    pin: str = Field(min_length=6, max_length=6)
    name: str = Field(min_length=2, max_length=100)
    role: Literal["owner", "staff_ops", "staff_finance"] = "staff_ops"
    permissions: Optional[List[str]] = None


class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["owner", "staff_ops", "staff_finance"]] = None
    active: Optional[bool] = None
    reset_pin: Optional[str] = None  # if provided, sets new PIN
    permissions: Optional[List[str]] = None


class TermsPayload(BaseModel):
    content: str = Field(min_length=10)


class OrderVisitsPayload(BaseModel):
    monthly_visits: int = Field(ge=0)


# ---------------- Auth endpoints ----------------
@api.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginPayload):
    email = payload.email.lower().strip()
    admin = await db.admins.find_one({"email": email})
    if not admin or not verify_pin(payload.pin, admin["pin_hash"]):
        raise HTTPException(status_code=401, detail="Email atau PIN salah.")
    if admin.get("active") is False:
        raise HTTPException(status_code=403, detail="Akun kamu telah dinonaktifkan.")
    role = admin.get("role", "owner")
    name = admin.get("name", email)
    perms = effective_permissions(admin)
    return LoginResponse(token=create_access_token(email), email=email, name=name, role=role, permissions=perms)


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
    payment_mode: Literal["dp", "full"] = "dp"
    agreed_to_terms: bool = False


class PaymentSubmitPayload(BaseModel):
    kind: Literal["dp", "full", "settlement"]
    amount: int = Field(ge=1000)
    method: Literal["qris", "bank_transfer", "ewallet"] = "bank_transfer"
    proof_image: str = Field(min_length=20)  # base64 data URL
    note: Optional[str] = ""


class PaymentVerifyPayload(BaseModel):
    payment_id: str
    verified: bool
    rejection_reason: Optional[str] = ""


class PaymentSettingsPayload(BaseModel):
    dp_percent: int = Field(ge=10, le=100, default=50)
    bank_name: str = ""
    bank_account_number: str = ""
    bank_account_holder: str = ""
    qris_image: str = ""  # base64 data URL
    qris_merchant_name: str = ""
    ewallet_info: str = ""  # free text e.g. "GoPay: 0812xxx (Nama)"
    payment_instructions: str = ""


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
    if not payload.agreed_to_terms:
        raise HTTPException(status_code=400, detail="Anda harus menyetujui syarat & ketentuan untuk membuat order.")
    pkg = payload.package_id.lower()
    revisions_allowed = PACKAGE_REVISIONS.get(pkg, 0)
    # Compute payment amounts
    settings = await _get_settings()
    dp_percent = settings.get("dp_percent", 50)
    domain_year = payload.package_domain_price
    if payload.duration_choice == "monthly":
        domain_year = payload.package_domain_price * 12
    elif payload.duration_choice == "twoYear":
        # treat as price per 2yr; for total first period we still bill the chosen domain price
        domain_year = payload.package_domain_price
    total_amount = payload.package_setup_price + domain_year
    dp_amount = int(round(total_amount * dp_percent / 100))
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
        # Payment
        "payment_mode": payload.payment_mode,
        "dp_percent": dp_percent,
        "total_amount": total_amount,
        "dp_amount": dp_amount,
        "settlement_amount": total_amount - dp_amount,
        "payments": [],
        "amount_paid": 0,
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
        "monthly_visits": 0,
        "agreed_to_terms_at": now_iso(),
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
    if o["status"] not in ("awaiting_buyer",):
        raise HTTPException(status_code=400, detail="Order tidak dalam status yang bisa di-accept.")
    days = o["proposed_days"]
    update = {
        "status": "awaiting_payment",
        "accepted_days": days,
        "updated_at": now_iso(),
    }
    await db.orders.update_one({"tracking_token": token}, {"$set": update})
    return _public_order_for_buyer(await _get_by_token(token))


# ---- Payment endpoints (buyer submit) ----
def _expected_payment_for(o: dict) -> tuple:
    """Return (kind, amount_due) the buyer should pay right now."""
    if o["status"] == "awaiting_payment":
        kind = "dp" if o.get("payment_mode") == "dp" else "full"
        amt = o.get("dp_amount") if kind == "dp" else o.get("total_amount")
        return kind, amt
    if o["status"] == "awaiting_settlement":
        return "settlement", o.get("settlement_amount", 0)
    return None, 0


@api.post("/orders/track/{token}/payment")
async def buyer_submit_payment(token: str, payload: PaymentSubmitPayload):
    o = await _get_by_token(token)
    if o["status"] not in ("awaiting_payment", "awaiting_settlement"):
        raise HTTPException(status_code=400, detail="Status order tidak memungkinkan submit pembayaran.")
    exp_kind, exp_amt = _expected_payment_for(o)
    if payload.kind != exp_kind:
        raise HTTPException(status_code=400, detail=f"Jenis pembayaran salah. Seharusnya {exp_kind}.")
    if payload.amount < int(exp_amt * 0.95):
        raise HTTPException(status_code=400, detail=f"Nominal kurang dari yang seharusnya (Rp {exp_amt:,}).")
    payment = {
        "id": secrets.token_urlsafe(8),
        "kind": payload.kind,
        "amount": payload.amount,
        "method": payload.method,
        "proof_image": payload.proof_image,
        "note": (payload.note or "").strip(),
        "status": "pending",
        "submitted_at": now_iso(),
        "verified_at": None,
        "rejection_reason": None,
    }
    new_status = "payment_review" if payload.kind in ("dp", "full") else "settlement_review"
    await db.orders.update_one(
        {"tracking_token": token},
        {
            "$push": {"payments": payment},
            "$set": {"status": new_status, "updated_at": now_iso()},
        },
    )
    return _public_order_for_buyer(await _get_by_token(token))


@api.post("/orders/track/{token}/request-finish")
async def buyer_request_finish(token: str):
    """Buyer ready to finalize. For full-paid orders, immediately complete.
    For DP orders, move to awaiting_settlement so they can pay the rest."""
    o = await _get_by_token(token)
    if o["status"] != "delivered":
        raise HTTPException(status_code=400, detail="Order belum siap untuk diselesaikan.")
    if o.get("payment_mode") == "full":
        await db.orders.update_one(
            {"tracking_token": token},
            {"$set": {"status": "completed", "finished_at": now_iso(), "updated_at": now_iso()}},
        )
    else:
        await db.orders.update_one(
            {"tracking_token": token},
            {"$set": {"status": "awaiting_settlement", "updated_at": now_iso()}},
        )
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
    # Backward-compatible alias: delegates to request-finish
    return await buyer_request_finish(token)


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
    await _get_by_token(token)
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
    await db.orders.update_one(
        {"code": code},
        {
            "$set": {
                "status": "awaiting_payment",
                "accepted_days": days,
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


# ---- Seller: payment verification ----
def _build_verify_accept_update(order: dict, payment: dict, idx: int) -> dict:
    """Build the $set update doc for an ACCEPTED payment verification."""
    new_amount_paid = order.get("amount_paid", 0) + payment["amount"]
    update_set = {
        f"payments.{idx}.status": "verified",
        f"payments.{idx}.verified_at": now_iso(),
        "amount_paid": new_amount_paid,
        "updated_at": now_iso(),
    }
    if payment["kind"] in ("dp", "full"):
        started = datetime.now(timezone.utc)
        expected = started + timedelta(days=order.get("accepted_days") or 5)
        update_set["status"] = "in_progress"
        update_set["started_at"] = started.isoformat()
        update_set["expected_finish_at"] = expected.isoformat()
    elif payment["kind"] == "settlement":
        update_set["status"] = "completed"
        update_set["finished_at"] = now_iso()
    return update_set


def _build_verify_reject_update(payment: dict, idx: int, reason: str) -> dict:
    """Build the $set update doc for a REJECTED payment verification."""
    revert_status = "awaiting_payment" if payment["kind"] in ("dp", "full") else "awaiting_settlement"
    return {
        f"payments.{idx}.status": "rejected",
        f"payments.{idx}.rejection_reason": reason.strip() or "Bukti pembayaran tidak valid.",
        f"payments.{idx}.verified_at": now_iso(),
        "status": revert_status,
        "updated_at": now_iso(),
    }


@api.post("/admin/orders/{code}/verify-payment")
async def seller_verify_payment(code: str, payload: PaymentVerifyPayload, admin: dict = Depends(require_admin)):
    o = await db.orders.find_one({"code": code})
    if not o:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    if o["status"] not in ("payment_review", "settlement_review"):
        raise HTTPException(status_code=400, detail="Tidak ada pembayaran yang perlu di-verify.")
    payments = o.get("payments", [])
    idx = next((i for i, p in enumerate(payments) if p["id"] == payload.payment_id), -1)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan.")
    p = payments[idx]
    if p["status"] != "pending":
        raise HTTPException(status_code=400, detail="Pembayaran ini sudah pernah diverifikasi.")

    if payload.verified:
        update_set = _build_verify_accept_update(o, p, idx)
    else:
        update_set = _build_verify_reject_update(p, idx, payload.rejection_reason or "")
    await db.orders.update_one({"code": code}, {"$set": update_set})
    return _serialize_order(await db.orders.find_one({"code": code}))


# ---------------- Settings ----------------
DEFAULT_SETTINGS = {
    "key": "payment",
    "dp_percent": 50,
    "bank_name": "",
    "bank_account_number": "",
    "bank_account_holder": "",
    "qris_image": "",
    "qris_merchant_name": "",
    "ewallet_info": "",
    "payment_instructions": "Mohon transfer sesuai nominal dan cantumkan KODE ORDER di berita transfer. Setelah transfer, upload bukti di halaman ini.",
}


async def _get_settings() -> dict:
    s = await db.settings.find_one({"key": "payment"})
    if not s:
        await db.settings.insert_one(dict(DEFAULT_SETTINGS))
        s = dict(DEFAULT_SETTINGS)
    s.pop("_id", None)
    return s


@api.get("/settings/payment")
async def get_payment_settings_public():
    """Public: returns payment info needed by buyer (bank, QRIS, etc.) but not internal stuff."""
    s = await _get_settings()
    return {
        "dp_percent": s.get("dp_percent", 50),
        "bank_name": s.get("bank_name", ""),
        "bank_account_number": s.get("bank_account_number", ""),
        "bank_account_holder": s.get("bank_account_holder", ""),
        "qris_image": s.get("qris_image", ""),
        "qris_merchant_name": s.get("qris_merchant_name", ""),
        "ewallet_info": s.get("ewallet_info", ""),
        "payment_instructions": s.get("payment_instructions", ""),
    }


@api.get("/admin/settings/payment")
async def get_payment_settings_admin(admin: dict = Depends(require_admin)):
    return await _get_settings()


@api.put("/admin/settings/payment")
async def update_payment_settings(payload: PaymentSettingsPayload, admin: dict = Depends(require_admin)):
    update = payload.model_dump()
    update["key"] = "payment"
    update["updated_at"] = now_iso()
    await db.settings.update_one({"key": "payment"}, {"$set": update}, upsert=True)
    await log_action(admin, "update_payment_settings", "settings", "payment")
    return await _get_settings()


# ---- Terms & Conditions ----
DEFAULT_TERMS = (
    "SYARAT DAN KETENTUAN KERJASAMA\n\n"
    "Dengan menyetujui ini, Anda (selanjutnya disebut 'Klien') menyatakan telah membaca dan menyetujui ketentuan kerjasama berikut:\n\n"
    "1. LINGKUP PEKERJAAN\n"
    "Kami menyediakan jasa pembuatan website toko online sesuai paket yang dipilih. Fitur yang termasuk telah tercantum di halaman paket dan tidak bisa ditambah di luar lingkup tanpa kesepakatan baru.\n\n"
    "2. WAKTU PENGERJAAN\n"
    "Durasi pengerjaan dihitung dalam hari kerja, dimulai sejak DP (atau pembayaran penuh) diterima dan diverifikasi. Hari libur nasional dan akhir pekan tidak dihitung.\n\n"
    "3. PEMBAYARAN\n"
    "a. Klien dapat memilih DP (sesuai persentase yang berlaku) atau pembayaran penuh di awal.\n"
    "b. Pengerjaan baru dimulai setelah pembayaran terverifikasi.\n"
    "c. Untuk skema DP, pelunasan wajib dilakukan sebelum status order ditandai selesai.\n"
    "d. Pembayaran yang sudah masuk tidak dapat dikembalikan kecuali pekerjaan belum dimulai.\n\n"
    "4. REVISI\n"
    "Jatah revisi mengikuti paket: Basic 0×, Growth 1×, Pro 2×. Revisi di luar jatah dikenakan biaya tambahan sesuai kesepakatan.\n\n"
    "5. ASET & KONTEN\n"
    "Klien wajib menyediakan konten (logo, foto produk, deskripsi) dalam kualitas yang layak. Keterlambatan menyerahkan konten akan memperpanjang durasi pengerjaan.\n\n"
    "6. DOMAIN & HOSTING\n"
    "Domain didaftarkan atas nama Klien dan diperpanjang per periode yang dipilih. Setelah masa aktif berakhir dan tidak diperpanjang, data tetap kami simpan selama 6 bulan sebelum dihapus permanen.\n\n"
    "7. HAK CIPTA\n"
    "Setelah pelunasan, hak penggunaan website penuh menjadi milik Klien. Kami berhak menampilkan hasil kerja di portofolio kami kecuali Klien meminta sebaliknya secara tertulis.\n\n"
    "8. KERAHASIAAN\n"
    "Kedua belah pihak sepakat menjaga kerahasiaan informasi bisnis yang dipertukarkan selama kerjasama berlangsung.\n\n"
    "9. KOMUNIKASI\n"
    "Seluruh komunikasi resmi dilakukan melalui halaman tracking order dan WhatsApp yang terdaftar. Kesalahan informasi dari nomor lain bukan tanggung jawab kami.\n\n"
    "Dengan mencentang 'Saya menyetujui', Klien dianggap sah menyetujui seluruh poin di atas."
)


@api.get("/settings/terms")
async def get_terms_public():
    s = await db.settings.find_one({"key": "terms"})
    if not s:
        return {"content": DEFAULT_TERMS}
    return {"content": s.get("content", DEFAULT_TERMS)}


@api.put("/admin/settings/terms")
async def update_terms(payload: TermsPayload, admin: dict = Depends(require_owner_dep)):
    await db.settings.update_one(
        {"key": "terms"},
        {"$set": {"key": "terms", "content": payload.content, "updated_at": now_iso()}},
        upsert=True,
    )
    await log_action(admin, "update_terms", "settings", "terms")
    return {"content": payload.content}


# ---- Team Management (owner only) ----
def _sanitize_permissions(role: str, perms: Optional[List[str]]) -> List[str]:
    """Validate & clamp permissions list. Owner = all. Staff cannot hold owner-only perms."""
    if role == "owner":
        return list(ALL_PERMISSIONS)
    if perms is None:
        return list(ROLE_DEFAULT_PERMISSIONS.get(role, []))
    cleaned = []
    for p in perms:
        if p not in ALL_PERMISSIONS:
            continue
        if p in OWNER_ONLY_PERMISSIONS:
            continue  # staff cannot have owner-only perms
        cleaned.append(p)
    # dedupe & preserve canonical order
    return [p for p in ALL_PERMISSIONS if p in set(cleaned)]


def _serialize_admin(a: dict) -> dict:
    if not a:
        return a
    return {
        "email": a.get("email"),
        "name": a.get("name", ""),
        "role": a.get("role", "staff_ops"),
        "active": a.get("active", True),
        "permissions": effective_permissions(a),
        "created_at": a.get("created_at"),
        "updated_at": a.get("updated_at"),
    }


@api.get("/admin/team")
async def list_team(admin: dict = Depends(require_owner_dep)):
    items = []
    async for a in db.admins.find({}).sort("created_at", 1):
        items.append(_serialize_admin(a))
    return items


@api.post("/admin/team")
async def add_team_member(payload: TeamMemberCreate, admin: dict = Depends(require_owner_dep)):
    if not re.fullmatch(r"\d{6}", payload.pin):
        raise HTTPException(status_code=400, detail="PIN harus 6 digit angka.")
    email = payload.email.lower().strip()
    if await db.admins.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar.")
    doc = {
        "email": email,
        "name": payload.name.strip(),
        "role": payload.role,
        "active": True,
        "pin_hash": hash_pin(payload.pin),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.admins.insert_one(doc)
    await log_action(admin, "team_add", "admin", email, f"role={payload.role}")
    return _serialize_admin(doc)


@api.put("/admin/team/{email}")
async def update_team_member(email: str, payload: TeamMemberUpdate, admin: dict = Depends(require_owner_dep)):
    email = email.lower().strip()
    target = await db.admins.find_one({"email": email})
    if not target:
        raise HTTPException(status_code=404, detail="Anggota tim tidak ditemukan.")
    update = {}
    if payload.name is not None:
        update["name"] = payload.name.strip()
    if payload.role is not None:
        # Prevent demoting the only owner
        if target.get("role") == "owner" and payload.role != "owner":
            count_owners = await db.admins.count_documents({"role": "owner", "active": True})
            if count_owners <= 1:
                raise HTTPException(status_code=400, detail="Tidak bisa menurunkan owner terakhir.")
        update["role"] = payload.role
    if payload.active is not None:
        if target["email"] == admin["email"] and not payload.active:
            raise HTTPException(status_code=400, detail="Tidak bisa menonaktifkan akun sendiri.")
        update["active"] = payload.active
    if payload.reset_pin:
        if not re.fullmatch(r"\d{6}", payload.reset_pin):
            raise HTTPException(status_code=400, detail="PIN harus 6 digit angka.")
        update["pin_hash"] = hash_pin(payload.reset_pin)
    if not update:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan.")
    update["updated_at"] = now_iso()
    await db.admins.update_one({"email": email}, {"$set": update})
    await log_action(admin, "team_update", "admin", email, ", ".join(k for k in update if k != "updated_at"))
    return _serialize_admin(await db.admins.find_one({"email": email}))


@api.delete("/admin/team/{email}")
async def delete_team_member(email: str, admin: dict = Depends(require_owner_dep)):
    email = email.lower().strip()
    if email == admin["email"]:
        raise HTTPException(status_code=400, detail="Tidak bisa hapus akun sendiri.")
    target = await db.admins.find_one({"email": email})
    if not target:
        raise HTTPException(status_code=404, detail="Anggota tim tidak ditemukan.")
    if target.get("role") == "owner":
        count_owners = await db.admins.count_documents({"role": "owner"})
        if count_owners <= 1:
            raise HTTPException(status_code=400, detail="Tidak bisa menghapus owner terakhir.")
    await db.admins.delete_one({"email": email})
    await log_action(admin, "team_delete", "admin", email)
    return {"ok": True}


# ---- Activity / Audit log (owner only) ----
@api.get("/admin/activity")
async def list_activity(limit: int = 200, admin: dict = Depends(require_owner_dep)):
    cursor = db.audit_log.find({}).sort("at", -1).limit(min(limit, 500))
    items = []
    async for entry in cursor:
        entry.pop("_id", None)
        items.append(entry)
    return items


# ---- Order: update monthly visits (analytics) ----
@api.put("/admin/orders/{code}/visits")
async def update_order_visits(code: str, payload: OrderVisitsPayload, admin: dict = Depends(require_admin)):
    res = await db.orders.update_one(
        {"code": code},
        {"$set": {"monthly_visits": payload.monthly_visits, "updated_at": now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan.")
    await log_action(admin, "update_visits", "order", code, f"visits={payload.monthly_visits}")
    return _serialize_order(await db.orders.find_one({"code": code}))


# ---- Smart analytics for seller dashboard ----
def _months_for_duration(duration: str) -> int:
    return {"monthly": 1, "yearly": 12, "twoYear": 24}.get(duration, 12)


@api.get("/admin/analytics/dashboard")
async def analytics_dashboard(reminder_days: int = 30, admin: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)

    expiring = []
    top_traffic = []
    package_counts = {}
    revenue_total = 0
    revenue_month = 0
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    async for o in db.orders.find({}):
        # Domain expiry: if completed and has finished_at, compute expires_at
        if o.get("status") == "completed" and o.get("finished_at"):
            try:
                start = datetime.fromisoformat(o["finished_at"].replace("Z", "+00:00"))
                months = _months_for_duration(o.get("duration_choice", "yearly"))
                # Approximate month = 30 days for simplicity
                expires = start + timedelta(days=months * 30)
                days_left = (expires - now).days
                if days_left <= reminder_days:
                    expiring.append({
                        "code": o["code"],
                        "business": o.get("buyer_business", ""),
                        "buyer_name": o.get("buyer_name", ""),
                        "buyer_whatsapp": o.get("buyer_whatsapp", ""),
                        "expires_at": expires.isoformat(),
                        "days_left": days_left,
                        "package_name": o.get("package_name", ""),
                    })
            except Exception:
                pass

        # Top traffic
        if o.get("status") == "completed" and (o.get("monthly_visits") or 0) > 0:
            top_traffic.append({
                "code": o["code"],
                "business": o.get("buyer_business", ""),
                "buyer_name": o.get("buyer_name", ""),
                "buyer_whatsapp": o.get("buyer_whatsapp", ""),
                "monthly_visits": o.get("monthly_visits", 0),
                "package_name": o.get("package_name", ""),
            })

        # Package distribution (any non-rejected/non-cancelled)
        if o.get("status") not in ("rejected", "cancelled"):
            pid = o.get("package_id", "unknown")
            package_counts[pid] = package_counts.get(pid, 0) + 1

        # Revenue from verified payments
        for p in o.get("payments", []):
            if p.get("status") == "verified":
                revenue_total += p.get("amount", 0)
                try:
                    if datetime.fromisoformat(p.get("verified_at", "").replace("Z", "+00:00")) >= month_start:
                        revenue_month += p.get("amount", 0)
                except Exception:
                    pass

    expiring.sort(key=lambda x: x["days_left"])
    top_traffic.sort(key=lambda x: -x["monthly_visits"])
    top_traffic = top_traffic[:5]

    # Strategy suggestions based on package distribution
    dominant = max(package_counts.items(), key=lambda kv: kv[1])[0] if package_counts else None
    strategy = ""
    if dominant == "basic":
        strategy = "Mayoritas klien pakai Basic. Buat campaign upgrade ke Growth dengan diskon perpanjang domain — biasanya konversi 25-35%."
    elif dominant == "growth":
        strategy = "Growth paling laku. Pertimbangkan bundling fitur Pro (analitik & notif WA) untuk klien Growth yang sudah ramai pengunjung."
    elif dominant == "pro":
        strategy = "Pro dominan = klien-mu profesional. Tawarkan layanan maintenance bulanan atau SEO add-on untuk recurring revenue."

    return {
        "expiring_domains": expiring,
        "top_traffic_clients": top_traffic,
        "package_distribution": package_counts,
        "package_strategy": strategy,
        "revenue_total": revenue_total,
        "revenue_this_month": revenue_month,
        "reminder_days": reminder_days,
    }


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
                "name": "Owner",
                "role": "owner",
                "active": True,
                "pin_hash": hash_pin(pin),
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
        )
        logger.info(f"Seeded admin user: {email}")
    else:
        # Backfill missing fields for legacy admin docs
        backfill = {}
        if "role" not in existing:
            backfill["role"] = "owner"
        if "active" not in existing:
            backfill["active"] = True
        if "name" not in existing:
            backfill["name"] = "Owner"
        if backfill:
            await db.admins.update_one({"email": email}, {"$set": backfill})
    # Indexes
    await db.admins.create_index("email", unique=True)
    await db.orders.create_index("code", unique=True)
    await db.orders.create_index("tracking_token", unique=True)
    await db.orders.create_index([("created_at", -1)])
    await db.settings.create_index("key", unique=True)
    # Ensure default payment settings exist
    await _get_settings()


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

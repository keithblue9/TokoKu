"""
Backend test suite for the NEW payment workflow on top of the order state machine.
Covers:
  - Public + admin /settings/payment endpoints
  - payment_mode 'dp' vs 'full' computation
  - awaiting_payment branch after buyer accept (NOT in_progress)
  - buyer payment submit (validation + happy path)
  - seller verify-payment accept + reject
  - DP settlement E2E (awaiting_settlement -> settlement_review -> completed)
  - Full payment E2E (no settlement step)
  - Backward-compat /finish alias
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@website.id"
ADMIN_PIN = "503625"
# 1x1 transparent PNG base64
SMALL_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "pin": ADMIN_PIN})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _create_order(session, payment_mode="dp", setup=200000, domain=300000, duration="yearly"):
    payload = {
        "buyer_name": "TEST Payment Buyer",
        "buyer_whatsapp": "081234567890",
        "buyer_business": "TEST Biz",
        "buyer_brief": "Saya butuh website untuk toko online saya",
        "package_id": "growth",
        "package_name": "Growth",
        "duration_choice": duration,
        "package_setup_price": setup,
        "package_domain_price": domain,
        "payment_mode": payment_mode,
        "agreed_to_terms": True,
    }
    r = session.post(f"{API}/orders", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def _track(session, token_):
    return session.get(f"{API}/orders/track/{token_}").json()


def _to_awaiting_payment(session, auth, payment_mode):
    o = _create_order(session, payment_mode=payment_mode)
    code, tt = o["code"], o["tracking_token"]
    r = session.post(f"{API}/admin/orders/{code}/propose",
                     json={"proposed_days": 7}, headers=auth)
    assert r.status_code == 200
    r = session.post(f"{API}/orders/track/{tt}/accept")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "awaiting_payment", f"Expected awaiting_payment, got {body['status']}"
    assert body["started_at"] is None
    return code, tt, body


# ---------- Settings ----------
class TestSettings:
    def test_public_get_returns_defaults(self, session):
        r = session.get(f"{API}/settings/payment")
        assert r.status_code == 200
        d = r.json()
        assert "dp_percent" in d
        assert d["dp_percent"] >= 10 and d["dp_percent"] <= 100

    def test_admin_get_requires_auth(self, session):
        r = session.get(f"{API}/admin/settings/payment")
        assert r.status_code == 401

    def test_admin_get_with_auth(self, session, auth):
        r = session.get(f"{API}/admin/settings/payment", headers=auth)
        assert r.status_code == 200
        assert "dp_percent" in r.json()

    def test_admin_put_persists(self, session, auth):
        new_settings = {
            "dp_percent": 50,
            "bank_name": "BCA",
            "bank_account_number": "1234567890",
            "bank_account_holder": "Test Owner",
            "qris_image": "",
            "qris_merchant_name": "TokoKu Test",
            "ewallet_info": "GoPay: 0812-0000-0000 (Test)",
            "payment_instructions": "Transfer sesuai nominal dan upload bukti.",
        }
        r = session.put(f"{API}/admin/settings/payment", json=new_settings, headers=auth)
        assert r.status_code == 200, r.text
        # Verify via public endpoint
        r2 = session.get(f"{API}/settings/payment")
        d = r2.json()
        assert d["bank_name"] == "BCA"
        assert d["bank_account_number"] == "1234567890"
        assert d["bank_account_holder"] == "Test Owner"
        assert d["dp_percent"] == 50


# ---------- Order creation with payment fields ----------
class TestOrderPaymentFields:
    def test_dp_amounts_computed_yearly(self, session, auth):
        # ensure dp_percent=50 set
        session.put(f"{API}/admin/settings/payment", json={
            "dp_percent": 50, "bank_name": "BCA", "bank_account_number": "1234567890",
            "bank_account_holder": "Test", "qris_image": "", "qris_merchant_name": "",
            "ewallet_info": "", "payment_instructions": "x"
        }, headers=auth)
        o = _create_order(session, payment_mode="dp", setup=200_000, domain=300_000, duration="yearly")
        full = session.get(f"{API}/orders/track/{o['tracking_token']}").json()
        assert full["total_amount"] == 500_000
        assert full["dp_amount"] == 250_000
        assert full["settlement_amount"] == 250_000
        assert full["payment_mode"] == "dp"
        session.delete(f"{API}/admin/orders/{o['code']}", headers=auth)

    def test_full_payment_mode(self, session, auth):
        o = _create_order(session, payment_mode="full", setup=100_000, domain=200_000, duration="yearly")
        full = session.get(f"{API}/orders/track/{o['tracking_token']}").json()
        assert full["total_amount"] == 300_000
        assert full["payment_mode"] == "full"
        session.delete(f"{API}/admin/orders/{o['code']}", headers=auth)

    def test_default_mode_is_dp(self, session, auth):
        payload = {
            "buyer_name": "TEST Default Mode",
            "buyer_whatsapp": "081234567890",
            "buyer_business": "Biz",
            "buyer_brief": "Saya butuh website untuk toko online",
            "package_id": "growth",
            "package_name": "Growth",
            "package_setup_price": 100_000,
            "package_domain_price": 100_000,
            "agreed_to_terms": True,
        }
        r = session.post(f"{API}/orders", json=payload)
        assert r.status_code == 200
        o = r.json()
        full = session.get(f"{API}/orders/track/{o['tracking_token']}").json()
        assert full["payment_mode"] == "dp"
        session.delete(f"{API}/admin/orders/{o['code']}", headers=auth)


# ---------- Buyer accept -> awaiting_payment ----------
class TestAcceptTransitionsToAwaitingPayment:
    def test_dp_order_goes_to_awaiting_payment(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "dp")
        assert body["accepted_days"] == 7
        assert body["started_at"] is None
        assert body["expected_finish_at"] is None
        session.delete(f"{API}/admin/orders/{code}", headers=auth)

    def test_full_order_also_goes_to_awaiting_payment(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "full")
        assert body["status"] == "awaiting_payment"
        session.delete(f"{API}/admin/orders/{code}", headers=auth)


# ---------- Buyer payment submit + validation ----------
class TestPaymentSubmit:
    def test_submit_dp_success(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "dp")
        r = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "dp", "amount": body["dp_amount"],
            "method": "bank_transfer", "proof_image": SMALL_PNG,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "payment_review"
        assert len(d["payments"]) == 1
        assert d["payments"][0]["status"] == "pending"
        session.delete(f"{API}/admin/orders/{code}", headers=auth)

    def test_submit_amount_too_low(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "dp")
        too_low = int(body["dp_amount"] * 0.5)
        r = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "dp", "amount": too_low,
            "method": "bank_transfer", "proof_image": SMALL_PNG,
        })
        assert r.status_code == 400
        session.delete(f"{API}/admin/orders/{code}", headers=auth)

    def test_submit_kind_mismatch(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "dp")
        r = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "full", "amount": body["total_amount"],
            "method": "bank_transfer", "proof_image": SMALL_PNG,
        })
        assert r.status_code == 400
        session.delete(f"{API}/admin/orders/{code}", headers=auth)


# ---------- Seller verify payment ----------
class TestVerifyPayment:
    def test_verify_requires_auth(self, session):
        r = session.post(f"{API}/admin/orders/NONEXISTENT/verify-payment",
                         json={"payment_id": "x", "verified": True})
        assert r.status_code == 401

    def test_verify_accept_moves_to_in_progress(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "dp")
        r = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "dp", "amount": body["dp_amount"],
            "method": "bank_transfer", "proof_image": SMALL_PNG,
        })
        pid = r.json()["payments"][0]["id"]
        r = session.post(f"{API}/admin/orders/{code}/verify-payment",
                        json={"payment_id": pid, "verified": True},
                        headers=auth)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "in_progress"
        assert d["started_at"]
        assert d["expected_finish_at"]
        assert d["amount_paid"] == body["dp_amount"]
        assert d["payments"][0]["status"] == "verified"
        session.delete(f"{API}/admin/orders/{code}", headers=auth)

    def test_verify_reject_reverts(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "dp")
        r = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "dp", "amount": body["dp_amount"],
            "method": "bank_transfer", "proof_image": SMALL_PNG,
        })
        pid = r.json()["payments"][0]["id"]
        r = session.post(f"{API}/admin/orders/{code}/verify-payment",
                        json={"payment_id": pid, "verified": False,
                              "rejection_reason": "bukti blur tidak terbaca"},
                        headers=auth)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "awaiting_payment"
        assert d["payments"][0]["status"] == "rejected"
        assert "blur" in d["payments"][0]["rejection_reason"]
        # Buyer can submit again
        r2 = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "dp", "amount": body["dp_amount"],
            "method": "qris", "proof_image": SMALL_PNG,
        })
        assert r2.status_code == 200
        assert r2.json()["status"] == "payment_review"
        session.delete(f"{API}/admin/orders/{code}", headers=auth)


# ---------- Full payment E2E (no settlement) ----------
class TestFullPaymentE2E:
    def test_full_path_complete(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "full")
        # Submit full payment
        r = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "full", "amount": body["total_amount"],
            "method": "bank_transfer", "proof_image": SMALL_PNG,
        })
        assert r.status_code == 200
        pid = r.json()["payments"][0]["id"]
        # Verify
        r = session.post(f"{API}/admin/orders/{code}/verify-payment",
                        json={"payment_id": pid, "verified": True}, headers=auth)
        assert r.json()["status"] == "in_progress"
        # Deliver
        r = session.post(f"{API}/admin/orders/{code}/deliver",
                        json={"url": "https://test.com/full"}, headers=auth)
        assert r.json()["status"] == "delivered"
        # Request finish - full payment goes straight to completed
        r = session.post(f"{API}/orders/track/{tt}/request-finish")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "completed"
        assert d["finished_at"]
        session.delete(f"{API}/admin/orders/{code}", headers=auth)


# ---------- DP path with settlement E2E ----------
class TestDPSettlementE2E:
    def test_dp_full_lifecycle(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "dp")
        dp = body["dp_amount"]
        sett = body["settlement_amount"]
        total = body["total_amount"]

        # DP payment
        r = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "dp", "amount": dp, "method": "bank_transfer", "proof_image": SMALL_PNG,
        })
        pid = r.json()["payments"][0]["id"]
        r = session.post(f"{API}/admin/orders/{code}/verify-payment",
                        json={"payment_id": pid, "verified": True}, headers=auth)
        assert r.json()["status"] == "in_progress"

        # Deliver
        r = session.post(f"{API}/admin/orders/{code}/deliver",
                        json={"url": "https://test.com/dp"}, headers=auth)
        assert r.json()["status"] == "delivered"

        # Request finish -> awaiting_settlement (NOT completed)
        r = session.post(f"{API}/orders/track/{tt}/request-finish")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "awaiting_settlement"
        assert d.get("finished_at") in (None, "")

        # Settlement payment
        r = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "settlement", "amount": sett,
            "method": "qris", "proof_image": SMALL_PNG,
        })
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "settlement_review"
        pid2 = r.json()["payments"][1]["id"]

        # Verify settlement
        r = session.post(f"{API}/admin/orders/{code}/verify-payment",
                        json={"payment_id": pid2, "verified": True}, headers=auth)
        d = r.json()
        assert d["status"] == "completed"
        assert d["finished_at"]
        assert d["amount_paid"] == total
        session.delete(f"{API}/admin/orders/{code}", headers=auth)


# ---------- Backward compat /finish alias ----------
class TestFinishAlias:
    def test_finish_alias_delegates(self, session, auth):
        code, tt, body = _to_awaiting_payment(session, auth, "full")
        r = session.post(f"{API}/orders/track/{tt}/payment", json={
            "kind": "full", "amount": body["total_amount"],
            "method": "bank_transfer", "proof_image": SMALL_PNG,
        })
        pid = r.json()["payments"][0]["id"]
        session.post(f"{API}/admin/orders/{code}/verify-payment",
                     json={"payment_id": pid, "verified": True}, headers=auth)
        session.post(f"{API}/admin/orders/{code}/deliver",
                     json={"url": "https://test.com/x"}, headers=auth)
        # Old client calls /finish
        r = session.post(f"{API}/orders/track/{tt}/finish")
        assert r.status_code == 200
        assert r.json()["status"] == "completed"
        session.delete(f"{API}/admin/orders/{code}", headers=auth)

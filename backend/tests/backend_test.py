"""
Backend test suite for TokoKu order workflow + auth.
Covers: auth (login/me/change-pin), order create/track, full workflow happy path,
negotiation, revision quotas per package (basic/growth/pro), reject path,
admin list/delete, public reviews + toggle visibility.
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # Fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@website.id"
ADMIN_PIN = "503625"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "pin": ADMIN_PIN})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["email"] == ADMIN_EMAIL
    return data["token"]


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _create_order(session, package_id="growth", package_name="Growth"):
    payload = {
        "buyer_name": "TEST Buyer",
        "buyer_whatsapp": "081234567890",
        "buyer_business": "TEST Biz",
        "buyer_brief": "Saya butuh website toko online untuk jualan",
        "package_id": package_id,
        "package_name": package_name,
    }
    r = session.post(f"{API}/orders", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------- Auth ----------------
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "pin": ADMIN_PIN})
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert isinstance(d["token"], str) and len(d["token"]) > 20

    def test_login_wrong_pin(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "pin": "000000"})
        assert r.status_code == 401
        assert "Email atau PIN salah" in r.json().get("detail", "")

    def test_me_no_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, session, token):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_change_pin_flow(self, session, auth_headers):
        new_pin = "111222"
        # Change to new_pin
        r = session.post(f"{API}/auth/change-pin",
                         json={"old_pin": ADMIN_PIN, "new_pin": new_pin}, headers=auth_headers)
        assert r.status_code == 200, r.text
        # Old PIN no longer works
        r2 = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "pin": ADMIN_PIN})
        assert r2.status_code == 401
        # New PIN works
        r3 = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "pin": new_pin})
        assert r3.status_code == 200
        new_token = r3.json()["token"]
        # Restore PIN
        r4 = session.post(f"{API}/auth/change-pin",
                          json={"old_pin": new_pin, "new_pin": ADMIN_PIN},
                          headers={"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"})
        assert r4.status_code == 200
        # Confirm restored
        r5 = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "pin": ADMIN_PIN})
        assert r5.status_code == 200

    def test_change_pin_invalid_format(self, session, auth_headers):
        r = session.post(f"{API}/auth/change-pin",
                         json={"old_pin": ADMIN_PIN, "new_pin": "12ab56"}, headers=auth_headers)
        assert r.status_code == 400


# ---------------- Order create + track ----------------
class TestOrderCreateTrack:
    def test_create_order_returns_code_and_token(self, session):
        d = _create_order(session)
        assert d["code"].startswith("ORD-") and len(d["code"]) == 10
        assert d["status"] == "pending_review"
        assert len(d["tracking_token"]) > 10

    def test_validation_brief_too_short(self, session):
        r = session.post(f"{API}/orders", json={
            "buyer_name": "Foo", "buyer_whatsapp": "081234567890",
            "buyer_business": "Biz", "buyer_brief": "short",
            "package_id": "basic", "package_name": "Basic",
        })
        assert r.status_code == 422

    def test_validation_name_too_short(self, session):
        r = session.post(f"{API}/orders", json={
            "buyer_name": "A", "buyer_whatsapp": "081234567890",
            "buyer_business": "Biz", "buyer_brief": "Saya butuh website yang bagus",
            "package_id": "basic", "package_name": "Basic",
        })
        assert r.status_code == 422

    def test_validation_wa_too_short(self, session):
        r = session.post(f"{API}/orders", json={
            "buyer_name": "Foo", "buyer_whatsapp": "1234",
            "buyer_business": "Biz", "buyer_brief": "Saya butuh website yang bagus",
            "package_id": "basic", "package_name": "Basic",
        })
        assert r.status_code == 422

    def test_track_by_token(self, session):
        d = _create_order(session)
        r = session.get(f"{API}/orders/track/{d['tracking_token']}")
        assert r.status_code == 200
        assert r.json()["code"] == d["code"]

    def test_track_wrong_token(self, session):
        r = session.get(f"{API}/orders/track/nonexistent_token_xxx")
        assert r.status_code == 404


# ---------------- Workflow happy path ----------------
class TestHappyPath:
    def test_full_happy_path(self, session, auth_headers):
        d = _create_order(session, package_id="growth", package_name="Growth")
        code, token = d["code"], d["tracking_token"]

        # Seller propose 7 days
        r = session.post(f"{API}/admin/orders/{code}/propose",
                         json={"proposed_days": 7, "note": "ok"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "awaiting_buyer"
        assert r.json()["proposed_days"] == 7

        # Buyer accept
        r = session.post(f"{API}/orders/track/{token}/accept")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "in_progress"
        assert body["started_at"] and body["expected_finish_at"]
        assert body["accepted_days"] == 7

        # Seller deliver
        r = session.post(f"{API}/admin/orders/{code}/deliver",
                         json={"url": "https://test.com/result", "notes": "done"},
                         headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "delivered"
        assert len(body["delivery_history"]) == 1
        assert body["delivery_history"][0]["is_revision"] is False

        # Buyer finish
        r = session.post(f"{API}/orders/track/{token}/finish")
        assert r.status_code == 200
        assert r.json()["status"] == "completed"
        assert r.json()["finished_at"]

        # Buyer review
        r = session.post(f"{API}/orders/track/{token}/review",
                         json={"rating": 5, "message": "Great work!"})
        assert r.status_code == 200
        body = r.json()
        assert body["review_rating"] == 5
        assert body["review_message"] == "Great work!"
        assert body["review_visible"] is True

        # Public reviews include this
        r = session.get(f"{API}/reviews")
        assert r.status_code == 200
        assert any(item["id"] == code for item in r.json())

        # Toggle visibility off
        r = session.post(f"{API}/admin/orders/{code}/toggle-review-visibility",
                         json={"visible": False}, headers=auth_headers)
        assert r.status_code == 200

        r = session.get(f"{API}/reviews")
        assert not any(item["id"] == code for item in r.json())

        # Cleanup
        session.delete(f"{API}/admin/orders/{code}", headers=auth_headers)


# ---------------- Negotiation ----------------
class TestNegotiation:
    def test_negotiation_flow(self, session, auth_headers):
        d = _create_order(session)
        code, token = d["code"], d["tracking_token"]
        session.post(f"{API}/admin/orders/{code}/propose",
                     json={"proposed_days": 5}, headers=auth_headers)

        r = session.post(f"{API}/orders/track/{token}/negotiate",
                         json={"negotiated_days": 10, "reason": "butuh waktu lebih"})
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "negotiating"
        assert body["negotiated_days"] == 10

        r = session.post(f"{API}/admin/orders/{code}/accept-negotiation", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "in_progress"
        assert body["accepted_days"] == 10

        # Cleanup
        session.delete(f"{API}/admin/orders/{code}", headers=auth_headers)


# ---------------- Revision quotas ----------------
def _to_delivered(session, auth_headers, package_id):
    d = _create_order(session, package_id=package_id, package_name=package_id.title())
    code, token = d["code"], d["tracking_token"]
    session.post(f"{API}/admin/orders/{code}/propose",
                 json={"proposed_days": 3}, headers=auth_headers)
    session.post(f"{API}/orders/track/{token}/accept")
    session.post(f"{API}/admin/orders/{code}/deliver",
                 json={"url": "https://test.com/v1"}, headers=auth_headers)
    return code, token


class TestRevisionQuotas:
    def test_basic_zero_revisions(self, session, auth_headers):
        code, token = _to_delivered(session, auth_headers, "basic")
        r = session.post(f"{API}/orders/track/{token}/request-revision",
                         json={"message": "warna salah"})
        assert r.status_code == 400
        assert "habis" in r.json().get("detail", "").lower()
        session.delete(f"{API}/admin/orders/{code}", headers=auth_headers)

    def test_growth_one_revision(self, session, auth_headers):
        code, token = _to_delivered(session, auth_headers, "growth")
        # 1st revision OK
        r = session.post(f"{API}/orders/track/{token}/request-revision",
                         json={"message": "warna salah"})
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "revision_requested"
        assert body["revisions_used"] == 1
        assert body["revisions_allowed"] == 1

        # Seller redeliver
        r = session.post(f"{API}/admin/orders/{code}/deliver",
                         json={"url": "https://test.com/v2"}, headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "delivered"
        assert len(body["delivery_history"]) == 2
        assert body["delivery_history"][1]["is_revision"] is True

        # 2nd revision should fail (quota exhausted)
        r = session.post(f"{API}/orders/track/{token}/request-revision",
                         json={"message": "ada lagi yang salah"})
        assert r.status_code == 400
        assert "habis" in r.json().get("detail", "").lower()
        session.delete(f"{API}/admin/orders/{code}", headers=auth_headers)

    def test_pro_two_revisions(self, session, auth_headers):
        code, token = _to_delivered(session, auth_headers, "pro")
        for i in range(2):
            r = session.post(f"{API}/orders/track/{token}/request-revision",
                             json={"message": f"revisi ke-{i+1}"})
            assert r.status_code == 200, r.text
            r = session.post(f"{API}/admin/orders/{code}/deliver",
                             json={"url": f"https://test.com/r{i+1}"}, headers=auth_headers)
            assert r.status_code == 200
        # 3rd revision should fail
        r = session.post(f"{API}/orders/track/{token}/request-revision",
                         json={"message": "ketiga"})
        assert r.status_code == 400
        session.delete(f"{API}/admin/orders/{code}", headers=auth_headers)


# ---------------- Reject ----------------
class TestReject:
    def test_reject_then_guard(self, session, auth_headers):
        d = _create_order(session)
        code = d["code"]
        r = session.post(f"{API}/admin/orders/{code}/reject",
                         json={"reason": "terlalu sibuk"}, headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "rejected"
        assert body["reject_reason"] == "terlalu sibuk"

        # Propose should fail
        r = session.post(f"{API}/admin/orders/{code}/propose",
                         json={"proposed_days": 5}, headers=auth_headers)
        assert r.status_code == 400
        session.delete(f"{API}/admin/orders/{code}", headers=auth_headers)


# ---------------- Admin list / delete ----------------
class TestAdmin:
    def test_admin_list_requires_auth(self, session):
        r = session.get(f"{API}/admin/orders")
        assert r.status_code == 401

    def test_admin_list_with_auth(self, session, auth_headers):
        d = _create_order(session)
        r = session.get(f"{API}/admin/orders", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(o["code"] == d["code"] for o in r.json())
        session.delete(f"{API}/admin/orders/{d['code']}", headers=auth_headers)

    def test_admin_delete(self, session, auth_headers):
        d = _create_order(session)
        r = session.delete(f"{API}/admin/orders/{d['code']}", headers=auth_headers)
        assert r.status_code == 200
        # Verify gone
        r2 = session.get(f"{API}/admin/orders/{d['code']}", headers=auth_headers)
        assert r2.status_code == 404

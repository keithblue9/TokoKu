// Thin axios-style fetch wrapper for the TokoKu API.
const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "tokoku_admin_token_v1";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, { body, auth, signal } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = data?.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
        ? detail.map((e) => e?.msg || JSON.stringify(e)).join(" ")
        : data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  login: (email, pin) => request("POST", "/auth/login", { body: { email, pin } }),
  me: () => request("GET", "/auth/me", { auth: true }),
  changePin: (old_pin, new_pin) =>
    request("POST", "/auth/change-pin", { body: { old_pin, new_pin }, auth: true }),

  // Orders (public)
  createOrder: (payload) => request("POST", "/orders", { body: payload }),
  trackOrder: (token) => request("GET", `/orders/track/${token}`),
  buyerAccept: (token) => request("POST", `/orders/track/${token}/accept`),
  buyerNegotiate: (token, negotiated_days, reason) =>
    request("POST", `/orders/track/${token}/negotiate`, { body: { negotiated_days, reason } }),
  buyerRequestRevision: (token, message) =>
    request("POST", `/orders/track/${token}/request-revision`, { body: { message } }),
  buyerFinish: (token) => request("POST", `/orders/track/${token}/finish`),
  buyerRequestFinish: (token) => request("POST", `/orders/track/${token}/request-finish`),
  buyerSubmitPayment: (token, payload) =>
    request("POST", `/orders/track/${token}/payment`, { body: payload }),
  buyerReview: (token, rating, message) =>
    request("POST", `/orders/track/${token}/review`, { body: { rating, message } }),
  buyerMessage: (token, text) =>
    request("POST", `/orders/track/${token}/message`, { body: { text } }),

  // Settings
  getPaymentSettings: () => request("GET", "/settings/payment"),
  getPaymentSettingsAdmin: () => request("GET", "/admin/settings/payment", { auth: true }),
  updatePaymentSettings: (payload) =>
    request("PUT", "/admin/settings/payment", { body: payload, auth: true }),

  // Orders (admin)
  listOrders: () => request("GET", "/admin/orders", { auth: true }),
  getOrder: (code) => request("GET", `/admin/orders/${code}`, { auth: true }),
  sellerPropose: (code, proposed_days, note) =>
    request("POST", `/admin/orders/${code}/propose`, { body: { proposed_days, note }, auth: true }),
  sellerAcceptNegotiation: (code) =>
    request("POST", `/admin/orders/${code}/accept-negotiation`, { auth: true }),
  sellerReject: (code, reason) =>
    request("POST", `/admin/orders/${code}/reject`, { body: { reason }, auth: true }),
  sellerDeliver: (code, url, notes) =>
    request("POST", `/admin/orders/${code}/deliver`, { body: { url, notes }, auth: true }),
  sellerMessage: (code, text) =>
    request("POST", `/admin/orders/${code}/message`, { body: { text }, auth: true }),
  sellerToggleReview: (code, visible) =>
    request("POST", `/admin/orders/${code}/toggle-review-visibility`, { body: { visible }, auth: true }),
  sellerVerifyPayment: (code, payment_id, verified, rejection_reason = "") =>
    request("POST", `/admin/orders/${code}/verify-payment`, {
      body: { payment_id, verified, rejection_reason },
      auth: true,
    }),
  sellerDelete: (code) => request("DELETE", `/admin/orders/${code}`, { auth: true }),

  // Public reviews
  publicReviews: () => request("GET", "/reviews"),

  // Terms & Conditions
  getTerms: () => request("GET", "/settings/terms"),
  updateTerms: (content) => request("PUT", "/admin/settings/terms", { body: { content }, auth: true }),

  // Team management (owner only)
  listTeam: () => request("GET", "/admin/team", { auth: true }),
  addTeamMember: (payload) => request("POST", "/admin/team", { body: payload, auth: true }),
  updateTeamMember: (email, payload) => request("PUT", `/admin/team/${encodeURIComponent(email)}`, { body: payload, auth: true }),
  deleteTeamMember: (email) => request("DELETE", `/admin/team/${encodeURIComponent(email)}`, { auth: true }),

  // Activity log
  listActivity: (limit = 200) => request("GET", `/admin/activity?limit=${limit}`, { auth: true }),

  // Order analytics
  updateOrderVisits: (code, monthly_visits) =>
    request("PUT", `/admin/orders/${code}/visits`, { body: { monthly_visits }, auth: true }),
  analyticsDashboard: (reminder_days = 30) =>
    request("GET", `/admin/analytics/dashboard?reminder_days=${reminder_days}`, { auth: true }),
};

// Status meta — central label/color map used across UI.
export const STATUS_META = {
  pending_review: { label: "Menunggu Review Seller", color: "amber", buyerLabel: "Order Diterima — Menunggu Penawaran Seller" },
  awaiting_buyer: { label: "Menunggu Keputusan Buyer", color: "indigo", buyerLabel: "Penawaran Durasi dari Seller — Tindakan Diperlukan" },
  negotiating: { label: "Negosiasi dari Buyer", color: "amber", buyerLabel: "Menunggu Keputusan Seller atas Negosiasi" },
  rejected: { label: "Ditolak Seller", color: "red", buyerLabel: "Order Ditolak Seller" },
  awaiting_payment: { label: "Menunggu Pembayaran DP/Lunas", color: "amber", buyerLabel: "Bayar untuk Mulai Pengerjaan" },
  payment_review: { label: "Verifikasi Pembayaran", color: "indigo", buyerLabel: "Pembayaran Sedang Diverifikasi" },
  in_progress: { label: "Dikerjakan", color: "indigo", buyerLabel: "Sedang Dikerjakan" },
  delivered: { label: "Sudah Diserahkan", color: "emerald", buyerLabel: "Hasil Siap — Tindakan Diperlukan" },
  revision_requested: { label: "Revisi Diminta", color: "amber", buyerLabel: "Revisi Sedang Dikerjakan Seller" },
  awaiting_settlement: { label: "Menunggu Pelunasan", color: "amber", buyerLabel: "Lunasi Sisa Pembayaran" },
  settlement_review: { label: "Verifikasi Pelunasan", color: "indigo", buyerLabel: "Pelunasan Sedang Diverifikasi" },
  completed: { label: "Selesai", color: "emerald", buyerLabel: "Selesai" },
  cancelled: { label: "Dibatalkan", color: "slate", buyerLabel: "Dibatalkan" },
};

export function formatStatusBadge(status, forBuyer = false) {
  const meta = STATUS_META[status] || { label: status, color: "slate", buyerLabel: status };
  return { label: forBuyer ? meta.buyerLabel : meta.label, color: meta.color };
}

export function formatDateTime(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

# TokoKu — Website Jasa Pembuatan Toko Online untuk UMKM

## Problem Statement (Original)
Marketing website + admin CMS yang menjual jasa pembuatan toko online untuk UMKM Indonesia. Iterasi terbaru menambah **alur Order end-to-end** lengkap dengan negosiasi durasi, timer pengerjaan, revisi terbatas per paket, dan review otomatis.

## Architecture
- **Frontend**: React 19 (CRA + craco) + TailwindCSS + Shadcn UI + lucide-react.
- **Backend**: FastAPI + Motor (MongoDB).
- **Persistence**: Konten website (hero, paket, dll) di **localStorage**. **Orders + admin auth** di **MongoDB** (cross-device sync via polling 8–12 detik).
- **Auth**: JWT (HS256, 7-day) via `POST /api/auth/login` (email + 6-digit PIN), token disimpan di `localStorage[tokoku_admin_token_v1]`. Bcrypt-hashed PIN di MongoDB. Admin di-seed otomatis dari env `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PIN` saat startup.

## User Personas
- **Buyer (Pemilik UMKM)**: submit order via dialog di pricing → dapat tracking link unik `/order/<token>` → polling status, accept/nego, terima delivery, minta revisi, review akhir.
- **Seller (Pemilik Jasa)**: login admin → kelola Order Masuk dengan workflow propose duration → accept/reject negosiasi → start work (timer) → deliver URL → resolve revisi → toggle visibility review.

## Order State Machine
`pending_review → awaiting_buyer → (negotiating ↔) in_progress → delivered → (revision_requested → delivered) → completed` (+ branch `rejected`).

**Revisi per paket**: Basic 0x · Growth 1x · Pro 2x.

## Implementation Status

### Done (30 May 2026)

**Iterasi 4 (Payment Workflow — current):**
- [x] Backend: `settings.payment` collection + GET/PUT endpoints, payment fields di Order (`payment_mode`, `total_amount`, `dp_amount`, `settlement_amount`, `payments[]`, `amount_paid`), 4 status baru (`awaiting_payment`, `payment_review`, `awaiting_settlement`, `settlement_review`), endpoint `/payment` submit + `/verify-payment` + `/request-finish`
- [x] Workflow path: DP → bayar DP → kerja → deliver → lunas → completed. Full → bayar full → kerja → deliver → completed
- [x] Buyer payment page elegan dengan 3 tab (QRIS / Transfer Bank / E-Wallet), CopyableRow untuk nominal & kode order, upload bukti dengan kompresi otomatis client-side, progress 3 langkah jelas
- [x] Admin `/admin/pembayaran`: konfig DP %, rekening bank, upload QRIS, info e-wallet, instruksi tambahan
- [x] Admin OrderDetail: PaymentVerificationCard (preview proof + accept/reject reason), PaymentSummaryCard (riwayat semua pembayaran)
- [x] Buyer OrderDialog: pilih DP/Full di awal order dengan kalkulasi nominal langsung tampil

**Iterasi 1–3** (sebelumnya): buyer view CMS, testimoni+FAQ, full order workflow with negotiation/revision/review.

### Verified by Testing (iteration 3)
- Backend: **39/39 pytest pass** (21 regression + 18 payment baru)
- Frontend: E2E full DP flow (order → propose → accept → pay DP → verify → in_progress → deliver → settlement → completed)
- [x] Buyer view: hero, why-own-store carousel (6 kartu, marquee), pricing (3 paket + duration switcher), how-it-works, domain renewal, footer
- [x] Admin CMS: 9 halaman edit (hero/keunggulan/cara-kerja/footer/paket/harga/domain/PIN), pricing calculator real-time, maintenance toggle

**Iterasi 2 (Testimoni & FAQ):**
- [x] Buyer: section Testimoni (3 kartu default) + FAQ accordion (6 pertanyaan)
- [x] Admin: Testimoni edit (upload foto + rating), FAQ edit (add/edit/reorder/delete)
- [x] Watermark "Made with Emergent" dihapus

**Iterasi 3 (Order Workflow — current):**
- [x] Backend FastAPI dengan 16 endpoint: 3 auth + 11 order + 1 public reviews + 1 health
- [x] JWT bearer auth + bcrypt PIN hashing + admin seed on startup
- [x] MongoDB models: `admins`, `orders` (dengan code unik `ORD-XXXXXX` + tracking_token URL-safe)
- [x] Frontend buyer: OrderDialog (form lengkap dengan validasi + estimasi biaya), localStorage cache of own orders, tracking page dengan timer countdown live, dialog negosiasi/revisi/review, chat box, polling 8s
- [x] Frontend seller: Orders list (poll 12s, search, status badge), OrderDetail dengan action card kontekstual per status, delivery history, revision history, review card dengan toggle visibility, chat seller
- [x] Public testimoni section otomatis menampilkan review dari order completed (dengan filter visibility)
- [x] Sidebar admin menambah menu "Order Masuk" + Dashboard stat card menampilkan order aktif & perlu tindakan
- [x] Header buyer menampilkan link "Lacak Order" otomatis kalau ada order tersimpan di localStorage

### Verified by Testing (iteration 2)
- Backend: 21/21 pytest pass (auth + workflow + revisions + reviews visibility)
- Frontend: 100% critical flow (order create → login → propose → accept → in_progress timer → chat → cross-context polling)

## Backlog

### P1
- [ ] WA notification otomatis (Twilio/Fonnte) untuk push notif ke buyer/seller — saat ini click-to-send wa.me link
- [ ] Rate limiting di `/api/auth/login` dan `/api/orders` (slowapi)
- [ ] Export order list CSV / PDF invoice generator

### P2
- [ ] Refresh token + token rotation (saat ini single 7-day access token)
- [ ] Refactor `server.py` → routers terpisah (`routers/auth.py`, `routers/orders.py`, `services/state_machine.py`)
- [ ] State machine declarative table dengan decorator validasi transisi
- [ ] Drag-and-drop dnd-kit untuk reorder steps/FAQ
- [ ] Multi-admin (collaborator) + role-based access
- [ ] Dashboard analytics (orders per status, revenue chart, conversion funnel)

# TokoKu — Website Jasa Pembuatan Toko Online untuk UMKM

## Problem Statement (Original)
Build a marketing website (not e-commerce store) that sells online store creation services for Indonesian UMKM/SME entrepreneurs. Two interfaces:
1. **Buyer View** — public single-page landing
2. **Seller View / Admin Dashboard** — protected panel that lets the service owner edit every piece of content & pricing shown to buyers

Target market: Indonesian UMKM millennials (25–40), digitally literate, run food/fashion/craft/local services, want to sell online seriously without technical hassle.

## Architecture (MVP — 30 May 2026)
- **Stack**: React 19 (CRA + craco) + TailwindCSS + Shadcn UI + framer-motion + lucide-react.
- **Persistence**: localStorage only (per user choice).
- **Auth**: JWT-style session in localStorage. Login = email + 6-digit PIN via Shadcn `InputOTP`.
- **Default credentials**: `admin@website.id` / PIN `503625` — changeable via `/admin/password`.
- **Routing**: `/` (buyer view), `/admin/login`, and protected `/admin/*` routes.

## User Personas
- **Pemilik UMKM (Buyer)**: Mobile-first, scans landing page, evaluates 3 packages, taps WhatsApp CTA to chat.
- **Pemilik Jasa (Admin/Seller)**: Logs into dashboard from desktop/HP, edits content + pricing, immediately previews on buyer view.

## Core Requirements (Static)
- Buyer view sections: Hero, Why-Own-Store (6 cards, unskippable auto-marquee), Pricing (3 packages + duration switcher), How It Works, Domain Renewal, Footer.
- Admin panel sections: Dashboard, Hero, Keunggulan, Cara Kerja, Footer & Kontak, Pengaturan Paket, Kalkulator Harga, Opsi Perpanjang Domain, Ganti PIN.
- Mobile-first design at 375px viewport.
- WhatsApp CTA in ≥3 places: hero, each pricing card, footer.
- Pricing formula: `harga_jual = modal / (1 - margin%)`.

## Implementation Status

### Done (30 May 2026)
- [x] Buyer view with all 6 sections + animated blob hero + scroll-reveal sections
- [x] Why-Own-Store auto-scrolling marquee carousel (6 cards, hover-to-pause)
- [x] Pricing with monthly/yearly/2-year switcher + auto-computed savings %
- [x] Domain renewal section reading from featured package
- [x] Admin login with Shadcn InputOTP (6-digit PIN)
- [x] Protected route gate + 7-day localStorage session
- [x] Admin sidebar layout (responsive, with mobile drawer)
- [x] All 9 admin edit pages with real-time previews and toast feedback
- [x] Pricing calculator with real-time formula + override fields
- [x] Drag-style reorder for "Cara Kerja" steps
- [x] Icon picker for "Keunggulan" cards
- [x] Site maintenance toggle (`status` flag)
- [x] WA number placeholder guard + admin dashboard warning banner
- [x] All interactive elements tagged with `data-testid`
- [x] Frontend testing agent run: 95% pass, no critical bugs

### Verified by Testing Agent (iteration 1)
- All buyer view sections render correctly at 1920px & 375px
- Login (correct + wrong PIN), protected route redirect, logout all working
- Hero edit reflects on buyer view; calculator real-time math correct
- Maintenance mode page renders when status toggled off
- All 8 sidebar nav links work

## Prioritized Backlog

### P1 (next iteration)
- [ ] Replace placeholder WhatsApp number `628XXXXXXXXXX` with the seller's real number (admin task, not code)
- [ ] Replace placeholder phone `08XXXXXXXXXX` and brand "TokoKu" with real values
- [ ] Add SEO meta editor (title/description) — currently uses defaults from config.meta but no UI yet
- [ ] Drag-and-drop (dnd-kit) for steps and feature lists (currently arrow buttons)

### P2 (polish & extras)
- [ ] Export / Import config as JSON file (so admin can back up localStorage data)
- [ ] Per-package override of yearly/2-year price in calculator UI (data field exists; UI is present but minimal)
- [ ] Multi-admin support (currently single credential pair)
- [ ] Analytics / view counter for buyer view
- [ ] Migrate to MongoDB backend for multi-device sync

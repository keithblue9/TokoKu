import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useConfig, computePackagePrices, formatRupiah } from "@/lib/configStore";
import { toast } from "sonner";
import { AlertCircle, MessageCircle, CheckCircle2, Copy, ExternalLink, Banknote, CreditCard } from "lucide-react";

export default function OrderDialog({ open, onOpenChange, packageId, duration = "yearly" }) {
  const { config } = useConfig();
  const nav = useNavigate();
  const pkg = config.packages.find((p) => p.id === packageId);
  const prices = pkg ? computePackagePrices(pkg) : null;

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [business, setBusiness] = useState("");
  const [brief, setBrief] = useState("");
  const [paymentMode, setPaymentMode] = useState("dp");
  const [dpPercent, setDpPercent] = useState(50);
  const [step, setStep] = useState("form"); // "form" | "terms" | "submitting"
  const [terms, setTerms] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (open) {
      api.getPaymentSettings().then((s) => setDpPercent(s.dp_percent || 50)).catch(() => {});
      api.getTerms().then((r) => setTerms(r.content || "")).catch(() => {});
    }
  }, [open]);

  if (!pkg) return null;

  // Map the duration tab to the right "per-period" domain price and first-year total.
  const DURATION_MAP = {
    monthly: { domain: prices.monthly, total: prices.totalFirstYearMonthly, label: "/bulan" },
    twoYear: { domain: prices.twoYear, total: prices.setup + prices.twoYear, label: "/2 tahun" },
    yearly:  { domain: prices.yearly,  total: prices.totalFirstYearYearly,   label: "/tahun" },
  };
  const dur = DURATION_MAP[duration] || DURATION_MAP.yearly;
  const domainPrice = dur.domain;
  const total = dur.total;
  const dpAmount = Math.round(total * dpPercent / 100);

  const reset = () => {
    setName(""); setWhatsapp(""); setBusiness(""); setBrief(""); setPaymentMode("dp");
    setError(""); setCreated(null); setStep("form"); setAgreed(false);
  };

  const goToTerms = (e) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Nama minimal 2 huruf.");
    const wa = whatsapp.replace(/\D/g, "");
    if (wa.length < 9) return setError("Nomor WhatsApp tidak valid.");
    if (business.trim().length < 1) return setError("Mohon isi nama bisnis kamu.");
    if (brief.trim().length < 10) return setError("Brief minimal 10 karakter.");
    setStep("terms");
  };

  const handleSubmit = async () => {
    if (!agreed) return setError("Mohon centang persetujuan dulu.");
    setError("");
    setSubmitting(true);
    try {
      const res = await api.createOrder({
        buyer_name: name,
        buyer_whatsapp: whatsapp.replace(/\D/g, ""),
        buyer_business: business,
        buyer_brief: brief,
        package_id: pkg.id,
        package_name: pkg.name,
        duration_choice: duration,
        package_setup_price: prices.setup,
        package_domain_price: domainPrice,
        payment_mode: paymentMode,
        agreed_to_terms: true,
      });
      try {
        const arr = JSON.parse(localStorage.getItem("tokoku_my_orders") || "[]");
        arr.unshift({ code: res.code, token: res.tracking_token, package: pkg.name, at: Date.now() });
        localStorage.setItem("tokoku_my_orders", JSON.stringify(arr.slice(0, 10)));
      } catch (storageErr) {
        console.warn("Could not cache tracking link locally:", storageErr?.message);
      }
      setCreated(res);
      toast.success("Order kamu terkirim!");
    } catch (err) {
      setError(err.message || "Gagal mengirim order.");
    } finally {
      setSubmitting(false);
    }
  };

  const trackingUrl = created ? `${window.location.origin}/order/${created.tracking_token}` : "";

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      toast.success("Link tracking disalin!");
    } catch {
      toast.error("Gagal menyalin link.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden" data-testid="order-dialog">
        {!created && step === "form" ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-xl font-extrabold font-display tracking-tight text-slate-900">
                Order {pkg.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Isi form singkat ini. Kami akan menawarkan estimasi durasi pengerjaan setelah review brief kamu.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-3 bg-slate-50 border-y border-slate-100 text-xs flex justify-between items-center">
              <span className="text-slate-500">Estimasi biaya:</span>
              <span className="font-extrabold font-display text-slate-900">
                {formatRupiah(prices.setup)} setup + {formatRupiah(domainPrice)} domain {dur.label}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Nama Kamu</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" placeholder="Nama lengkap" data-testid="order-name" />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Nomor WhatsApp Aktif</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9+]/g, ""))} className="rounded-xl" placeholder="628..." data-testid="order-wa" />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Nama Bisnis / Toko</Label>
                <Input value={business} onChange={(e) => setBusiness(e.target.value)} className="rounded-xl" placeholder="Mis. Kopi Senja, Yogyakarta" data-testid="order-business" />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Brief Singkat</Label>
                <Textarea rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} className="rounded-xl" placeholder="Cerita singkat soal bisnismu: jual apa, target pasar, style yang kamu suka, dll." data-testid="order-brief" />
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Cara Pembayaran</Label>
                <div className="grid grid-cols-2 gap-2" data-testid="payment-mode-selector">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("dp")}
                    className={`text-left rounded-2xl p-3 border-2 transition ${paymentMode === "dp" ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                    data-testid="payment-mode-dp"
                  >
                    <Banknote className={`w-5 h-5 mb-1.5 ${paymentMode === "dp" ? "text-indigo-600" : "text-slate-400"}`} />
                    <div className="font-extrabold text-sm text-slate-900">DP {dpPercent}%</div>
                    <div className="text-xs text-slate-500 mt-0.5">Bayar sekarang {formatRupiah(dpAmount)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Lunas saat hasil siap</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("full")}
                    className={`text-left rounded-2xl p-3 border-2 transition ${paymentMode === "full" ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                    data-testid="payment-mode-full"
                  >
                    <CreditCard className={`w-5 h-5 mb-1.5 ${paymentMode === "full" ? "text-indigo-600" : "text-slate-400"}`} />
                    <div className="font-extrabold text-sm text-slate-900">Full Payment</div>
                    <div className="text-xs text-slate-500 mt-0.5">Bayar sekali {formatRupiah(total)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">No ribet di akhir</div>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" data-testid="order-error">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                data-testid="order-submit"
              >
                Lanjut: Baca Syarat & Ketentuan →
              </Button>
            </form>
          </>
        ) : step === "terms" ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-xl font-extrabold font-display tracking-tight text-slate-900">
                Syarat & Ketentuan
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Mohon baca perjanjian kerjasama di bawah ini sebelum melanjutkan.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-2">
              <div className="max-h-72 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed" data-testid="terms-content-display">
                {terms || "Memuat syarat & ketentuan..."}
              </div>
            </div>
            <div className="px-6 pb-6 pt-4 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer" data-testid="terms-checkbox-label">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  data-testid="terms-checkbox"
                />
                <span className="text-sm text-slate-700">
                  <strong>Saya menyetujui</strong> seluruh syarat & ketentuan kerjasama di atas, dan siap untuk lanjut ke pembayaran.
                </span>
              </label>
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("form")}
                  className="rounded-full font-bold"
                  data-testid="terms-back"
                >
                  ← Kembali
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!agreed || submitting}
                  className="flex-1 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
                  data-testid="terms-submit"
                >
                  {submitting ? "Mengirim..." : "Setuju & Kirim Order"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold font-display text-slate-900 mb-2">Order kamu terkirim!</h3>
            <p className="text-sm text-slate-600 mb-6">
              Kode order: <span className="font-mono font-bold text-slate-900" data-testid="order-success-code">{created.code}</span>.
              Simpan link tracking di bawah untuk cek status & berkomunikasi dengan kami. Tim kami akan kirim penawaran durasi pengerjaan paling lambat 1×24 jam.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Link Tracking</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs sm:text-sm break-all text-slate-700" data-testid="order-tracking-url">{trackingUrl}</code>
                <Button size="sm" variant="outline" onClick={copyTracking} className="rounded-xl shrink-0" data-testid="order-copy-tracking">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={() => nav(`/order/${created.tracking_token}`)}
                className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                data-testid="order-goto-tracking"
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Buka Halaman Tracking
              </Button>
              <a
                href={`https://wa.me/${(config.hero.whatsapp_number || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Halo, saya baru saja submit order ${created.code} untuk paket ${pkg.name}. Mohon konfirmasinya ya 🙏`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1da851] text-white font-bold px-5 py-2.5 text-sm"
                data-testid="order-success-whatsapp"
              >
                <MessageCircle className="w-4 h-4" /> Konfirmasi via WA
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useConfig, computePackagePrices, formatRupiah } from "@/lib/configStore";
import { Check, X, MessageCircle, Sparkles, AlertTriangle, ShoppingBag } from "lucide-react";
import OrderDialog from "./OrderDialog";

const DURATIONS = [
  { id: "monthly", label: "Per Bulan" },
  { id: "yearly", label: "Per Tahun" },
  { id: "twoYear", label: "Per 2 Tahun" },
];

function PackageCard({ pkg, duration, onOrder, whatsappNumber }) {
  const prices = computePackagePrices(pkg);

  const durationPrice = {
    monthly: { price: prices.monthly, label: "/bulan", total: prices.totalFirstYearMonthly, savePct: 0 },
    yearly: { price: prices.yearly, label: "/tahun", total: prices.totalFirstYearYearly, savePct: prices.yearlySavingsPct },
    twoYear: { price: prices.twoYear, label: "/2 tahun", total: prices.totalFirstYearTwoYear, savePct: prices.twoYearSavingsPct },
  }[duration];

  return (
    <div
      data-testid={`pricing-card-${pkg.id}`}
      className={`relative rounded-3xl p-6 sm:p-8 transition-all duration-300 ${
        pkg.featured
          ? "bg-gradient-to-b from-indigo-50 to-white border-2 border-indigo-500 shadow-2xl shadow-indigo-200/60 lg:scale-[1.04] z-10"
          : "bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1"
      }`}
    >
      {pkg.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md" data-testid={`pricing-featured-badge-${pkg.id}`}>
          <Sparkles className="w-3 h-3" /> {pkg.badge}
        </div>
      )}
      {!pkg.featured && pkg.badge && (
        <div className="inline-block text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full mb-3">
          {pkg.badge}
        </div>
      )}

      <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 mb-2">{pkg.name}</h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">{pkg.tagline}</p>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Setup sekali bayar</div>
        <div className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight" data-testid={`pricing-setup-${pkg.id}`}>
          {formatRupiah(prices.setup)}
        </div>
      </div>

      <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
        <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Domain {durationPrice.label}</div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <div className="text-2xl font-extrabold font-display text-indigo-600" data-testid={`pricing-domain-${pkg.id}`}>
            {formatRupiah(durationPrice.price)}
          </div>
          {durationPrice.savePct > 0 && (
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              Hemat {durationPrice.savePct}%
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Total tahun pertama: <span className="font-bold text-slate-700">{formatRupiah(durationPrice.total)}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-7">
        {pkg.features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            {f.available ? (
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
            )}
            <span className={f.available ? "text-slate-700" : "text-slate-400 line-through"}>{f.text}</span>
          </li>
        ))}
      </ul>

      {pkg.warning_note && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800" data-testid={`pricing-warning-${pkg.id}`}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{pkg.warning_note}</span>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={() => onOrder(pkg.id)}
          className={`inline-flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-bold text-sm transition active:scale-95 ${
            pkg.featured
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30"
              : "bg-slate-900 hover:bg-slate-700 text-white"
          }`}
          data-testid={`pricing-cta-${pkg.id}`}
        >
          <ShoppingBag className="w-4 h-4" />
          {pkg.cta_text || "Pilih Paket Ini"}
        </button>
        <a
          href={`https://wa.me/${(whatsappNumber || "").replace(/\D/g, "")}?text=${encodeURIComponent(pkg.wa_message || `Halo, saya mau tanya soal paket ${pkg.name}.`)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full rounded-full py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          data-testid={`pricing-wa-${pkg.id}`}
        >
          <MessageCircle className="w-3.5 h-3.5" /> Tanya dulu via WhatsApp
        </a>
      </div>
    </div>
  );
}

// (helper removed - whatsappNumber is passed as prop)

export default function Pricing() {
  const { config } = useConfig();
  const [duration, setDuration] = useState("yearly");
  const [openOrder, setOpenOrder] = useState(false);
  const [orderPkgId, setOrderPkgId] = useState(null);

  const handleOrder = (pkgId) => {
    setOrderPkgId(pkgId);
    setOpenOrder(true);
  };

  const allSavings = (config.packages || []).map((p) => computePackagePrices(p));
  const yearlySave = Math.max(0, ...allSavings.map((s) => s.yearlySavingsPct));
  const twoYearSave = Math.max(0, ...allSavings.map((s) => s.twoYearSavingsPct));

  return (
    <section id="paket" className="py-20 sm:py-28 bg-white" data-testid="pricing-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 reveal">
          <div className="text-indigo-600 font-bold text-xs sm:text-sm uppercase tracking-widest mb-3">
            Paket Harga
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tighter text-slate-900 leading-tight">
            Pilih paket yang pas buat bisnismu.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Transparan, tanpa biaya tersembunyi. Bayar sekali setup, lanjut sewa domain sesuai durasi pilihanmu.
          </p>
        </div>

        <div className="flex justify-center mb-12 reveal">
          <div className="inline-flex bg-slate-100 rounded-full p-1.5" role="tablist" data-testid="pricing-duration-switcher">
            {DURATIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDuration(d.id)}
                className={`relative px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                  duration === d.id
                    ? "bg-white text-indigo-600 shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                data-testid={`pricing-duration-${d.id}`}
              >
                {d.label}
                {d.id === "yearly" && yearlySave > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                    -{yearlySave}%
                  </span>
                )}
                {d.id === "twoYear" && twoYearSave > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                    -{twoYearSave}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {config.packages.map((pkg) => (
            <div key={pkg.id} className="reveal">
              <PackageCard pkg={pkg} duration={duration} onOrder={handleOrder} whatsappNumber={config.hero.whatsapp_number} />
            </div>
          ))}
        </div>
      </div>

      <OrderDialog open={openOrder} onOpenChange={setOpenOrder} packageId={orderPkgId} duration={duration} />
    </section>
  );
}

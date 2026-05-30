import { useConfig, computePackagePrices, formatRupiah } from "@/lib/configStore";
import { Sparkles, Calendar, CalendarDays, CalendarClock } from "lucide-react";

const ICONS = { monthly: Calendar, yearly: CalendarDays, twoYear: CalendarClock };

export default function DomainRenewal() {
  const { config } = useConfig();
  // Use the featured package's domain prices as reference; fallback to first
  const featured = config.packages.find((p) => p.featured) || config.packages[0];
  if (!featured) return null;
  const prices = computePackagePrices(featured);
  const rn = config.domainRenewal;

  const cards = [
    { id: "monthly", price: prices.monthly, totalLabel: formatRupiah(prices.monthly), save: 0, saveRp: 0 },
    { id: "yearly", price: prices.yearly, totalLabel: formatRupiah(prices.yearly), save: prices.yearlySavingsPct, saveRp: prices.yearlySavingsRp },
    { id: "twoYear", price: prices.twoYear, totalLabel: formatRupiah(prices.twoYear), save: prices.twoYearSavingsPct, saveRp: prices.twoYearSavingsRp },
  ];

  return (
    <section id="domain" className="py-20 sm:py-28 bg-white" data-testid="domain-renewal-section">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 reveal">
          <div className="text-indigo-600 font-bold text-xs sm:text-sm uppercase tracking-widest mb-3">
            Perpanjang Domain
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tighter text-slate-900 leading-tight">
            {rn.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">{rn.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((c) => {
            const opt = rn.options[c.id];
            const Icon = ICONS[c.id];
            const isPopular = c.id === "yearly";
            return (
              <div
                key={c.id}
                data-testid={`domain-option-${c.id}`}
                className={`relative rounded-3xl p-6 sm:p-8 border-2 transition-all reveal ${
                  isPopular
                    ? "bg-indigo-50 border-indigo-500 shadow-xl"
                    : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-lg"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[11px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {opt.sublabel}
                  </div>
                )}
                <Icon className={`w-7 h-7 mb-4 ${isPopular ? "text-indigo-600" : "text-slate-400"}`} />
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
                  {opt.label}
                </div>
                {!isPopular && <div className="text-xs text-slate-400 mb-3">{opt.sublabel}</div>}
                <div className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight mt-2">
                  {c.totalLabel}
                </div>
                {c.save > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">
                    Hemat {c.save}% • {formatRupiah(c.saveRp)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          *Harga berdasarkan paket <span className="font-semibold">{featured.name}</span>. Setiap paket bisa berbeda — cek di atas.
        </p>
      </div>
    </section>
  );
}

import { useConfig } from "@/lib/configStore";
import * as Icons from "lucide-react";

function Card({ item }) {
  const Icon = Icons[item.icon] || Icons.Sparkles;
  return (
    <div
      className="shrink-0 w-[300px] sm:w-[360px] bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 mr-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      data-testid={`why-card-${item.id}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg sm:text-xl font-extrabold font-display text-slate-900 mb-2 leading-snug">
        {item.title}
      </h3>
      <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
        {item.description}
      </p>
      <p className="text-sm sm:text-base italic font-semibold text-amber-700 border-l-4 border-amber-400 pl-4">
        “{item.punchLine}”
      </p>
    </div>
  );
}

export default function WhyOwnStore() {
  const { config } = useConfig();
  const items = (config.whyOwnStore || []).filter((x) => x.active !== false);
  // Duplicate for seamless marquee
  const doubled = [...items, ...items];

  return (
    <section id="keunggulan" className="py-20 sm:py-28 bg-slate-50 overflow-hidden" data-testid="why-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 reveal">
        <div className="max-w-3xl">
          <div className="text-amber-600 font-bold text-xs sm:text-sm uppercase tracking-widest mb-3">
            Kenapa harus punya toko sendiri?
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tighter text-slate-900 leading-tight">
            Berhenti numpang. Saatnya punya{" "}
            <span className="text-indigo-600">rumah sendiri</span> buat bisnismu.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
            Marketplace itu seperti rumah kontrakan. Hari ini bisa nyaman, besok aturannya bisa berubah. Inilah 6 alasan kenapa toko sendiri jauh lebih kuat:
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Gradient fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-slate-50 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-slate-50 to-transparent z-10" />

        <div className="flex marquee-track" data-testid="why-marquee" style={{ width: "max-content" }}>
          {doubled.map((item, i) => (
            <Card key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 text-center text-xs text-slate-400">
        Geser atau hover untuk pause • {items.length} alasan kuat
      </div>
    </section>
  );
}

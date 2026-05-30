import { useConfig, waLink } from "@/lib/configStore";
import { MessageCircle, ArrowRight, Sparkles } from "lucide-react";

const HERO_FALLBACK =
  "https://static.prod-images.emergentagent.com/jobs/0fd3e276-4b2a-4c87-bda7-7b00875d381f/images/0e3d66674c0af2c331637a7236e57981b60fb54dfaf9bbd441ab71d8a1ff8355.png";

export default function Hero() {
  const { config } = useConfig();
  const heroImg = config.hero.hero_image || HERO_FALLBACK;

  return (
    <section id="top" className="relative overflow-hidden pt-10 pb-20 sm:pt-16 sm:pb-32" data-testid="hero-section">
      {/* Blobs */}
      <div className="blob bg-indigo-300/60" style={{ top: "-80px", left: "-80px", width: "320px", height: "320px" }} />
      <div
        className="blob bg-amber-300/60"
        style={{ top: "180px", right: "-60px", width: "300px", height: "300px", animationDelay: "4s" }}
      />
      <div
        className="blob bg-fuchsia-300/40"
        style={{ bottom: "-60px", left: "30%", width: "260px", height: "260px", animationDelay: "8s" }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold mb-6" data-testid="hero-badge">
            <Sparkles className="w-3.5 h-3.5" />
            Untuk UMKM Indonesia yang serius jualan online
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tighter text-slate-900 leading-[1.05]" data-testid="hero-headline">
            {config.hero.headline}
          </h1>
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl" data-testid="hero-subheadline">
            {config.hero.sub_headline}
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a
              href="#paket"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-7 py-3.5 font-bold text-sm sm:text-base transition active:scale-95 shadow-lg shadow-indigo-500/20"
              data-testid="hero-cta-primary"
            >
              {config.hero.cta_primary}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={waLink(config.hero.whatsapp_number, "Halo, saya tertarik dengan jasa pembuatan toko online.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white rounded-full px-7 py-3.5 font-bold text-sm sm:text-base transition active:scale-95"
              data-testid="hero-cta-whatsapp"
            >
              <MessageCircle className="w-4 h-4" />
              {config.hero.cta_secondary}
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Tanpa potongan komisi</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Domain sendiri</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Mudah dikelola sendiri</div>
          </div>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="relative aspect-[4/5] sm:aspect-[5/6] max-w-md mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-100 to-amber-100 shadow-2xl shadow-indigo-200/50">
            <img
              src={heroImg}
              alt="Mockup toko online"
              className="w-full h-full object-cover"
              data-testid="hero-image"
              loading="eager"
            />
          </div>
          <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 hidden sm:flex items-center gap-3" data-testid="hero-floating-card">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-extrabold">+</div>
            <div>
              <div className="text-xs text-slate-500">Penjualan hari ini</div>
              <div className="text-lg font-extrabold text-slate-900 font-display">Rp 1.250.000</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useConfig } from "@/lib/configStore";

export default function HowItWorks() {
  const { config } = useConfig();
  const steps = config.howItWorks || [];

  return (
    <section id="cara-kerja" className="py-20 sm:py-28 bg-slate-50" data-testid="how-it-works-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 reveal">
          <div className="text-amber-600 font-bold text-xs sm:text-sm uppercase tracking-widest mb-3">
            Cara Kerja
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tighter text-slate-900 leading-tight">
            Tokomu live dalam beberapa langkah.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Simpel dan tidak ribet. Bahkan kalau kamu nol di teknologi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className="relative bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 reveal"
              data-testid={`step-card-${step.id}`}
            >
              <div className="text-5xl font-extrabold font-display text-indigo-100 absolute top-4 right-4 leading-none">
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold font-display mb-4">
                  {idx + 1}
                </div>
                <h3 className="font-extrabold font-display text-lg text-slate-900 mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

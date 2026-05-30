import { useConfig } from "@/lib/configStore";
import { Star, Quote } from "lucide-react";

function Avatar({ name, photo }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  if (photo) {
    return <img src={photo} alt={name} className="w-12 h-12 rounded-full object-cover" />;
  }
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-amber-400 flex items-center justify-center text-white font-extrabold font-display">
      {initial}
    </div>
  );
}

export default function Testimonials() {
  const { config } = useConfig();
  const t = config.testimonials;
  if (!t || !t.items?.length) return null;

  return (
    <section id="testimoni" className="py-20 sm:py-28 bg-slate-50" data-testid="testimonials-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 reveal">
          <div className="text-amber-600 font-bold text-xs sm:text-sm uppercase tracking-widest mb-3">
            Testimoni
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tighter text-slate-900 leading-tight">
            {t.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.items.map((item) => (
            <div
              key={item.id}
              data-testid={`testimonial-card-${item.id}`}
              className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 reveal"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-indigo-100" />
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < (item.rating || 5) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                  />
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed text-sm sm:text-base mb-6 relative">
                “{item.message}”
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <Avatar name={item.name} photo={item.photo} />
                <div>
                  <div className="font-extrabold font-display text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.business}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

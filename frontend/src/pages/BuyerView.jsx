import { useEffect } from "react";
import Header from "@/components/buyer/Header";
import Hero from "@/components/buyer/Hero";
import WhyOwnStore from "@/components/buyer/WhyOwnStore";
import Pricing from "@/components/buyer/Pricing";
import HowItWorks from "@/components/buyer/HowItWorks";
import Testimonials from "@/components/buyer/Testimonials";
import FAQ from "@/components/buyer/FAQ";
import DomainRenewal from "@/components/buyer/DomainRenewal";
import Footer from "@/components/buyer/Footer";
import { useConfig } from "@/lib/configStore";

export default function BuyerView() {
  const { config } = useConfig();

  useEffect(() => {
    document.title = config.meta?.title || "TokoKu";
    const meta = document.querySelector('meta[name="description"]');
    if (meta && config.meta?.description) meta.setAttribute("content", config.meta.description);

    // Scroll reveal
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [config.meta]);

  if (config.status === "maintenance") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center bg-slate-50" data-testid="maintenance-page">
        <div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-4">Sedang Maintenance</h1>
          <p className="text-slate-600">Website {config.business.name} sedang dalam pemeliharaan. Silakan kembali sebentar lagi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900" data-testid="buyer-view">
      <Header />
      <Hero />
      <WhyOwnStore />
      <Pricing />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <DomainRenewal />
      <Footer />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useConfig, waLink } from "@/lib/configStore";
import { MessageCircle, Menu, X } from "lucide-react";

export default function Header() {
  const { config } = useConfig();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#keunggulan", label: "Kenapa" },
    { href: "#paket", label: "Paket" },
    { href: "#cara-kerja", label: "Cara Kerja" },
    { href: "#testimoni", label: "Testimoni" },
    { href: "#faq", label: "FAQ" },
    { href: "#kontak", label: "Kontak" },
  ];

  return (
    <header
      data-testid="buyer-header"
      className={`sticky top-0 z-50 transition-all ${
        scrolled ? "bg-white/85 backdrop-blur-xl border-b border-slate-200/70" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2" data-testid="brand-logo">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-400 flex items-center justify-center text-white font-extrabold font-display">
            {config.business.name?.charAt(0) || "T"}
          </div>
          <span className="font-display font-extrabold text-lg tracking-tight text-slate-900">
            {config.business.name}
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition"
              data-testid={`nav-link-${l.label.toLowerCase()}`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a
            href={waLink(config.hero.whatsapp_number, "Halo, saya mau tanya soal jasa toko online.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white hover:bg-[#1da851] rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-95"
            data-testid="header-whatsapp-cta"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100"
          data-testid="header-mobile-menu-toggle"
          aria-label="Menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3" data-testid="header-mobile-menu">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 font-semibold text-slate-700"
            >
              {l.label}
            </a>
          ))}
          <a
            href={waLink(config.hero.whatsapp_number, "Halo, saya mau tanya soal jasa toko online.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white rounded-full px-5 py-2.5 text-sm font-bold w-full justify-center"
          >
            <MessageCircle className="w-4 h-4" /> Chat WhatsApp
          </a>
        </div>
      )}
    </header>
  );
}

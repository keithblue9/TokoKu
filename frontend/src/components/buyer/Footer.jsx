import { useConfig, waLink } from "@/lib/configStore";
import { MessageCircle, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  const { config } = useConfig();
  const year = new Date().getFullYear();

  return (
    <footer id="kontak" className="bg-slate-900 text-slate-200 pt-20 pb-10 relative overflow-hidden" data-testid="footer-section">
      <div className="blob bg-indigo-600/20" style={{ top: "-60px", right: "10%", width: "320px", height: "320px" }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-400 flex items-center justify-center text-white font-extrabold font-display">
                {config.business.name?.charAt(0) || "T"}
              </div>
              <span className="font-display font-extrabold text-xl tracking-tight text-white">
                {config.business.name}
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
              {config.business.tagline}
            </p>
            <a
              href={waLink(config.hero.whatsapp_number, "Halo, saya tertarik dengan jasa pembuatan toko online.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-95"
              data-testid="footer-whatsapp-cta"
            >
              <MessageCircle className="w-4 h-4" /> Chat WhatsApp
            </a>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-5">Navigasi</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#keunggulan" className="text-slate-400 hover:text-white transition">Kenapa Toko Sendiri</a></li>
              <li><a href="#paket" className="text-slate-400 hover:text-white transition">Paket & Harga</a></li>
              <li><a href="#cara-kerja" className="text-slate-400 hover:text-white transition">Cara Kerja</a></li>
              <li><a href="#domain" className="text-slate-400 hover:text-white transition">Perpanjang Domain</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-5">Kontak</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3" data-testid="footer-whatsapp">
                <MessageCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <a href={waLink(config.hero.whatsapp_number, "")} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
                  WhatsApp: {config.hero.whatsapp_number}
                </a>
              </li>
              <li className="flex items-start gap-3" data-testid="footer-email">
                <Mail className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <a href={`mailto:${config.business.email}`} className="text-slate-400 hover:text-white break-all">{config.business.email}</a>
              </li>
              <li className="flex items-start gap-3" data-testid="footer-phone">
                <Phone className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <a href={`tel:${config.business.phone}`} className="text-slate-400 hover:text-white">{config.business.phone}</a>
              </li>
              {config.business.address && (
                <li className="flex items-start gap-3" data-testid="footer-address">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-slate-400">{config.business.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-14 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div data-testid="footer-copyright">© {year} {config.business.copyright}</div>
          <a href="/admin/login" className="hover:text-slate-300 transition" data-testid="footer-admin-link">Admin Panel</a>
        </div>
      </div>
    </footer>
  );
}

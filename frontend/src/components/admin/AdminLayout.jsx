import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useConfig } from "@/lib/configStore";
import { clearToken } from "@/lib/api";
import { toast } from "sonner";
import {
  LayoutDashboard, Sparkles, ListTree, Workflow, Phone, Package,
  Calculator, CalendarClock, KeyRound, LogOut, ExternalLink, Menu, X,
  MessageSquareQuote, HelpCircle, ClipboardList
} from "lucide-react";

const MENU = [
  {
    section: "Utama",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/orders", label: "Order Masuk", icon: ClipboardList },
    ],
  },
  {
    section: "Konten Website",
    items: [
      { to: "/admin/hero", label: "Hero Section", icon: Sparkles },
      { to: "/admin/keunggulan", label: "Keunggulan", icon: ListTree },
      { to: "/admin/cara-kerja", label: "Cara Kerja", icon: Workflow },
      { to: "/admin/testimoni", label: "Testimoni", icon: MessageSquareQuote },
      { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
      { to: "/admin/footer", label: "Footer & Kontak", icon: Phone },
    ],
  },
  {
    section: "Paket & Harga",
    items: [
      { to: "/admin/paket", label: "Pengaturan Paket", icon: Package },
      { to: "/admin/harga", label: "Kalkulator Harga", icon: Calculator },
      { to: "/admin/domain", label: "Opsi Perpanjang Domain", icon: CalendarClock },
    ],
  },
  {
    section: "Pengaturan",
    items: [{ to: "/admin/password", label: "Ganti PIN", icon: KeyRound }],
  },
];

export default function AdminLayout() {
  const nav = useNavigate();
  const { config } = useConfig();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearToken();
    toast.success("Berhasil logout.");
    nav("/admin/login", { replace: true });
  };

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-400 flex items-center justify-center text-white font-extrabold font-display">
          {config.business.name?.charAt(0) || "T"}
        </div>
        <div className="min-w-0">
          <div className="font-display font-extrabold text-base tracking-tight text-slate-900 truncate">{config.business.name}</div>
          <div className="text-[11px] text-slate-500">Admin Panel</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {MENU.map((section) => (
          <div key={section.section}>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {section.section}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    data-testid={`sidebar-link-${item.to.split("/").pop()}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 space-y-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition"
          data-testid="sidebar-preview-link"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview Buyer View
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition"
          data-testid="sidebar-logout-button"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" data-testid="mobile-sidebar">
          <div className="bg-black/50 absolute inset-0" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white flex flex-col">{SidebarContent}</aside>
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-14 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2" data-testid="mobile-menu-toggle">
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-display font-extrabold text-sm">{config.business.name} Admin</div>
          <div className="w-8" />
        </div>
        <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

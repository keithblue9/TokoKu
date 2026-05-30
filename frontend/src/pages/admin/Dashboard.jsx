import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useConfig, isWhatsappConfigured } from "@/lib/configStore";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Sparkles, Package, Calculator, AlertTriangle, ClipboardList } from "lucide-react";
import { toast } from "sonner";

function PageTitle({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { config, updateSection, setSection } = useConfig();
  const [orderStats, setOrderStats] = useState({ total: 0, actionable: 0, completed: 0 });

  useEffect(() => {
    let alive = true;
    api.listOrders().then((list) => {
      if (!alive) return;
      const actionable = list.filter((o) =>
        ["pending_review", "negotiating", "revision_requested"].includes(o.status)
      ).length;
      const completed = list.filter((o) => o.status === "completed").length;
      setOrderStats({ total: list.length, actionable, completed });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const lastUpdate = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const activePackages = config.packages.length;
  const activeWhy = config.whyOwnStore.filter((w) => w.active !== false).length;

  const toggleStatus = (val) => {
    setSection("status", val ? "online" : "maintenance");
    toast.success(val ? "Website diaktifkan." : "Website dalam mode maintenance.");
  };

  const quick = [
    { to: "/admin/orders", label: "Order Masuk", icon: ClipboardList, color: "indigo" },
    { to: "/admin/hero", label: "Edit Hero", icon: Sparkles, color: "amber" },
    { to: "/admin/harga", label: "Kalkulator Harga", icon: Calculator, color: "emerald" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <PageTitle title="Selamat datang kembali!" subtitle="Ringkasan pengelolaan website kamu." />

      {!isWhatsappConfigured(config.hero.whatsapp_number) && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4" data-testid="wa-warning">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-amber-900">Nomor WhatsApp belum diatur</div>
            <p className="text-sm text-amber-800 mt-0.5">
              Nomor saat ini masih placeholder (<span className="font-mono">{config.hero.whatsapp_number}</span>). Tombol Chat WhatsApp belum akan mengarah ke nomor asli. Atur sekarang di{" "}
              <Link to="/admin/hero" className="font-bold underline">Edit Hero Section</Link>.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <Link to="/admin/orders" className="block">
          <Card className={`p-5 rounded-2xl border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition ${orderStats.actionable > 0 ? "ring-2 ring-amber-300 bg-amber-50/40" : ""}`} data-testid="stat-orders">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Order Aktif</div>
            <div className="flex flex-col gap-2 mt-1">
              <span className="text-3xl font-extrabold font-display text-slate-900 leading-none">{orderStats.total}</span>
              {orderStats.actionable > 0 && (
                <span className="self-start text-[10px] font-bold bg-amber-500 text-white px-2 py-1 rounded-full uppercase tracking-wider">{orderStats.actionable} perlu tindakan</span>
              )}
            </div>
          </Card>
        </Link>
        <Card className="p-5 rounded-2xl border-slate-200" data-testid="stat-packages">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Paket Aktif</div>
          <div className="text-3xl font-extrabold font-display text-slate-900 mt-1">{activePackages}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-slate-200" data-testid="stat-why">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Order Selesai</div>
          <div className="text-3xl font-extrabold font-display text-slate-900 mt-1">{orderStats.completed}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-slate-200" data-testid="stat-status">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Status</div>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-lg font-extrabold font-display ${config.status === "online" ? "text-emerald-600" : "text-amber-600"}`}>
              {config.status === "online" ? "Online" : "Maintenance"}
            </span>
            <Switch checked={config.status === "online"} onCheckedChange={toggleStatus} data-testid="status-toggle" />
          </div>
        </Card>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Akses Cepat</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {quick.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            data-testid={`quick-${q.to.split("/").pop()}`}
          >
            <q.icon className={`w-7 h-7 mb-3 text-${q.color}-600`} />
            <div className="font-extrabold font-display text-slate-900">{q.label}</div>
            <div className="text-xs text-slate-500 mt-1">Klik untuk membuka →</div>
          </Link>
        ))}
      </div>

      <Card className="p-6 rounded-2xl border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-extrabold font-display text-slate-900">Preview Buyer View</div>
          <div className="text-sm text-slate-500">Lihat hasil tampilan publik di tab baru.</div>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 py-2.5 text-sm font-bold transition self-start sm:self-center"
          data-testid="open-buyer-view"
        >
          <ExternalLink className="w-4 h-4" /> Buka Buyer View
        </a>
      </Card>

      <p className="text-xs text-slate-400 mt-6">Data terakhir diakses: {lastUpdate}</p>
    </div>
  );
}

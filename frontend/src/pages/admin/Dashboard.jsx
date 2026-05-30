import { Link } from "react-router-dom";
import { useConfig } from "@/lib/configStore";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Sparkles, Package, Calculator, MessageCircle, Power } from "lucide-react";
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

  const lastUpdate = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const activePackages = config.packages.length;
  const activeWhy = config.whyOwnStore.filter((w) => w.active !== false).length;

  const toggleStatus = (val) => {
    setSection("status", val ? "online" : "maintenance");
    toast.success(val ? "Website diaktifkan." : "Website dalam mode maintenance.");
  };

  const quick = [
    { to: "/admin/hero", label: "Edit Hero", icon: Sparkles, color: "indigo" },
    { to: "/admin/paket", label: "Atur Paket", icon: Package, color: "amber" },
    { to: "/admin/harga", label: "Kalkulator Harga", icon: Calculator, color: "emerald" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <PageTitle title="Selamat datang kembali!" subtitle="Ringkasan pengelolaan website kamu." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 rounded-2xl border-slate-200" data-testid="stat-packages">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Paket Aktif</div>
          <div className="text-3xl font-extrabold font-display text-slate-900 mt-1">{activePackages}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-slate-200" data-testid="stat-why">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Kartu Keunggulan</div>
          <div className="text-3xl font-extrabold font-display text-slate-900 mt-1">{activeWhy}/6</div>
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

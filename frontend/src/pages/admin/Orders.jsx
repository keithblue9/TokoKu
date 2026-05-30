import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { api, STATUS_META, formatDateTime } from "@/lib/api";
import { formatRupiah } from "@/lib/configStore";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ClipboardList, ChevronRight, Search } from "lucide-react";

const COLOR_CLS = {
  amber: "bg-amber-100 text-amber-800",
  indigo: "bg-indigo-100 text-indigo-800",
  emerald: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  slate: "bg-slate-100 text-slate-700",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const pollRef = useRef();

  const load = async () => {
    try {
      const list = await api.listOrders();
      setOrders(list || []);
    } catch (e) {
      // ignore — sidebar logout handles 401
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 12000);
    return () => clearInterval(pollRef.current);
  }, []);

  const grouped = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = orders.filter((o) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      o.code.toLowerCase().includes(s) ||
      (o.buyer_name || "").toLowerCase().includes(s) ||
      (o.buyer_business || "").toLowerCase().includes(s) ||
      (o.buyer_whatsapp || "").includes(s)
    );
  });

  const actionableCount =
    (grouped["pending_review"] || 0) + (grouped["negotiating"] || 0) + (grouped["revision_requested"] || 0);

  return (
    <div data-testid="admin-orders">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Order Masuk</h1>
          <p className="text-sm text-slate-500 mt-1">
            {actionableCount > 0 ? (
              <span className="font-bold text-amber-600">{actionableCount} order menunggu tindakan kamu</span>
            ) : (
              "Tidak ada order yang menunggu tindakan."
            )}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode, nama, atau WA..." className="pl-9 rounded-xl" data-testid="orders-search" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center rounded-3xl border-dashed">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Belum ada order masuk.</p>
          <p className="text-xs text-slate-400 mt-1">Order akan muncul di sini setelah ada calon klien yang submit dari halaman publik.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const meta = STATUS_META[o.status] || { label: o.status, color: "slate" };
            return (
              <Link
                key={o.code}
                to={`/admin/orders/${o.code}`}
                className="block bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                data-testid={`order-row-${o.code}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold font-display text-slate-900">{o.buyer_name}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{o.buyer_business}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      <span className="font-mono font-bold text-slate-700">{o.code}</span> · {o.package_name} · {formatRupiah(o.package_setup_price)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{formatDateTime(o.created_at)} · WA {o.buyer_whatsapp}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${COLOR_CLS[meta.color]}`}>
                      {meta.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

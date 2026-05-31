import { useState, useEffect } from "react";
import { api, formatDateTime } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ScrollText, Crown, Shield, Search } from "lucide-react";

const ACTION_LABELS = {
  team_add: "Tambah anggota",
  team_update: "Update anggota",
  team_delete: "Hapus anggota",
  update_payment_settings: "Update pengaturan pembayaran",
  update_terms: "Update syarat & ketentuan",
  update_visits: "Update kunjungan order",
  // order workflow
  propose: "Ajukan durasi",
  reject: "Tolak order",
  accept_negotiation: "Setujui negosiasi",
  deliver: "Kirim hasil",
  verify_payment_accept: "Setujui pembayaran",
  verify_payment_reject: "Tolak pembayaran",
  toggle_review_visibility: "Ubah visibility review",
  delete_order: "Hapus order",
};

export default function ActivityLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.listActivity(500).then(setItems).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (i.admin_email || "").toLowerCase().includes(s) ||
      (i.admin_name || "").toLowerCase().includes(s) ||
      (i.action || "").toLowerCase().includes(s) ||
      (i.target_id || "").toLowerCase().includes(s)
    );
  });

  return (
    <div data-testid="admin-activity">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1"><ScrollText className="w-5 h-5 text-indigo-600" /><h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Log Aktivitas Tim</h1></div>
          <p className="text-sm text-slate-500">Setiap perubahan yang dilakukan tim operasional tercatat di sini. Total {items.length} aktivitas.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari email, aksi, atau target..." className="pl-9 rounded-xl" data-testid="activity-search" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center rounded-3xl border-dashed">
          <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Belum ada aktivitas.</p>
        </Card>
      ) : (
        <Card className="rounded-2xl border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {filtered.map((it, i) => (
            <div key={`${it.at}-${i}`} className="p-4 hover:bg-slate-50 flex items-start gap-3 text-sm" data-testid={`activity-row-${i}`}>
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                {it.admin_role === "owner" ? <Crown className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">{it.admin_name || it.admin_email}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">{it.admin_role || "staff"}</span>
                  <span className="text-slate-500">{ACTION_LABELS[it.action] || it.action}</span>
                  {it.target_id && <span className="font-mono text-xs text-slate-700">{it.target_id}</span>}
                </div>
                {it.details && <div className="text-xs text-slate-500 mt-1">{it.details}</div>}
                <div className="text-[11px] text-slate-400 mt-1">{formatDateTime(it.at)} · {it.admin_email}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, formatDateTime } from "@/lib/api";
import { formatRupiah } from "@/lib/configStore";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarClock, TrendingUp, PieChart, Sparkles, Edit3, AlertTriangle, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const PACKAGE_COLORS = { basic: "bg-slate-400", growth: "bg-indigo-500", pro: "bg-amber-500" };

export default function DashboardAnalytics() {
  const [data, setData] = useState(null);
  const [reminderDays, setReminderDays] = useState(30);
  const [editVisits, setEditVisits] = useState(null);

  const load = () => api.analyticsDashboard(reminderDays).then(setData).catch(() => {});
  useEffect(() => { load(); }, [reminderDays]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  const totalPkg = Object.values(data.package_distribution || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5 mt-8" data-testid="dashboard-analytics">
      {/* Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 rounded-2xl border-slate-200 bg-gradient-to-br from-indigo-50 to-white" data-testid="revenue-total">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Total Pendapatan Terverifikasi</div>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 mt-1">{formatRupiah(data.revenue_total || 0)}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-slate-200" data-testid="revenue-month">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Pendapatan Bulan Ini</div>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-700 mt-1">{formatRupiah(data.revenue_this_month || 0)}</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Expiring domains */}
        <Card className="p-6 rounded-3xl border-slate-200" data-testid="widget-expiring">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-amber-600" /><h3 className="font-extrabold font-display text-slate-900">Domain Akan Expired</h3></div>
            <div className="flex items-center gap-2 text-xs">
              <Label className="text-slate-500">Reminder</Label>
              <Select value={String(reminderDays)} onValueChange={(v) => setReminderDays(Number(v))}>
                <SelectTrigger className="h-8 w-32 rounded-lg text-xs" data-testid="reminder-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 hari</SelectItem>
                  <SelectItem value="14">2 minggu</SelectItem>
                  <SelectItem value="30">1 bulan</SelectItem>
                  <SelectItem value="60">2 bulan</SelectItem>
                  <SelectItem value="90">3 bulan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(data.expiring_domains || []).length === 0 ? (
            <p className="text-sm text-slate-400 italic">Tidak ada domain yang akan expired dalam {reminderDays} hari ke depan.</p>
          ) : (
            <ul className="space-y-2">
              {data.expiring_domains.map((d) => (
                <li key={d.code} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition" data-testid={`expiring-${d.code}`}>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{d.business}</div>
                    <div className="text-xs text-slate-500 truncate">{d.buyer_name} · {d.package_name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.days_left <= 7 ? "bg-red-100 text-red-700" : d.days_left <= 14 ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>
                      {d.days_left} hari lagi
                    </div>
                    <a href={`https://wa.me/${d.buyer_whatsapp}?text=${encodeURIComponent(`Halo ${d.buyer_name}, domain toko ${d.business} kamu akan expired dalam ${d.days_left} hari. Mau perpanjang?`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1 hover:underline">
                      <MessageCircle className="w-3 h-3" /> WA reminder
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Top traffic */}
        <Card className="p-6 rounded-3xl border-slate-200" data-testid="widget-traffic">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" /><h3 className="font-extrabold font-display text-slate-900">Toko Klien Terpopuler</h3></div>
            <Button size="sm" variant="outline" onClick={() => setEditVisits({})} className="text-xs rounded-full" data-testid="visits-edit-btn"><Edit3 className="w-3 h-3 mr-1" /> Input/Update Visits</Button>
          </div>
          {(data.top_traffic_clients || []).length === 0 ? (
            <div className="text-sm text-slate-400 italic">
              <p>Belum ada data kunjungan.</p>
              <p className="mt-1 text-xs">Tip: input <strong>monthly_visits</strong> dari Google Analytics klien tiap bulan supaya kamu bisa lihat trend & tawarkan service spesial ke klien paling ramai.</p>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {data.top_traffic_clients.map((c, idx) => (
                  <li key={c.code} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50" data-testid={`traffic-${c.code}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-500 text-white flex items-center justify-center font-extrabold font-display text-sm">{idx + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 truncate">{c.business}</div>
                      <div className="text-xs text-slate-500">{c.monthly_visits.toLocaleString("id-ID")} kunjungan/bulan</div>
                    </div>
                    <a href={`https://wa.me/${c.buyer_whatsapp}?text=${encodeURIComponent(`Halo ${c.buyer_name}! Toko kamu lagi ramai banget. Saya mau tawarkan service khusus untuk klien aktif.`)}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-bold hover:underline">Offer →</a>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><strong>Strategi:</strong> Kasih diskon perpanjang domain 10-15% untuk top 3 klien — mereka biasanya yang paling potensial direferensikan ke teman bisnisnya.</span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Package distribution */}
      <Card className="p-6 rounded-3xl border-slate-200" data-testid="widget-packages">
        <div className="flex items-center gap-2 mb-4"><PieChart className="w-5 h-5 text-indigo-600" /><h3 className="font-extrabold font-display text-slate-900">Distribusi Paket yang Dipilih Klien</h3></div>
        {totalPkg === 0 ? (
          <p className="text-sm text-slate-400 italic">Belum ada data paket.</p>
        ) : (
          <>
            <div className="space-y-3">
              {Object.entries(data.package_distribution).map(([pid, count]) => {
                const pct = (count / totalPkg) * 100;
                return (
                  <div key={pid} data-testid={`pkg-bar-${pid}`}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-bold capitalize text-slate-900">{pid}</span>
                      <span className="text-slate-500">{count} order · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${PACKAGE_COLORS[pid] || "bg-slate-400"} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {data.package_strategy && (
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-2 text-sm text-indigo-900" data-testid="package-strategy">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span><strong>Saran strategi:</strong> {data.package_strategy}</span>
              </div>
            )}
          </>
        )}
      </Card>

      <VisitsEditDialog open={!!editVisits} onClose={() => setEditVisits(null)} onDone={load} />
    </div>
  );
}

function VisitsEditDialog({ open, onClose, onDone }) {
  const [orders, setOrders] = useState([]);
  const [busyCode, setBusyCode] = useState(null);

  useEffect(() => {
    if (!open) return;
    api.listOrders().then((list) => setOrders(list.filter((o) => o.status === "completed"))).catch(() => {});
  }, [open]);

  const update = async (code, visits) => {
    setBusyCode(code);
    try { await api.updateOrderVisits(code, Number(visits) || 0); toast.success("Data kunjungan diperbarui."); onDone?.(); }
    catch (e) { toast.error(e.message); }
    finally { setBusyCode(null); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose} data-testid="visits-dialog">
      <Card className="max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-extrabold font-display text-lg mb-2">Input Kunjungan Bulanan</h3>
        <p className="text-xs text-slate-500 mb-4">Update angka dari Google Analytics/Plausible klien per bulan.</p>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Belum ada order completed.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <VisitsRow key={o.code} order={o} onSave={(v) => update(o.code, v)} busy={busyCode === o.code} />
            ))}
          </div>
        )}
        <Button onClick={onClose} variant="outline" className="w-full mt-4 rounded-full">Tutup</Button>
      </Card>
    </div>
  );
}

function VisitsRow({ order, onSave, busy }) {
  const [v, setV] = useState(order.monthly_visits || 0);
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50" data-testid={`visits-row-${order.code}`}>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-slate-900 truncate">{order.buyer_business}</div>
        <div className="text-[10px] text-slate-500">{order.code}</div>
      </div>
      <Input type="number" min="0" value={v} onChange={(e) => setV(e.target.value)} className="w-24 rounded-xl h-9" data-testid={`visits-input-${order.code}`} />
      <Button size="sm" onClick={() => onSave(v)} disabled={busy} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white" data-testid={`visits-save-${order.code}`}>
        Simpan
      </Button>
    </div>
  );
}

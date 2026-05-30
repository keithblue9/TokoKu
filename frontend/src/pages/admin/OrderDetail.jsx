import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, STATUS_META, formatDateTime } from "@/lib/api";
import { formatRupiah } from "@/lib/configStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, MessageCircle, Star, Send, Clock, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, Trash2, Loader2, Copy, Calendar, ExternalLink
} from "lucide-react";

const COLOR_CLS = {
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  red: "bg-red-100 text-red-800 border-red-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: "slate" };
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${COLOR_CLS[meta.color]}`}>{meta.label}</span>;
}

export default function AdminOrderDetail() {
  const { code } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const pollRef = useRef();

  const refresh = useCallback(async () => {
    try {
      const o = await api.getOrder(code);
      setOrder(o);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 10000);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const action = async (fn, msg) => {
    try {
      const o = await fn();
      setOrder(o);
      if (msg) toast.success(msg);
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const trackingUrl = `${window.location.origin}/order/${order.tracking_token}`;
  const waMessage = (msg) =>
    `https://wa.me/${(order.buyer_whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;

  const copyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      toast.success("Link tracking disalin.");
    } catch { toast.error("Gagal menyalin link."); }
  };

  return (
    <div data-testid="admin-order-detail">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link to="/admin/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900" data-testid="order-detail-back">
          <ArrowLeft className="w-4 h-4" /> Semua Order
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} className="rounded-full" data-testid="order-detail-refresh">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={async () => {
              if (!window.confirm("Hapus order ini? Tidak bisa dibatalkan.")) return;
              try { await api.sellerDelete(order.code); toast.success("Order dihapus."); nav("/admin/orders"); }
              catch (e) { toast.error(e.message); }
            }}
            className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
            data-testid="order-detail-delete"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus
          </Button>
        </div>
      </div>

      {/* Header card */}
      <Card className="p-6 rounded-3xl border-slate-200 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Order</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight" data-testid="detail-order-code">{order.code}</div>
            <div className="text-sm text-slate-500 mt-1">
              {order.buyer_name} · <span className="font-semibold text-slate-700">{order.buyer_business}</span>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-sm">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Paket</div>
            <div className="font-bold text-slate-900">{order.package_name}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Harga Setup</div>
            <div className="font-bold text-slate-900">{formatRupiah(order.package_setup_price)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Revisi</div>
            <div className="font-bold text-slate-900">{order.revisions_used}/{order.revisions_allowed}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Dibuat</div>
            <div className="font-bold text-slate-900 text-xs">{formatDateTime(order.created_at)}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <a href={waMessage(`Halo ${order.buyer_name}, terkait order ${order.code}.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white rounded-full px-4 py-2 text-xs font-bold w-fit" data-testid="detail-wa">
            <MessageCircle className="w-3.5 h-3.5" /> Chat WA Buyer
          </a>
          <button onClick={copyTrackingLink} className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-4 py-2 text-xs font-bold w-fit" data-testid="detail-copy-tracking">
            <Copy className="w-3.5 h-3.5" /> Salin Link Tracking
          </button>
        </div>
      </Card>

      {/* Action card based on status */}
      <ActionCard order={order} onPropose={() => setProposeOpen(true)} onReject={() => setRejectOpen(true)} onDeliver={() => setDeliverOpen(true)} onAcceptNego={() => action(() => api.sellerAcceptNegotiation(order.code), "Negosiasi diterima. Pengerjaan dimulai.")} />

      {/* Brief */}
      <Card className="p-6 rounded-3xl border-slate-200 mt-5">
        <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Brief dari Buyer</h3>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{order.buyer_brief}</p>
      </Card>

      {/* History */}
      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <DeliveriesCard order={order} />
        <RevisionsCard order={order} />
      </div>

      {/* Review */}
      {order.review_at && (
        <Card className="p-6 rounded-3xl border-slate-200 mt-5" data-testid="review-card">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Review Buyer</h3>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-slate-700">Tampilkan di publik</Label>
              <Switch checked={order.review_visible !== false} onCheckedChange={(v) => action(() => api.sellerToggleReview(order.code, v), v ? "Review ditampilkan." : "Review disembunyikan.")} data-testid="review-visibility-toggle" />
            </div>
          </div>
          <div className="flex gap-0.5 mb-3">
            {[1,2,3,4,5].map((n) => <Star key={n} className={`w-4 h-4 ${n <= order.review_rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}
          </div>
          <p className="text-sm text-slate-700 italic leading-relaxed">"{order.review_message}"</p>
          <p className="text-xs text-slate-400 mt-2">{formatDateTime(order.review_at)}</p>
        </Card>
      )}

      {/* Chat */}
      <ChatBox order={order} onSent={refresh} />

      {/* Dialogs */}
      <ProposeDialog open={proposeOpen} onOpenChange={setProposeOpen} suggested={order.negotiated_days || order.proposed_days || 5} onSubmit={async ({ days, note }) => {
        await action(() => api.sellerPropose(order.code, days, note), "Penawaran durasi terkirim ke buyer.");
        setProposeOpen(false);
      }} />
      <RejectDialog open={rejectOpen} onOpenChange={setRejectOpen} onSubmit={async ({ reason }) => {
        await action(() => api.sellerReject(order.code, reason), "Order ditolak.");
        setRejectOpen(false);
      }} />
      <DeliverDialog open={deliverOpen} onOpenChange={setDeliverOpen} isRevision={order.status === "revision_requested"} onSubmit={async ({ url, notes }) => {
        await action(() => api.sellerDeliver(order.code, url, notes), "Hasil terkirim ke buyer.");
        setDeliverOpen(false);
      }} />
    </div>
  );
}

function ActionCard({ order, onPropose, onReject, onDeliver, onAcceptNego }) {
  switch (order.status) {
    case "pending_review":
      return (
        <Card className="p-5 rounded-3xl border-2 border-amber-300 bg-amber-50/40" data-testid="action-card-pending">
          <h3 className="font-extrabold font-display text-lg text-slate-900 mb-1">Order baru menunggu penawaran durasi</h3>
          <p className="text-sm text-slate-600 mb-4">Review brief buyer di bawah, lalu ajukan estimasi durasi pengerjaan.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onPropose} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="seller-propose-btn">
              <Calendar className="w-4 h-4 mr-2" /> Ajukan Durasi
            </Button>
            <Button onClick={onReject} variant="outline" className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 font-bold" data-testid="seller-reject-btn">
              <XCircle className="w-4 h-4 mr-2" /> Tolak Order
            </Button>
          </div>
        </Card>
      );
    case "awaiting_buyer":
      return (
        <Card className="p-5 rounded-3xl border-2 border-indigo-200 bg-indigo-50/40" data-testid="action-card-awaiting">
          <h3 className="font-extrabold font-display text-lg text-slate-900">Menunggu keputusan buyer</h3>
          <p className="text-sm text-slate-600 mt-1">Kamu sudah ajukan durasi <span className="font-bold">{order.proposed_days} hari</span> ke buyer. Tunggu mereka accept atau nego.</p>
        </Card>
      );
    case "negotiating":
      return (
        <Card className="p-5 rounded-3xl border-2 border-amber-300 bg-amber-50/40" data-testid="action-card-negotiating">
          <h3 className="font-extrabold font-display text-lg text-slate-900">Buyer mengajukan nego durasi</h3>
          <p className="text-sm text-slate-700 mt-2">Buyer minta <span className="font-bold">{order.negotiated_days} hari</span> (sebelumnya kamu ajukan {order.proposed_days} hari).</p>
          <p className="text-sm text-slate-600 italic mt-1">Alasan: "{order.negotiation_reason}"</p>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button onClick={onAcceptNego} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold" data-testid="seller-accept-nego">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Setuju & Mulai
            </Button>
            <Button onClick={onPropose} variant="outline" className="rounded-full font-bold" data-testid="seller-counter">
              <Calendar className="w-4 h-4 mr-2" /> Ajukan Durasi Lain
            </Button>
            <Button onClick={onReject} variant="outline" className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 font-bold" data-testid="seller-reject-nego">
              <XCircle className="w-4 h-4 mr-2" /> Tolak
            </Button>
          </div>
        </Card>
      );
    case "in_progress":
      return (
        <Card className="p-5 rounded-3xl border-2 border-indigo-300 bg-indigo-50/40" data-testid="action-card-progress">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-extrabold font-display text-lg text-slate-900">Sedang dikerjakan</h3>
              <p className="text-sm text-slate-600 mt-1">Durasi disepakati <span className="font-bold">{order.accepted_days} hari</span>. Estimasi selesai {formatDateTime(order.expected_finish_at)}.</p>
              <Button onClick={onDeliver} className="mt-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold" data-testid="seller-deliver-btn">
                <Send className="w-4 h-4 mr-2" /> Kirim Hasil ke Buyer
              </Button>
            </div>
          </div>
        </Card>
      );
    case "revision_requested": {
      const last = (order.revision_requests || []).slice(-1)[0];
      return (
        <Card className="p-5 rounded-3xl border-2 border-amber-300 bg-amber-50/40" data-testid="action-card-revision">
          <h3 className="font-extrabold font-display text-lg text-slate-900">Buyer meminta revisi</h3>
          {last && <p className="text-sm text-slate-700 mt-2 italic">"{last.message}"</p>}
          <Button onClick={onDeliver} className="mt-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="seller-deliver-revision-btn">
            <Send className="w-4 h-4 mr-2" /> Kirim Hasil Revisi
          </Button>
        </Card>
      );
    }
    case "delivered":
      return (
        <Card className="p-5 rounded-3xl border-2 border-emerald-300 bg-emerald-50/40" data-testid="action-card-delivered">
          <h3 className="font-extrabold font-display text-lg text-slate-900">Hasil sudah dikirim ke buyer</h3>
          <p className="text-sm text-slate-600 mt-1">Menunggu buyer review hasilnya. Jatah revisi tersisa: {order.revisions_allowed - order.revisions_used}x.</p>
          {order.delivered_url && (
            <a href={order.delivered_url.startsWith("http") ? order.delivered_url : `https://${order.delivered_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-indigo-600 font-bold text-sm hover:underline break-all">
              <ExternalLink className="w-4 h-4" /> {order.delivered_url}
            </a>
          )}
        </Card>
      );
    case "completed":
      return (
        <Card className="p-5 rounded-3xl border-2 border-emerald-300 bg-emerald-50/40" data-testid="action-card-completed">
          <h3 className="font-extrabold font-display text-lg text-slate-900">Order selesai 🎉</h3>
          <p className="text-sm text-slate-600 mt-1">Selesai pada {formatDateTime(order.finished_at)}.</p>
        </Card>
      );
    case "rejected":
      return (
        <Card className="p-5 rounded-3xl border-2 border-red-200 bg-red-50/40" data-testid="action-card-rejected">
          <h3 className="font-extrabold font-display text-lg text-slate-900">Order ditolak</h3>
          <p className="text-sm text-slate-700 mt-1">Alasan: {order.reject_reason}</p>
        </Card>
      );
    default:
      return null;
  }
}

function DeliveriesCard({ order }) {
  const items = order.delivery_history || [];
  return (
    <Card className="p-6 rounded-2xl border-slate-200" data-testid="deliveries-card">
      <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Riwayat Delivery</h3>
      {items.length === 0 && <p className="text-sm text-slate-400 italic">Belum ada delivery.</p>}
      <ul className="space-y-3">
        {items.map((d, i) => (
          <li key={i} className="text-sm border-l-2 border-indigo-200 pl-3">
            <div className="font-bold text-slate-900">{d.is_revision ? `Revisi #${i}` : "Delivery awal"}</div>
            <a href={d.url.startsWith("http") ? d.url : `https://${d.url}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">{d.url}</a>
            {d.notes && <div className="text-slate-600 mt-1">{d.notes}</div>}
            <div className="text-[11px] text-slate-400 mt-1">{formatDateTime(d.at)}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RevisionsCard({ order }) {
  const items = order.revision_requests || [];
  return (
    <Card className="p-6 rounded-2xl border-slate-200" data-testid="revisions-card">
      <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Permintaan Revisi ({items.length}/{order.revisions_allowed})</h3>
      {items.length === 0 && <p className="text-sm text-slate-400 italic">Belum ada permintaan revisi.</p>}
      <ul className="space-y-3">
        {items.map((r, i) => (
          <li key={i} className="text-sm border-l-2 border-amber-200 pl-3">
            <div className="font-bold text-slate-900">Revisi #{i + 1}</div>
            <div className="text-slate-700 italic">"{r.message}"</div>
            <div className="text-[11px] text-slate-400 mt-1">{formatDateTime(r.at)}</div>
            {r.resolved_at && (
              <div className="text-[11px] text-emerald-600 mt-1">✓ Diselesaikan {formatDateTime(r.resolved_at)}</div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ChatBox({ order, onSent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.sellerMessage(order.code, text.trim());
      setText("");
      onSent?.();
    } catch (e) { toast.error(e.message); }
    finally { setSending(false); }
  };

  return (
    <Card className="p-6 rounded-2xl border-slate-200 mt-5" data-testid="seller-chat-box">
      <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Diskusi dengan Buyer</h3>
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1 mb-4">
        {(order.messages || []).length === 0 && (
          <p className="text-sm text-slate-400 italic">Belum ada pesan.</p>
        )}
        {(order.messages || []).map((m, i) => {
          const isSeller = m.by === "seller";
          return (
            <div key={i} className={`flex ${isSeller ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isSeller ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                <div className="text-[10px] font-bold uppercase opacity-70 mb-0.5">{isSeller ? "Kamu (Seller)" : "Buyer"}</div>
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                <div className="text-[10px] opacity-60 mt-1">{formatDateTime(m.at)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Balas pesan buyer..." className="rounded-xl" onKeyDown={(e) => e.key === "Enter" && send()} data-testid="seller-chat-input" />
        <Button onClick={send} disabled={sending || !text.trim()} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="seller-chat-send">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

function ProposeDialog({ open, onOpenChange, suggested, onSubmit }) {
  const [days, setDays] = useState(suggested);
  const [note, setNote] = useState("");
  useEffect(() => { setDays(suggested); }, [suggested]);
  const [err, setErr] = useState("");
  const submit = () => {
    setErr("");
    if (!days || days < 1) return setErr("Durasi tidak valid.");
    onSubmit({ days: Number(days), note });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl" data-testid="propose-dialog">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-slate-900">Ajukan Durasi Pengerjaan</DialogTitle>
          <DialogDescription>Estimasi hari kerja yang dibutuhkan untuk menyelesaikan toko ini.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Durasi (hari)</Label>
            <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} className="rounded-xl" data-testid="propose-days" />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Catatan untuk Buyer (opsional)</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. termasuk 1x revisi, 5 halaman, dll." className="rounded-xl" data-testid="propose-note" />
          </div>
          {err && <div className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{err}</div>}
          <Button onClick={submit} className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="propose-submit">
            Kirim Penawaran
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ open, onOpenChange, onSubmit }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    setErr("");
    if (reason.trim().length < 3) return setErr("Mohon jelaskan alasannya.");
    onSubmit({ reason });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl" data-testid="reject-dialog">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-slate-900">Tolak Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan penolakan (akan terlihat oleh buyer)" className="rounded-xl" data-testid="reject-reason" />
          {err && <div className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{err}</div>}
          <Button onClick={submit} variant="destructive" className="w-full rounded-full font-bold" data-testid="reject-submit">
            Tolak Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeliverDialog({ open, onOpenChange, isRevision, onSubmit }) {
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    setErr("");
    if (url.trim().length < 4) return setErr("URL toko harus diisi.");
    onSubmit({ url, notes });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl" data-testid="deliver-dialog">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-slate-900">
            {isRevision ? "Kirim Hasil Revisi" : "Kirim Hasil Toko"}
          </DialogTitle>
          <DialogDescription>Buyer akan dapat akses link ini di halaman tracking mereka.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">URL Toko / Web</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://nama-toko.com" className="rounded-xl" data-testid="deliver-url" />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Catatan (opsional)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mis. login admin: ..." className="rounded-xl" data-testid="deliver-notes" />
          </div>
          {err && <div className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{err}</div>}
          <Button onClick={submit} className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="deliver-submit">
            Kirim ke Buyer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

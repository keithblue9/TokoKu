import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api, STATUS_META, formatDateTime } from "@/lib/api";
import { useConfig, formatRupiah } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaymentSection, { PaymentReviewBanner } from "@/components/buyer/PaymentSection";
import { toast } from "sonner";
import {
  ArrowLeft, MessageCircle, Star, Send, Clock, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, ExternalLink, Loader2, ThumbsUp, ThumbsDown, Trophy
} from "lucide-react";

const COLOR_CLS = {
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  red: "bg-red-100 text-red-800 border-red-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

function StatusBadge({ status, forBuyer = true }) {
  const meta = STATUS_META[status] || { label: status, color: "slate", buyerLabel: status };
  const label = forBuyer ? meta.buyerLabel : meta.label;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${COLOR_CLS[meta.color]}`} data-testid="status-badge">
      <span className={`w-1.5 h-1.5 rounded-full bg-current opacity-70`} />
      {label}
    </span>
  );
}

function CountdownTimer({ startedAt, expectedFinishAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!startedAt || !expectedFinishAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(expectedFinishAt).getTime();
  const total = end - start;
  const elapsed = now - start;
  const remaining = Math.max(0, end - now);
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return (
    <Card className="p-5 rounded-2xl border-slate-200" data-testid="timer-card">
      <div className="flex items-center gap-2 mb-3 text-indigo-600">
        <Clock className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Timer Pengerjaan</span>
      </div>
      <div className="flex items-end gap-3 mb-3 flex-wrap">
        <div>
          <div className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            {days}<span className="text-base text-slate-500">d </span>
            {String(hours).padStart(2,"0")}<span className="text-base text-slate-500">h </span>
            {String(minutes).padStart(2,"0")}<span className="text-base text-slate-500">m </span>
            {String(seconds).padStart(2,"0")}<span className="text-base text-slate-500">s</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Sisa waktu pengerjaan</div>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>Mulai: {formatDateTime(startedAt)}</span>
        <span>Estimasi selesai: {formatDateTime(expectedFinishAt)}</span>
      </div>
    </Card>
  );
}

function Timeline({ order }) {
  const items = [];
  items.push({ at: order.created_at, title: "Order diterima", desc: "Tim kami sedang me-review brief kamu." });
  if (order.proposed_at) items.push({ at: order.proposed_at, title: `Seller mengajukan durasi ${order.proposed_days} hari`, desc: order.proposal_note });
  if (order.negotiated_at) items.push({ at: order.negotiated_at, title: `Kamu menawar menjadi ${order.negotiated_days} hari`, desc: order.negotiation_reason });
  if (order.rejected_at) items.push({ at: order.rejected_at, title: "Order ditolak", desc: order.reject_reason });
  if (order.started_at) items.push({ at: order.started_at, title: `Pengerjaan dimulai (${order.accepted_days} hari)`, desc: null });
  (order.delivery_history || []).forEach((d, i) => {
    items.push({
      at: d.at,
      title: d.is_revision ? `Revisi #${i} dikirim` : "Hasil pertama dikirim",
      desc: d.url,
    });
  });
  (order.revision_requests || []).forEach((r, i) => {
    items.push({ at: r.at, title: `Kamu minta revisi #${i + 1}`, desc: r.message });
  });
  if (order.finished_at) items.push({ at: order.finished_at, title: "Order selesai!", desc: "Terima kasih sudah mempercayakan toko online kamu ke kami." });
  if (order.review_at) items.push({ at: order.review_at, title: `Kamu kasih rating ${order.review_rating}⭐`, desc: order.review_message });
  items.sort((a, b) => new Date(a.at) - new Date(b.at));

  return (
    <div className="space-y-4" data-testid="timeline">
      {items.map((it, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-100" />
            {i < items.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
          </div>
          <div className="flex-1 pb-2">
            <div className="text-sm font-bold text-slate-900">{it.title}</div>
            {it.desc && <div className="text-sm text-slate-600 mt-0.5">{it.desc}</div>}
            <div className="text-[11px] text-slate-400 mt-1">{formatDateTime(it.at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrderTrackPage() {
  const { token } = useParams();
  const { config } = useConfig();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const pollRef = useRef();

  const refresh = useCallback(async () => {
    try {
      const o = await api.trackOrder(token);
      setOrder(o);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 8000);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md p-8 text-center rounded-3xl">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-extrabold font-display text-slate-900 mb-2">Order tidak ditemukan</h2>
          <p className="text-sm text-slate-600 mb-6">{error || "Link tracking tidak valid."}</p>
          <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Kembali ke beranda
          </Link>
        </Card>
      </div>
    );
  }

  const action = async (fn, successMsg) => {
    try {
      const o = await fn();
      setOrder(o);
      if (successMsg) toast.success(successMsg);
    } catch (e) {
      toast.error(e.message || "Gagal memproses aksi.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16" data-testid="track-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 text-sm font-semibold" data-testid="track-back">
            <ArrowLeft className="w-4 h-4" /> Beranda
          </Link>
          <Button variant="outline" size="sm" onClick={refresh} className="rounded-full" data-testid="track-refresh">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Status header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Order</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight" data-testid="order-code">
              {order.code}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Paket <span className="font-bold text-slate-800">{order.package_name}</span> • {formatRupiah(order.package_setup_price)} setup
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Action area depending on status */}
        {order.status === "awaiting_buyer" && (
          <Card className="p-6 rounded-3xl border-2 border-indigo-300 bg-indigo-50/50" data-testid="action-awaiting">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold font-display text-lg text-slate-900">Seller mengajukan durasi {order.proposed_days} hari kerja</h3>
                {order.proposal_note && <p className="text-sm text-slate-700 mt-1">Catatan seller: <em>{order.proposal_note}</em></p>}
                <div className="bg-white/60 rounded-xl p-3 mt-3 text-xs text-slate-600">
                  Setelah kamu accept, lanjut ke step pembayaran ({order.payment_mode === "full" ? "Full" : `DP ${order.dp_percent || 50}%`} = {formatRupiah(order.payment_mode === "full" ? order.total_amount : order.dp_amount)}).
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button onClick={() => action(() => api.buyerAccept(token), "Order diterima! Lanjut ke pembayaran.")} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold" data-testid="action-accept">
                    <ThumbsUp className="w-4 h-4 mr-2" /> Setuju & Lanjut Bayar
                  </Button>
                  <Button onClick={() => setNegotiateOpen(true)} variant="outline" className="rounded-full font-bold" data-testid="action-negotiate">
                    <ThumbsDown className="w-4 h-4 mr-2" /> Nego Durasi
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {(order.status === "awaiting_payment" || order.status === "awaiting_settlement") && (
          <PaymentSection order={order} onSubmitted={(o) => setOrder(o)} />
        )}

        {(order.status === "payment_review" || order.status === "settlement_review") && (
          <PaymentReviewBanner order={order} />
        )}

        {order.status === "in_progress" && order.started_at && (
          <CountdownTimer startedAt={order.started_at} expectedFinishAt={order.expected_finish_at} />
        )}

        {order.status === "delivered" && (
          <Card className="p-6 rounded-3xl border-2 border-emerald-300 bg-emerald-50/50" data-testid="action-delivered">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold font-display text-lg text-slate-900">Hasil tokomu sudah siap!</h3>
                {order.delivery_notes && <p className="text-sm text-slate-700 mt-1"><em>{order.delivery_notes}</em></p>}
                <a href={order.delivered_url?.startsWith("http") ? order.delivered_url : `https://${order.delivered_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-indigo-600 font-bold text-sm hover:underline break-all" data-testid="delivered-url">
                  <ExternalLink className="w-4 h-4" /> {order.delivered_url}
                </a>
                <div className="text-xs text-slate-500 mt-2">
                  Jatah revisi: <span className="font-bold">{order.revisions_used}/{order.revisions_allowed}</span> terpakai
                </div>
                {order.payment_mode === "dp" && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Setelah finish, kamu akan diarahkan ke step <strong>pelunasan</strong> {formatRupiah(order.settlement_amount)}.</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    onClick={() => action(() => api.buyerRequestFinish(token), order.payment_mode === "dp" ? "Lanjut ke pelunasan!" : "Order selesai!")}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    data-testid="action-finish"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {order.payment_mode === "dp" ? "Setuju & Lanjut Pelunasan" : "Finish Order"}
                  </Button>
                  {order.revisions_used < order.revisions_allowed && (
                    <Button onClick={() => setReviseOpen(true)} variant="outline" className="rounded-full font-bold" data-testid="action-revise">
                      <RefreshCw className="w-4 h-4 mr-2" /> Minta Revisi ({order.revisions_allowed - order.revisions_used} tersisa)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {order.status === "negotiating" && (
          <Card className="p-6 rounded-3xl border-2 border-amber-300 bg-amber-50/50" data-testid="action-negotiating">
            <h3 className="font-extrabold font-display text-lg text-slate-900">Negosiasi kamu sudah dikirim ke seller</h3>
            <p className="text-sm text-slate-700 mt-2">Kamu menawar <span className="font-bold">{order.negotiated_days} hari</span>. Seller akan memberi keputusan secepatnya.</p>
            <p className="text-sm text-slate-600 mt-2"><em>"{order.negotiation_reason}"</em></p>
          </Card>
        )}

        {order.status === "rejected" && (
          <Card className="p-6 rounded-3xl border-2 border-red-300 bg-red-50/50" data-testid="action-rejected">
            <h3 className="font-extrabold font-display text-lg text-slate-900">Order kamu ditolak seller</h3>
            <p className="text-sm text-slate-700 mt-2">Alasan: <em>{order.reject_reason}</em></p>
          </Card>
        )}

        {order.status === "completed" && (
          <Card className="p-6 rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-amber-50" data-testid="action-completed">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold font-display text-lg text-slate-900">Order selesai 🎉</h3>
                <p className="text-sm text-slate-700 mt-1">Toko kamu sudah live di <a href={order.delivered_url?.startsWith("http") ? order.delivered_url : `https://${order.delivered_url}`} target="_blank" rel="noreferrer" className="font-bold text-indigo-600 hover:underline">{order.delivered_url}</a></p>
                {!order.review_at && (
                  <Button onClick={() => setReviewOpen(true)} className="mt-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="action-review">
                    <Star className="w-4 h-4 mr-2" /> Beri Review
                  </Button>
                )}
                {order.review_at && (
                  <div className="mt-3 text-sm text-slate-700">
                    Kamu kasih rating <span className="font-bold">{order.review_rating}⭐</span> — terima kasih!
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 rounded-2xl border-slate-200">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Timeline</h3>
            <Timeline order={order} />
          </Card>

          <div className="space-y-4">
            <Card className="p-6 rounded-2xl border-slate-200">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Brief Kamu</h3>
              <div className="text-sm text-slate-700 space-y-2">
                <div><span className="text-slate-500">Nama:</span> <span className="font-semibold">{order.buyer_name}</span></div>
                <div><span className="text-slate-500">Bisnis:</span> <span className="font-semibold">{order.buyer_business}</span></div>
                <div><span className="text-slate-500">WA:</span> <span className="font-semibold">{order.buyer_whatsapp}</span></div>
                <div className="pt-2 border-t border-slate-100 text-slate-600">{order.buyer_brief}</div>
              </div>
            </Card>
            <Card className="p-6 rounded-2xl border-slate-200">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Butuh bantuan?</h3>
              <a
                href={`https://wa.me/${(config.hero.whatsapp_number || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Halo, saya mau tanya soal order ${order.code}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white rounded-full px-5 py-2.5 text-sm font-bold w-full"
                data-testid="track-wa-help"
              >
                <MessageCircle className="w-4 h-4" /> Chat WhatsApp Seller
              </a>
            </Card>
          </div>
        </div>

        {/* Chat */}
        <ChatBox order={order} token={token} onSent={refresh} />
      </div>

      {/* Negotiate Dialog */}
      <NegotiateDialog open={negotiateOpen} onOpenChange={setNegotiateOpen} initialDays={order.proposed_days} onSubmit={async ({ days, reason }) => {
        await action(() => api.buyerNegotiate(token, days, reason), "Negosiasi terkirim ke seller.");
        setNegotiateOpen(false);
      }} />

      {/* Revise Dialog */}
      <ReviseDialog open={reviseOpen} onOpenChange={setReviseOpen} remaining={order.revisions_allowed - order.revisions_used} onSubmit={async ({ message }) => {
        await action(() => api.buyerRequestRevision(token, message), "Permintaan revisi terkirim.");
        setReviseOpen(false);
      }} />

      {/* Review Dialog */}
      <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} alreadyReviewed={!!order.review_at} status={order.status} onSubmit={async ({ rating, message }) => {
        if (order.status === "delivered") {
          // First finish then review
          await action(() => api.buyerFinish(token), "Order selesai!");
        }
        await action(() => api.buyerReview(token, rating, message), "Review terkirim, terima kasih!");
        setReviewOpen(false);
      }} />
    </div>
  );
}

function ChatBox({ order, token, onSent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.buyerMessage(token, text.trim());
      setText("");
      onSent?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl border-slate-200" data-testid="chat-box">
      <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Diskusi / Konsultasi</h3>
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1 mb-4">
        {(order.messages || []).length === 0 && (
          <p className="text-sm text-slate-400 italic">Belum ada pesan. Tinggalkan pesan kalau ada hal yang mau kamu diskusikan.</p>
        )}
        {(order.messages || []).map((m, i) => {
          const isBuyer = m.by === "buyer";
          return (
            <div key={i} className={`flex ${isBuyer ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isBuyer ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                <div className="text-[10px] font-bold uppercase opacity-70 mb-0.5">{isBuyer ? "Kamu" : "Seller"}</div>
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                <div className="text-[10px] opacity-60 mt-1">{formatDateTime(m.at)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pesan ke seller..."
          className="rounded-xl"
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          data-testid="chat-input"
        />
        <Button onClick={send} disabled={sending || !text.trim()} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="chat-send">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

function NegotiateDialog({ open, onOpenChange, initialDays, onSubmit }) {
  const [days, setDays] = useState(initialDays || 5);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    setErr("");
    if (!days || days < 1) return setErr("Durasi tidak valid.");
    if (reason.trim().length < 3) return setErr("Mohon isi alasannya.");
    onSubmit({ days: Number(days), reason });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl" data-testid="negotiate-dialog">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-slate-900">Nego Durasi Pengerjaan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Durasi yang kamu inginkan (hari)</Label>
            <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} className="rounded-xl" data-testid="negotiate-days" />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Alasan / Catatan untuk Seller</Label>
            <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. butuh launch sebelum tanggal X, dll" className="rounded-xl" data-testid="negotiate-reason" />
          </div>
          {err && <div className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{err}</div>}
          <Button onClick={submit} className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="negotiate-submit">
            Kirim Negosiasi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviseDialog({ open, onOpenChange, remaining, onSubmit }) {
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    setErr("");
    if (message.trim().length < 5) return setErr("Mohon jelaskan apa yang perlu direvisi (min 5 karakter).");
    onSubmit({ message });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl" data-testid="revise-dialog">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-slate-900">Minta Revisi</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 -mt-2">Jatah revisi tersisa: <span className="font-bold text-slate-900">{remaining}x</span>. Jelaskan kekurangan / yang perlu diperbaiki sespesifik mungkin.</p>
        <div className="space-y-4">
          <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mis. warna tombol mau diubah ke biru, font judul kurang besar, foto produk no.3 perlu diganti..." className="rounded-xl" data-testid="revise-message" />
          {err && <div className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{err}</div>}
          <Button onClick={submit} className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="revise-submit">
            Kirim Permintaan Revisi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({ open, onOpenChange, status, alreadyReviewed, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    setErr("");
    if (message.trim().length < 5) return setErr("Tulis testimoni kamu (min 5 karakter).");
    onSubmit({ rating, message });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl" data-testid="review-dialog">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-slate-900">
            {status === "delivered" ? "Selesaikan & Beri Review" : "Beri Review"}
          </DialogTitle>
        </DialogHeader>
        {status === "delivered" && (
          <p className="text-sm text-slate-600 -mt-2">Dengan klik kirim, order kamu otomatis ditandai <span className="font-bold">selesai</span> dan tidak bisa minta revisi lagi.</p>
        )}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Rating</Label>
            <div className="flex gap-1" data-testid="review-rating-picker">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className="p-1" data-testid={`review-star-${n}`}>
                  <Star className={`w-7 h-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Testimoni / Pesan</Label>
            <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Cerita pengalamanmu — apa yang paling kamu suka, hasil akhirnya gimana?" className="rounded-xl" data-testid="review-message" />
          </div>
          {err && <div className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{err}</div>}
          <Button onClick={submit} className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="review-submit">
            Kirim Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

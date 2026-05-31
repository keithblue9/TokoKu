import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/configStore";
import { compressImage, copyToClipboard } from "@/lib/imageUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  QrCode, Landmark, Wallet, Copy, Check, Upload, Loader2, CheckCircle2, XCircle,
  AlertCircle, Info, Receipt, Shield
} from "lucide-react";

function CopyableRow({ label, value, testid }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await copyToClipboard(String(value));
      setCopied(true);
      toast.success(`${label} disalin`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
        <div className="font-extrabold font-display text-slate-900 text-base sm:text-lg break-all" data-testid={testid}>{value}</div>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl transition active:scale-95"
        data-testid={`${testid}-copy`}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Tersalin" : "Salin"}
      </button>
    </div>
  );
}

// Decide what to pay right now based on the order state.
function getDueInfo(order) {
  if (order.status === "awaiting_settlement") {
    return { kind: "settlement", amount: order.settlement_amount };
  }
  const kind = order.payment_mode === "dp" ? "dp" : "full";
  const amount = kind === "dp" ? order.dp_amount : order.total_amount;
  return { kind, amount };
}

// Decide what to display in the "Sisa Pelunasan" tile based on the order state.
function getRemainingTileInfo(order, kind, isSettlement) {
  if (isSettlement) {
    return { label: "Sudah Dibayar", value: order.amount_paid };
  }
  if (kind === "dp") {
    return { label: "Sisa Pelunasan", value: order.settlement_amount };
  }
  return { label: "Sisa Pelunasan", value: 0 };
}

export default function PaymentSection({ order, onSubmitted }) {
  const [settings, setSettings] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [proofBase64, setProofBase64] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const isSettlement = order.status === "awaiting_settlement";
  const { kind, amount: amountDue } = getDueInfo(order);
  const remainingTile = getRemainingTileInfo(order, kind, isSettlement);

  useEffect(() => {
    api.getPaymentSettings().then(setSettings).catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    if (settings?.qris_image) setMethod("qris");
  }, [settings]);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    try {
      const compressed = await compressImage(f);
      setProofBase64(compressed);
      setProofPreview(compressed);
    } catch (err) {
      toast.error(err.message || "Gagal memproses gambar.");
    }
  };

  const submit = async () => {
    if (!proofBase64) {
      toast.error("Mohon upload bukti pembayaran terlebih dulu.");
      return;
    }
    setSubmitting(true);
    try {
      const o = await api.buyerSubmitPayment(order.tracking_token, {
        kind, amount: amountDue, method, proof_image: proofBase64, note,
      });
      toast.success("Bukti pembayaran terkirim! Seller akan verifikasi dalam waktu singkat.");
      onSubmitted?.(o);
    } catch (e) {
      toast.error(e.message || "Gagal submit pembayaran.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!settings) {
    return <Card className="p-8 rounded-3xl text-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" /></Card>;
  }

  const lastRejected = (order.payments || []).slice().reverse().find((p) => p.status === "rejected");

  return (
    <div className="space-y-5" data-testid="payment-section">
      {/* Step header */}
      <Card className="p-6 sm:p-8 rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white" data-testid="payment-header">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900 leading-tight">
              {isSettlement ? "Tinggal Pelunasan Terakhir" : "Pembayaran untuk Mulai Pengerjaan"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {isSettlement
                ? "Lunasi sisa pembayaran untuk menyelesaikan order. Setelah seller verifikasi, status order otomatis selesai."
                : (kind === "dp"
                  ? `Kamu memilih DP ${order.dp_percent || 50}%. Bayar dulu DP-nya, sisa pelunasan setelah hasil siap.`
                  : "Kamu memilih bayar full. Sekali bayar, kerja langsung dimulai dan selesai tanpa ribet di akhir.")}
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-slate-200">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Order</div>
                <div className="text-lg font-extrabold font-display text-slate-900 mt-1">{formatRupiah(order.total_amount)}</div>
              </div>
              <div className="bg-indigo-600 rounded-2xl p-4 ring-4 ring-indigo-100" data-testid="amount-due-card">
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">Bayar Sekarang</div>
                <div className="text-xl sm:text-2xl font-extrabold font-display text-white mt-1">{formatRupiah(amountDue)}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{remainingTile.label}</div>
                <div className="text-lg font-extrabold font-display text-slate-900 mt-1">
                  {formatRupiah(remainingTile.value)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {lastRejected && order.status !== "payment_review" && order.status !== "settlement_review" && (
        <Card className="p-4 rounded-2xl border-red-200 bg-red-50 flex items-start gap-3" data-testid="payment-rejected-notice">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <div className="font-bold">Pembayaran sebelumnya ditolak</div>
            <div className="mt-1">Alasan: <em>{lastRejected.rejection_reason}</em></div>
            <div className="mt-1 text-xs">Mohon upload ulang bukti pembayaran yang valid.</div>
          </div>
        </Card>
      )}

      {/* Step 1: Choose method */}
      <Card className="p-5 sm:p-6 rounded-3xl border-slate-200" data-testid="payment-method-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-extrabold font-display">1</div>
          <h3 className="font-extrabold font-display text-slate-900 text-lg">Pilih Metode Pembayaran</h3>
        </div>

        <Tabs value={method} onValueChange={setMethod} data-testid="payment-method-tabs">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl h-auto p-1 bg-slate-100">
            <TabsTrigger value="qris" className="rounded-xl py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md text-xs sm:text-sm font-bold gap-1.5" data-testid="tab-qris">
              <QrCode className="w-3.5 h-3.5" /> QRIS
            </TabsTrigger>
            <TabsTrigger value="bank_transfer" className="rounded-xl py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md text-xs sm:text-sm font-bold gap-1.5" data-testid="tab-bank">
              <Landmark className="w-3.5 h-3.5" /> Transfer Bank
            </TabsTrigger>
            <TabsTrigger value="ewallet" className="rounded-xl py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md text-xs sm:text-sm font-bold gap-1.5" data-testid="tab-ewallet">
              <Wallet className="w-3.5 h-3.5" /> E-Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qris" className="mt-5" data-testid="qris-panel">
            {settings.qris_image ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <img src={settings.qris_image} alt="QRIS" className="w-64 h-64 object-contain rounded-2xl bg-white border-2 border-slate-200 p-3" data-testid="qris-image" />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[11px] font-bold px-3 py-1 rounded-full">QRIS</div>
                </div>
                {settings.qris_merchant_name && (
                  <div className="text-xs text-slate-500">Merchant: <span className="font-bold text-slate-700">{settings.qris_merchant_name}</span></div>
                )}
                <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Cara bayar:</strong> Scan QR ini pakai aplikasi bank/e-wallet kamu (BCA, Mandiri, GoPay, OVO, DANA, ShopeePay, dll). Lalu masukkan nominal di bawah ini.
                    </div>
                  </div>
                </div>
                <div className="w-full bg-slate-50 rounded-2xl px-4 divide-y divide-slate-100">
                  <CopyableRow label="Nominal yang Harus Dibayar" value={formatRupiah(amountDue)} testid="qris-amount" />
                  <CopyableRow label="Kode Order (catat di berita transfer)" value={order.code} testid="qris-code" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">QRIS belum disetel seller. Pilih metode lain.</div>
            )}
          </TabsContent>

          <TabsContent value="bank_transfer" className="mt-5" data-testid="bank-panel">
            {settings.bank_account_number ? (
              <div className="bg-slate-50 rounded-2xl px-4 sm:px-5 divide-y divide-slate-100">
                <CopyableRow label="Bank" value={settings.bank_name || "-"} testid="bank-name" />
                <CopyableRow label="No. Rekening" value={settings.bank_account_number} testid="bank-account" />
                <CopyableRow label="Atas Nama" value={settings.bank_account_holder || "-"} testid="bank-holder" />
                <CopyableRow label="Nominal" value={formatRupiah(amountDue)} testid="bank-amount" />
                <CopyableRow label="Berita Transfer (WAJIB)" value={order.code} testid="bank-code" />
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">Rekening bank belum disetel seller. Pilih metode lain.</div>
            )}
          </TabsContent>

          <TabsContent value="ewallet" className="mt-5" data-testid="ewallet-panel">
            {settings.ewallet_info ? (
              <div className="space-y-3">
                <Card className="p-4 rounded-2xl border-slate-200 bg-slate-50">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">E-Wallet</div>
                  <p className="text-sm whitespace-pre-wrap text-slate-700">{settings.ewallet_info}</p>
                </Card>
                <div className="bg-slate-50 rounded-2xl px-4 divide-y divide-slate-100">
                  <CopyableRow label="Nominal" value={formatRupiah(amountDue)} testid="ewallet-amount" />
                  <CopyableRow label="Kode Order (catat di pesan)" value={order.code} testid="ewallet-code" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">E-wallet belum disetel seller. Pilih metode lain.</div>
            )}
          </TabsContent>
        </Tabs>

        {settings.payment_instructions && (
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{settings.payment_instructions}</span>
          </div>
        )}
      </Card>

      {/* Step 2: Upload proof */}
      <Card className="p-5 sm:p-6 rounded-3xl border-slate-200" data-testid="payment-proof-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-extrabold font-display">2</div>
          <h3 className="font-extrabold font-display text-slate-900 text-lg">Upload Bukti Pembayaran</h3>
        </div>

        {!proofPreview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-2xl p-8 sm:p-12 text-center transition group"
            data-testid="upload-proof-btn"
          >
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mx-auto mb-3 transition" />
            <div className="font-bold text-slate-700">Klik untuk upload foto bukti transfer</div>
            <div className="text-xs text-slate-500 mt-1">JPG/PNG, otomatis dikompres ke maks ~500KB</div>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img src={proofPreview} alt="Bukti" className="max-h-72 rounded-2xl border border-slate-200" data-testid="proof-preview" />
              <button
                onClick={() => { setProofPreview(null); setProofBase64(""); }}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg hover:bg-red-600"
                data-testid="remove-proof"
              >×</button>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              Ganti gambar
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="proof-input" />

        <div className="mt-4">
          <Label className="text-sm font-semibold mb-1.5 block">Catatan untuk Seller (opsional)</Label>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mis. transfer dari rek BCA an. ..."
            className="rounded-xl"
            data-testid="proof-note"
          />
        </div>
      </Card>

      {/* Step 3: Submit */}
      <Card className="p-5 sm:p-6 rounded-3xl border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-extrabold font-display">3</div>
          <h3 className="font-extrabold font-display text-slate-900 text-lg">Konfirmasi Pembayaran</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Pastikan nominal & bukti sudah benar. Seller akan verifikasi paling lambat 1×24 jam (biasanya jauh lebih cepat saat jam kerja).
        </p>
        <Button
          onClick={submit}
          disabled={!proofBase64 || submitting}
          className="w-full h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          data-testid="submit-payment"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
          {submitting ? "Mengirim..." : `Kirim Bukti ${kind === "settlement" ? "Pelunasan" : "Pembayaran"}`}
        </Button>
      </Card>
    </div>
  );
}

export function PaymentReviewBanner({ order }) {
  const latest = (order.payments || []).slice(-1)[0];
  return (
    <Card className="p-6 rounded-3xl border-2 border-indigo-300 bg-indigo-50/50" data-testid="payment-review-banner">
      <div className="flex items-start gap-3">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-extrabold font-display text-lg text-slate-900">
            {order.status === "settlement_review" ? "Pelunasan sedang diverifikasi" : "Pembayaran sedang diverifikasi"}
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Bukti kamu telah kami terima. Seller akan verifikasi paling lambat 1×24 jam.
          </p>
          {latest && (
            <div className="mt-3 text-xs text-slate-500">
              Nominal: <span className="font-bold text-slate-700">{formatRupiah(latest.amount)}</span> · Metode: <span className="font-bold text-slate-700 uppercase">{latest.method.replace("_", " ")}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

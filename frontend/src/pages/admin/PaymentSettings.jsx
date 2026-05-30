import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { compressImage } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { QrCode, Landmark, Wallet, Loader2, Upload, Trash2, Percent } from "lucide-react";

const DEFAULTS = {
  dp_percent: 50,
  bank_name: "",
  bank_account_number: "",
  bank_account_holder: "",
  qris_image: "",
  qris_merchant_name: "",
  ewallet_info: "",
  payment_instructions: "Mohon transfer sesuai nominal dan cantumkan KODE ORDER di berita transfer. Setelah transfer, upload bukti di halaman tracking.",
};

export default function PaymentSettings() {
  const [draft, setDraft] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.getPaymentSettingsAdmin()
      .then((s) => setDraft({ ...DEFAULTS, ...s }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const uploadQris = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("File harus gambar.");
    try {
      const compressed = await compressImage(f, 1000, 0.9);
      set("qris_image", compressed);
    } catch (err) {
      toast.error(err.message || "Gagal upload.");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...draft, dp_percent: Number(draft.dp_percent) || 50 };
      await api.updatePaymentSettings(payload);
      toast.success("Pengaturan pembayaran disimpan!");
    } catch (e) {
      toast.error(e.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div data-testid="admin-payment-settings">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Pengaturan Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-1">Atur DP, rekening bank, QRIS, dan e-wallet yang ditampilkan ke buyer saat pembayaran.</p>
        </div>
        <Button onClick={save} disabled={saving} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6" data-testid="payment-settings-save-top">
          {saving ? "Menyimpan..." : "Simpan Semua"}
        </Button>
      </div>

      <div className="space-y-5">
        {/* DP Percent */}
        <Card className="rounded-2xl border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold font-display text-slate-900 text-lg">Persentase DP</h2>
          </div>
          <Label className="text-sm font-semibold mb-1.5 block">Berapa % dari total order untuk DP?</Label>
          <div className="flex items-center gap-3 max-w-xs">
            <Input type="number" min="10" max="100" value={draft.dp_percent} onChange={(e) => set("dp_percent", e.target.value)} className="rounded-xl" data-testid="dp-percent-input" />
            <span className="font-bold text-slate-700">%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Default 50%. Buyer akan lihat opsi "DP {draft.dp_percent}% / Full Payment" saat order.</p>
        </Card>

        {/* Bank */}
        <Card className="rounded-2xl border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold font-display text-slate-900 text-lg">Rekening Bank</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Nama Bank</Label>
              <Input value={draft.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder="BCA / Mandiri / BRI..." className="rounded-xl" data-testid="bank-name-input" />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">No. Rekening</Label>
              <Input value={draft.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} placeholder="1234567890" className="rounded-xl" data-testid="bank-number-input" />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Atas Nama</Label>
              <Input value={draft.bank_account_holder} onChange={(e) => set("bank_account_holder", e.target.value)} placeholder="Nama lengkap" className="rounded-xl" data-testid="bank-holder-input" />
            </div>
          </div>
        </Card>

        {/* QRIS */}
        <Card className="rounded-2xl border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold font-display text-slate-900 text-lg">QRIS</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Upload gambar QRIS statis kamu (dari aplikasi bank/e-wallet merchant). Buyer akan scan QR ini & ketik nominal sesuai yang ditampilkan per order.</p>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Nama Merchant QRIS (opsional)</Label>
              <Input value={draft.qris_merchant_name} onChange={(e) => set("qris_merchant_name", e.target.value)} placeholder="Mis. TokoKu Indonesia" className="rounded-xl mb-4" data-testid="qris-merchant-input" />

              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="rounded-xl" data-testid="qris-upload-btn">
                  <Upload className="w-4 h-4 mr-2" /> Upload QRIS
                </Button>
                {draft.qris_image && (
                  <Button type="button" variant="ghost" onClick={() => set("qris_image", "")} className="text-red-600 rounded-xl">
                    <Trash2 className="w-4 h-4 mr-2" /> Hapus
                  </Button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadQris} className="hidden" data-testid="qris-file-input" />
              <p className="text-xs text-slate-400 mt-2">JPG/PNG. Otomatis dikompres.</p>
            </div>
            <div>
              {draft.qris_image ? (
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-center">
                  <img src={draft.qris_image} alt="QRIS preview" className="max-h-48 rounded-xl" data-testid="qris-preview" />
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-400 border-2 border-dashed border-slate-200">
                  <QrCode className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs">Belum ada QRIS</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* E-Wallet */}
        <Card className="rounded-2xl border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold font-display text-slate-900 text-lg">E-Wallet (opsional)</h2>
          </div>
          <Label className="text-sm font-semibold mb-1.5 block">Info E-Wallet (text bebas, akan ditampilkan ke buyer)</Label>
          <Textarea
            rows={4}
            value={draft.ewallet_info}
            onChange={(e) => set("ewallet_info", e.target.value)}
            placeholder="Mis.&#10;GoPay: 0812-3456-7890 (Nama Kamu)&#10;OVO: 0812-3456-7890 (Nama Kamu)&#10;DANA: 0812-3456-7890"
            className="rounded-xl font-mono text-sm"
            data-testid="ewallet-info-input"
          />
        </Card>

        {/* Instructions */}
        <Card className="rounded-2xl border-slate-200 p-6">
          <h2 className="font-extrabold font-display text-slate-900 text-lg mb-3">Instruksi Tambahan untuk Buyer</h2>
          <Textarea
            rows={3}
            value={draft.payment_instructions}
            onChange={(e) => set("payment_instructions", e.target.value)}
            placeholder="Contoh: Mohon transfer sesuai nominal dan cantumkan KODE ORDER di berita transfer..."
            className="rounded-xl"
            data-testid="payment-instructions-input"
          />
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8" data-testid="payment-settings-save-bottom">
          {saving ? "Menyimpan..." : "Simpan & Terapkan"}
        </Button>
      </div>
    </div>
  );
}

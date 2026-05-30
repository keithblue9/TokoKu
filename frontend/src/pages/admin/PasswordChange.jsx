import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertCircle, KeyRound } from "lucide-react";

export default function PasswordChange() {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(newPin)) return setError("PIN baru harus 6 digit angka.");
    if (newPin !== confirmPin) return setError("Konfirmasi PIN tidak cocok.");
    setLoading(true);
    try {
      await api.changePin(oldPin, newPin);
      toast.success("PIN berhasil diubah!");
      setOldPin(""); setNewPin(""); setConfirmPin("");
    } catch (e) {
      setError(e.message || "Gagal mengubah PIN.");
    } finally {
      setLoading(false);
    }
  };

  const PinField = ({ label, value, onChange, testid, slotPrefix }) => (
    <div>
      <Label className="text-sm font-semibold mb-2 block">{label}</Label>
      <InputOTP maxLength={6} value={value} onChange={(v) => onChange(v.replace(/\D/g, ""))} inputMode="numeric">
        <InputOTPGroup className="gap-2" data-testid={testid}>
          {[0,1,2,3,4,5].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="w-11 h-12 text-lg font-bold border border-slate-300 first:rounded-l-xl last:rounded-r-xl rounded-xl bg-white"
              data-testid={`${slotPrefix}-slot-${i}`}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );

  return (
    <div data-testid="admin-password-change">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Ganti PIN</h1>
        <p className="text-sm text-slate-500 mt-1">Ubah PIN 6 digit untuk masuk ke admin panel.</p>
      </div>

      <Card className="rounded-2xl border-slate-200 p-6 sm:p-8 max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
          <KeyRound className="w-5 h-5" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PinField label="PIN Lama" value={oldPin} onChange={setOldPin} testid="pwd-old-pin" slotPrefix="pwd-pin-old" />
          <PinField label="PIN Baru (6 digit)" value={newPin} onChange={setNewPin} testid="pwd-new-pin" slotPrefix="pwd-pin-new" />
          <PinField label="Konfirmasi PIN Baru" value={confirmPin} onChange={setConfirmPin} testid="pwd-confirm-pin" slotPrefix="pwd-pin-confirm" />

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" data-testid="pwd-error">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || oldPin.length < 6 || newPin.length < 6 || confirmPin.length < 6}
            className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            data-testid="pwd-submit"
          >
            {loading ? "Menyimpan..." : "Simpan PIN Baru"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

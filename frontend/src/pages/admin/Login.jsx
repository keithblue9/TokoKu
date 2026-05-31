import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { api, setToken, getToken } from "@/lib/api";
import { toast } from "sonner";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@website.id");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      // Check if existing token still valid
      api.me().then(() => nav("/admin/dashboard", { replace: true })).catch(() => setToken(""));
    }
  }, [nav]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email.trim(), pin);
      setToken(res.token);
      localStorage.setItem("tokoku_admin_profile_v1", JSON.stringify({ email: res.email, name: res.name, role: res.role }));
      toast.success(`Selamat datang, ${res.name || res.email}!`);
      setTimeout(() => nav("/admin/dashboard", { replace: true }), 200);
    } catch (e) {
      setError(e.message || "Gagal login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="blob bg-indigo-300/60" style={{ top: "-80px", left: "-80px", width: "320px", height: "320px" }} />
      <div className="blob bg-amber-300/60" style={{ bottom: "-80px", right: "-80px", width: "320px", height: "320px", animationDelay: "5s" }} />

      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl" data-testid="login-card">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-amber-400 flex items-center justify-center text-white mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">Admin Panel</h1>
          <p className="text-sm text-slate-500 mt-2">Masuk ke dashboard pengelolaan website</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700 mb-1.5 block">Email</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@website.id"
                className="pl-9 h-11 rounded-xl"
                data-testid="login-email-input"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pin" className="text-sm font-semibold text-slate-700 mb-1.5 block">PIN (6 digit)</Label>
            <div className="flex justify-center" data-testid="login-pin-input">
              <InputOTP maxLength={6} value={pin} onChange={(v) => setPin(v.replace(/\D/g, ""))} inputMode="numeric">
                <InputOTPGroup className="gap-2">
                  {[0,1,2,3,4,5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="w-11 h-12 text-lg font-bold border border-slate-300 first:rounded-l-xl last:rounded-r-xl rounded-xl bg-white"
                      data-testid={`login-pin-slot-${i}`}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" data-testid="login-error">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || pin.length < 6}
            className="w-full h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm"
            data-testid="login-submit-button"
          >
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-8">
          Lupa PIN? Hubungi pemilik akun untuk reset manual.
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Users, Plus, Loader2, Crown, Shield, KeyRound, Trash2 } from "lucide-react";

export default function AdminTeam() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState(null);

  const load = () => {
    setLoading(true);
    api.listTeam().then(setTeam).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const meEmail = (JSON.parse(localStorage.getItem("tokoku_admin_profile_v1") || "{}")).email;

  const onToggleActive = async (m, active) => {
    try { await api.updateTeamMember(m.email, { active }); toast.success("Status diperbarui."); load(); }
    catch (e) { toast.error(e.message); }
  };
  const onChangeRole = async (m, role) => {
    try { await api.updateTeamMember(m.email, { role }); toast.success("Role diperbarui."); load(); }
    catch (e) { toast.error(e.message); }
  };
  const onDelete = async (m) => {
    if (!window.confirm(`Hapus ${m.email}? Tidak bisa dibatalkan.`)) return;
    try { await api.deleteTeamMember(m.email); toast.success("Anggota dihapus."); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div data-testid="admin-team">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><Users className="w-5 h-5 text-indigo-600" /><h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Manajemen Tim</h1></div>
          <p className="text-sm text-slate-500">Tambahkan akun untuk tim operasional & atur role. Hanya owner yang bisa mengelola tim.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5" data-testid="team-add-btn">
          <Plus className="w-4 h-4 mr-2" /> Tambah Anggota
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : (
        <div className="space-y-3">
          {team.map((m) => (
            <Card key={m.email} className="p-5 rounded-2xl border-slate-200" data-testid={`team-row-${m.email}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {m.role === "owner" ? <Crown className="w-4 h-4 text-amber-500" /> : <Shield className="w-4 h-4 text-slate-400" />}
                    <span className="font-extrabold font-display text-slate-900">{m.name}</span>
                    {m.email === meEmail && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">KAMU</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{m.email}</div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={m.role} onValueChange={(v) => onChangeRole(m, v)} disabled={m.email === meEmail}>
                    <SelectTrigger className="w-32 rounded-xl" data-testid={`team-role-${m.email}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold">Aktif</Label>
                    <Switch checked={m.active !== false} onCheckedChange={(v) => onToggleActive(m, v)} disabled={m.email === meEmail} data-testid={`team-active-${m.email}`} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setResetEmail(m.email)} className="rounded-xl" data-testid={`team-reset-${m.email}`}>
                    <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Reset PIN
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(m)} disabled={m.email === meEmail} className="text-red-600 hover:bg-red-50 rounded-xl" data-testid={`team-delete-${m.email}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} onAdded={load} />
      <ResetPinDialog email={resetEmail} onClose={() => setResetEmail(null)} onDone={load} />
    </div>
  );
}

function PinInput({ value, onChange, testid }) {
  return (
    <InputOTP maxLength={6} value={value} onChange={(v) => onChange(v.replace(/\D/g, ""))} inputMode="numeric">
      <InputOTPGroup className="gap-2" data-testid={testid}>
        {[0,1,2,3,4,5].map((i) => (
          <InputOTPSlot key={i} index={i} className="w-10 h-11 text-base font-bold border border-slate-300 first:rounded-l-xl last:rounded-r-xl rounded-xl bg-white" />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

function AddMemberDialog({ open, onOpenChange, onAdded }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("staff");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (name.trim().length < 2 || !email.includes("@") || pin.length !== 6) {
      toast.error("Mohon lengkapi semua field dengan benar.");
      return;
    }
    setBusy(true);
    try {
      await api.addTeamMember({ name, email: email.toLowerCase(), pin, role });
      toast.success("Anggota tim ditambahkan!");
      setName(""); setEmail(""); setPin(""); setRole("staff");
      onAdded?.(); onOpenChange(false);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl" data-testid="team-add-dialog">
        <DialogHeader><DialogTitle className="font-display font-extrabold">Tambah Anggota Tim</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label className="text-sm font-semibold mb-1.5 block">Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" data-testid="team-add-name" /></div>
          <div><Label className="text-sm font-semibold mb-1.5 block">Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" data-testid="team-add-email" /></div>
          <div><Label className="text-sm font-semibold mb-1.5 block">PIN Awal (6 digit)</Label><PinInput value={pin} onChange={setPin} testid="team-add-pin" /></div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="rounded-xl" data-testid="team-add-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff — kelola order & konten, tidak bisa atur tim/keuangan</SelectItem>
                <SelectItem value="owner">Owner — akses penuh termasuk tim & log aktivitas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submit} disabled={busy} className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="team-add-submit">
            {busy ? "Menyimpan..." : "Tambah"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResetPinDialog({ email, onClose, onDone }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pin.length !== 6) return toast.error("PIN harus 6 digit.");
    setBusy(true);
    try {
      await api.updateTeamMember(email, { reset_pin: pin });
      toast.success("PIN direset. Bagikan PIN baru ke anggota tim.");
      setPin(""); onDone?.(); onClose();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={!!email} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl" data-testid="team-reset-dialog">
        <DialogHeader><DialogTitle className="font-display font-extrabold">Reset PIN untuk {email}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Label className="text-sm font-semibold">PIN Baru (6 digit)</Label>
          <PinInput value={pin} onChange={setPin} testid="team-reset-pin" />
          <Button onClick={submit} disabled={busy} className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" data-testid="team-reset-submit">
            {busy ? "Menyimpan..." : "Reset PIN"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

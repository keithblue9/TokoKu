import { useState } from "react";
import { useConfig, computePackagePrices, formatRupiah } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Check, X, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

function PackageEditor({ pkg, onChange, idx }) {
  const [open, setOpen] = useState(idx === 0);
  const prices = computePackagePrices(pkg);

  const updateFeature = (i, key, val) => {
    const features = pkg.features.map((f, j) => (j === i ? { ...f, [key]: val } : f));
    onChange({ ...pkg, features });
  };
  const removeFeature = (i) => onChange({ ...pkg, features: pkg.features.filter((_, j) => j !== i) });
  const addFeature = () => onChange({ ...pkg, features: [...pkg.features, { text: "Fitur baru", available: true }] });

  return (
    <Card className="rounded-2xl border-slate-200 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50" data-testid={`pkg-toggle-${pkg.id}`}>
        <div className="text-left">
          <div className="font-extrabold font-display text-slate-900">{pkg.name} {pkg.featured && <span className="ml-2 text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">Featured</span>}</div>
          <div className="text-xs text-slate-500">Setup: {formatRupiah(prices.setup)} · Domain/bln: {formatRupiah(prices.monthly)}</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Nama Paket</Label>
              <Input value={pkg.name} onChange={(e) => onChange({ ...pkg, name: e.target.value })} className="rounded-xl" data-testid={`pkg-name-${pkg.id}`} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Badge</Label>
              <Input value={pkg.badge} onChange={(e) => onChange({ ...pkg, badge: e.target.value })} className="rounded-xl" data-testid={`pkg-badge-${pkg.id}`} />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Tagline / Deskripsi singkat</Label>
            <Input value={pkg.tagline} onChange={(e) => onChange({ ...pkg, tagline: e.target.value })} className="rounded-xl" data-testid={`pkg-tagline-${pkg.id}`} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={pkg.featured} onCheckedChange={(v) => onChange({ ...pkg, featured: v })} data-testid={`pkg-featured-${pkg.id}`} />
            <Label className="text-sm font-semibold">Jadikan paket featured (highlight)</Label>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">Daftar Fitur</Label>
            <div className="space-y-2">
              {pkg.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2" data-testid={`pkg-feature-${pkg.id}-${i}`}>
                  <button type="button" onClick={() => updateFeature(i, "available", !f.available)} className={`w-9 h-9 rounded-lg flex items-center justify-center ${f.available ? "bg-emerald-100 text-emerald-600" : "bg-red-50 text-red-400"}`}>
                    {f.available ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                  <Input value={f.text} onChange={(e) => updateFeature(i, "text", e.target.value)} className="rounded-xl flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => removeFeature(i)} className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addFeature} className="rounded-xl border-dashed" data-testid={`pkg-add-feature-${pkg.id}`}>
                <Plus className="w-3.5 h-3.5 mr-2" /> Tambah Fitur
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Catatan Peringatan (opsional)</Label>
              <Textarea rows={2} value={pkg.warning_note || ""} onChange={(e) => onChange({ ...pkg, warning_note: e.target.value })} className="rounded-xl" data-testid={`pkg-warning-${pkg.id}`} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Teks Tombol CTA</Label>
              <Input value={pkg.cta_text} onChange={(e) => onChange({ ...pkg, cta_text: e.target.value })} className="rounded-xl" data-testid={`pkg-cta-${pkg.id}`} />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Pesan WhatsApp saat klik CTA</Label>
            <Textarea rows={2} value={pkg.wa_message} onChange={(e) => onChange({ ...pkg, wa_message: e.target.value })} className="rounded-xl" data-testid={`pkg-wa-${pkg.id}`} />
          </div>
        </div>
      )}
    </Card>
  );
}

export default function PaketEdit() {
  const { config, setSection } = useConfig();
  const [draft, setDraft] = useState(config.packages);

  const updateOne = (idx, newPkg) => {
    let next = draft.map((p, i) => (i === idx ? newPkg : p));
    if (newPkg.featured) {
      next = next.map((p, i) => ({ ...p, featured: i === idx }));
    }
    setDraft(next);
  };

  const save = () => {
    setSection("packages", draft);
    toast.success("Paket berhasil disimpan!");
  };

  return (
    <div data-testid="admin-paket-edit">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Pengaturan Paket</h1>
          <p className="text-sm text-slate-500 mt-1">Edit nama, badge, fitur, dan tombol untuk tiap paket. Untuk modal & margin, gunakan Kalkulator Harga.</p>
        </div>
        <Button onClick={save} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6" data-testid="paket-save-top">
          Simpan Semua
        </Button>
      </div>

      <div className="space-y-3">
        {draft.map((pkg, idx) => (
          <PackageEditor key={pkg.id} pkg={pkg} idx={idx} onChange={(v) => updateOne(idx, v)} />
        ))}
      </div>
    </div>
  );
}

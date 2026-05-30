import { useState } from "react";
import { useConfig } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const OPTS = [
  { key: "monthly", title: "Per Bulan" },
  { key: "yearly", title: "Per Tahun" },
  { key: "twoYear", title: "Per 2 Tahun" },
];

export default function DomainEdit() {
  const { config, setSection } = useConfig();
  const [draft, setDraft] = useState(config.domainRenewal);

  const setOpt = (key, field, val) =>
    setDraft({
      ...draft,
      options: { ...draft.options, [key]: { ...draft.options[key], [field]: val } },
    });

  const save = () => {
    setSection("domainRenewal", draft);
    toast.success("Pengaturan perpanjang domain disimpan!");
  };

  return (
    <div data-testid="admin-domain-edit">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Opsi Perpanjang Domain</h1>
        <p className="text-sm text-slate-500 mt-1">Edit teks dan label pada section perpanjang domain. Harga otomatis mengikuti Kalkulator Harga.</p>
      </div>

      <Card className="rounded-2xl border-slate-200 p-6 space-y-5 max-w-3xl">
        <div>
          <Label className="text-sm font-semibold mb-1.5 block">Judul Section</Label>
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="rounded-xl" data-testid="domain-edit-title" />
        </div>
        <div>
          <Label className="text-sm font-semibold mb-1.5 block">Deskripsi</Label>
          <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="rounded-xl" data-testid="domain-edit-desc" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {OPTS.map((o) => (
            <div key={o.key} className="bg-slate-50 rounded-2xl p-4 space-y-3" data-testid={`domain-edit-opt-${o.key}`}>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{o.title}</div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Label</Label>
                <Input value={draft.options[o.key].label} onChange={(e) => setOpt(o.key, "label", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Sub-label</Label>
                <Input value={draft.options[o.key].sublabel} onChange={(e) => setOpt(o.key, "sublabel", e.target.value)} className="rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <Button onClick={save} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8" data-testid="domain-edit-save">
          Simpan & Terapkan
        </Button>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useConfig } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";

const ICON_CHOICES = [
  "ShieldCheck", "Sparkles", "Percent", "Database", "Crown", "Layers",
  "TrendingUp", "Heart", "Star", "Zap", "Gift", "Users", "Lock", "Globe",
];

function CardEditor({ item, index, onChange }) {
  const [open, setOpen] = useState(index === 0);
  const Icon = Icons[item.icon] || Icons.Sparkles;
  return (
    <Card className="rounded-2xl border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
        data-testid={`why-toggle-${item.id}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-900">Kartu #{index + 1}: {item.title}</div>
            <div className="text-xs text-slate-500">{item.active !== false ? "Aktif" : "Nonaktif"}</div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Icon</Label>
              <Select value={item.icon} onValueChange={(v) => onChange({ ...item, icon: v })}>
                <SelectTrigger className="rounded-xl" data-testid={`why-icon-${item.id}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_CHOICES.map((name) => {
                    const I = Icons[name];
                    return (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2"><I className="w-4 h-4" /> {name}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-3 h-11">
                <Switch checked={item.active !== false} onCheckedChange={(v) => onChange({ ...item, active: v })} data-testid={`why-active-${item.id}`} />
                <Label className="text-sm font-semibold">Tampilkan kartu ini</Label>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Judul</Label>
            <Input value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })} className="rounded-xl" data-testid={`why-title-${item.id}`} />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Deskripsi</Label>
            <Textarea rows={3} value={item.description} onChange={(e) => onChange({ ...item, description: e.target.value })} className="rounded-xl" data-testid={`why-desc-${item.id}`} />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Punch Line (miring di bawah)</Label>
            <Textarea rows={2} value={item.punchLine} onChange={(e) => onChange({ ...item, punchLine: e.target.value })} className="rounded-xl" data-testid={`why-punch-${item.id}`} />
          </div>
        </div>
      )}
    </Card>
  );
}

export default function KeunggulanEdit() {
  const { config, setSection } = useConfig();
  const [draft, setDraft] = useState(config.whyOwnStore);

  const updateItem = (idx, newItem) => {
    const next = draft.map((it, i) => (i === idx ? newItem : it));
    setDraft(next);
  };

  const handleSave = () => {
    setSection("whyOwnStore", draft);
    toast.success("Konten keunggulan berhasil disimpan!");
  };

  return (
    <div data-testid="admin-keunggulan-edit">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Keunggulan (Why Own Store)</h1>
          <p className="text-sm text-slate-500 mt-1">Edit 6 kartu alasan kenapa harus punya toko sendiri.</p>
        </div>
        <Button onClick={handleSave} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6" data-testid="keunggulan-save-top">
          Simpan Semua
        </Button>
      </div>

      <div className="space-y-3">
        {draft.map((item, idx) => (
          <CardEditor key={item.id} item={item} index={idx} onChange={(v) => updateItem(idx, v)} />
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8" data-testid="keunggulan-save-bottom">
          Simpan & Terapkan
        </Button>
      </div>
    </div>
  );
}

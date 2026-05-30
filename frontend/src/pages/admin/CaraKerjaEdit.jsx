import { useState } from "react";
import { useConfig } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";

export default function CaraKerjaEdit() {
  const { config, setSection } = useConfig();
  const [draft, setDraft] = useState(config.howItWorks);

  const update = (idx, key, val) => {
    const next = draft.map((s, i) => (i === idx ? { ...s, [key]: val } : s));
    setDraft(next);
  };

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[idx], next[j]] = [next[j], next[idx]];
    setDraft(next);
  };

  const remove = (idx) => setDraft(draft.filter((_, i) => i !== idx));

  const add = () => {
    setDraft([...draft, { id: `s${Date.now()}`, title: "Langkah baru", description: "Deskripsi langkah" }]);
  };

  const save = () => {
    setSection("howItWorks", draft);
    toast.success("Langkah cara kerja berhasil disimpan!");
  };

  return (
    <div data-testid="admin-cara-kerja-edit">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Cara Kerja</h1>
          <p className="text-sm text-slate-500 mt-1">Atur langkah-langkah yang ditampilkan di halaman publik.</p>
        </div>
        <Button onClick={save} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6" data-testid="cara-kerja-save">
          Simpan Semua
        </Button>
      </div>

      <div className="space-y-3">
        {draft.map((step, idx) => (
          <Card key={step.id} className="rounded-2xl border-slate-200 p-5" data-testid={`step-edit-${step.id}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold font-display shrink-0">{idx + 1}</div>
              <div className="flex-1 grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Judul</Label>
                  <Input value={step.title} onChange={(e) => update(idx, "title", e.target.value)} className="rounded-xl" data-testid={`step-title-${step.id}`} />
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Deskripsi</Label>
                  <Textarea rows={2} value={step.description} onChange={(e) => update(idx, "description", e.target.value)} className="rounded-xl" data-testid={`step-desc-${step.id}`} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded-lg" data-testid={`step-up-${step.id}`}>
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => move(idx, 1)} disabled={idx === draft.length - 1} className="rounded-lg" data-testid={`step-down-${step.id}`}>
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(idx)} className="text-red-600 rounded-lg" data-testid={`step-remove-${step.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={add} className="mt-4 rounded-xl border-dashed" data-testid="cara-kerja-add">
        <Plus className="w-4 h-4 mr-2" /> Tambah Langkah
      </Button>
    </div>
  );
}

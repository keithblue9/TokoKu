import { useState, useRef } from "react";
import { useConfig } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2, ArrowUp, ArrowDown, Plus, Upload, Star } from "lucide-react";

function Item({ item, idx, total, onChange, onMove, onRemove }) {
  const [open, setOpen] = useState(idx === 0);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1 * 1024 * 1024) {
      toast.error("Ukuran foto maks 1MB.");
      return;
    }
    const r = new FileReader();
    r.onload = () => onChange({ ...item, photo: r.result });
    r.readAsDataURL(f);
  };

  return (
    <Card className="rounded-2xl border-slate-200 overflow-hidden" data-testid={`testi-edit-${item.id}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left"
        data-testid={`testi-toggle-${item.id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {item.photo ? (
            <img src={item.photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-amber-400 flex items-center justify-center text-white font-extrabold shrink-0">
              {(item.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-slate-900 truncate">{item.name || "Tanpa nama"}</div>
            <div className="text-xs text-slate-500 truncate">{item.business}</div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Nama Pelanggan</Label>
              <Input value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} className="rounded-xl" data-testid={`testi-name-${item.id}`} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Bisnis / Lokasi</Label>
              <Input value={item.business} onChange={(e) => onChange({ ...item, business: e.target.value })} className="rounded-xl" data-testid={`testi-biz-${item.id}`} />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Testimoni</Label>
            <Textarea
              rows={4}
              value={item.message}
              onChange={(e) => onChange({ ...item, message: e.target.value })}
              className="rounded-xl"
              data-testid={`testi-msg-${item.id}`}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Rating (1–5 bintang)</Label>
              <Select value={String(item.rating || 5)} onValueChange={(v) => onChange({ ...item, rating: Number(v) })}>
                <SelectTrigger className="rounded-xl" data-testid={`testi-rating-${item.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5,4,3,2,1].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      <span className="flex items-center gap-1">
                        {Array.from({ length: n }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                        <span className="ml-1 text-xs text-slate-500">({n})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Foto (opsional, maks 1MB)</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="rounded-xl" data-testid={`testi-upload-${item.id}`}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
                </Button>
                {item.photo && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...item, photo: "" })} className="text-red-600 rounded-xl">
                    Hapus
                  </Button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => onMove(-1)} disabled={idx === 0} className="rounded-lg" data-testid={`testi-up-${item.id}`}>
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMove(1)} disabled={idx === total - 1} className="rounded-lg" data-testid={`testi-down-${item.id}`}>
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 rounded-lg" data-testid={`testi-remove-${item.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function TestimonialsEdit() {
  const { config, setSection } = useConfig();
  const [draft, setDraft] = useState(config.testimonials);

  const update = (idx, item) => setDraft({ ...draft, items: draft.items.map((x, i) => (i === idx ? item : x)) });
  const remove = (idx) => setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) });
  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= draft.items.length) return;
    const next = [...draft.items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setDraft({ ...draft, items: next });
  };
  const add = () =>
    setDraft({
      ...draft,
      items: [...draft.items, { id: `t${Date.now()}`, name: "Nama Pelanggan", business: "Nama Bisnis, Kota", message: "Testimoni di sini...", rating: 5, photo: "" }],
    });

  const save = () => {
    setSection("testimonials", draft);
    toast.success("Testimoni berhasil disimpan!");
  };

  return (
    <div data-testid="admin-testimonials-edit">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Testimoni</h1>
          <p className="text-sm text-slate-500 mt-1">Atur testimoni pelanggan yang ditampilkan di buyer view.</p>
        </div>
        <Button onClick={save} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6" data-testid="testi-save-top">
          Simpan Semua
        </Button>
      </div>

      <Card className="rounded-2xl border-slate-200 p-6 space-y-4 mb-6 max-w-3xl">
        <div>
          <Label className="text-sm font-semibold mb-1.5 block">Judul Section</Label>
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="rounded-xl" data-testid="testi-section-title" />
        </div>
        <div>
          <Label className="text-sm font-semibold mb-1.5 block">Sub-judul</Label>
          <Input value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} className="rounded-xl" data-testid="testi-section-subtitle" />
        </div>
      </Card>

      <div className="space-y-3">
        {draft.items.map((item, idx) => (
          <Item
            key={item.id}
            item={item}
            idx={idx}
            total={draft.items.length}
            onChange={(v) => update(idx, v)}
            onMove={(d) => move(idx, d)}
            onRemove={() => remove(idx)}
          />
        ))}
      </div>

      <Button variant="outline" onClick={add} className="mt-4 rounded-xl border-dashed" data-testid="testi-add">
        <Plus className="w-4 h-4 mr-2" /> Tambah Testimoni
      </Button>
    </div>
  );
}

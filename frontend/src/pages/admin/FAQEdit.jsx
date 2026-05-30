import { useState } from "react";
import { useConfig } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";

function Item({ item, idx, total, onChange, onMove, onRemove }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <Card className="rounded-2xl border-slate-200 overflow-hidden" data-testid={`faq-edit-${item.id}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left"
        data-testid={`faq-toggle-${item.id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-extrabold font-display shrink-0">
            {idx + 1}
          </div>
          <div className="font-bold text-slate-900 truncate">{item.question}</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Pertanyaan</Label>
            <Input
              value={item.question}
              onChange={(e) => onChange({ ...item, question: e.target.value })}
              className="rounded-xl"
              data-testid={`faq-q-${item.id}`}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Jawaban</Label>
            <Textarea
              rows={4}
              value={item.answer}
              onChange={(e) => onChange({ ...item, answer: e.target.value })}
              className="rounded-xl"
              data-testid={`faq-a-${item.id}`}
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => onMove(-1)} disabled={idx === 0} className="rounded-lg" data-testid={`faq-up-${item.id}`}>
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMove(1)} disabled={idx === total - 1} className="rounded-lg" data-testid={`faq-down-${item.id}`}>
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 rounded-lg" data-testid={`faq-remove-${item.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function FAQEdit() {
  const { config, setSection } = useConfig();
  const [draft, setDraft] = useState(config.faqs);

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
      items: [...draft.items, { id: `f${Date.now()}`, question: "Pertanyaan baru?", answer: "Jawaban..." }],
    });

  const save = () => {
    setSection("faqs", draft);
    toast.success("FAQ berhasil disimpan!");
  };

  return (
    <div data-testid="admin-faq-edit">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">FAQ</h1>
          <p className="text-sm text-slate-500 mt-1">Atur judul, sub-judul, dan daftar pertanyaan FAQ.</p>
        </div>
        <Button onClick={save} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6" data-testid="faq-save-top">
          Simpan Semua
        </Button>
      </div>

      <Card className="rounded-2xl border-slate-200 p-6 space-y-4 mb-6 max-w-3xl">
        <div>
          <Label className="text-sm font-semibold mb-1.5 block">Judul Section</Label>
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="rounded-xl" data-testid="faq-section-title" />
        </div>
        <div>
          <Label className="text-sm font-semibold mb-1.5 block">Sub-judul</Label>
          <Input value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} className="rounded-xl" data-testid="faq-section-subtitle" />
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

      <Button variant="outline" onClick={add} className="mt-4 rounded-xl border-dashed" data-testid="faq-add">
        <Plus className="w-4 h-4 mr-2" /> Tambah Pertanyaan
      </Button>
    </div>
  );
}

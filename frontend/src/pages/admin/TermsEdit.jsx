import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function TermsEdit() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getTerms().then((r) => setContent(r.content || "")).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (content.trim().length < 10) return toast.error("Konten terlalu pendek.");
    setSaving(true);
    try {
      await api.updateTerms(content);
      toast.success("Syarat & ketentuan disimpan!");
    } catch (e) {
      toast.error(e.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;

  return (
    <div data-testid="admin-terms-edit">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><FileText className="w-5 h-5 text-indigo-600" /><h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Syarat & Ketentuan</h1></div>
          <p className="text-sm text-slate-500">Wording perjanjian kerjasama yang muncul sebelum buyer submit order. Klien wajib centang "Saya menyetujui" untuk lanjut.</p>
        </div>
        <Button onClick={save} disabled={saving} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6" data-testid="terms-save">
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
      <Card className="p-5 rounded-2xl border-slate-200">
        <Textarea rows={24} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-sm rounded-xl" data-testid="terms-content" />
        <p className="text-xs text-slate-400 mt-2">Format plain text. Gunakan baris kosong untuk paragraf baru.</p>
      </Card>
    </div>
  );
}

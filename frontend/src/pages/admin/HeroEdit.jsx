import { useState, useRef } from "react";
import { useConfig } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Trash2, ImageIcon } from "lucide-react";

export default function HeroEdit() {
  const { config, updateSection } = useConfig();
  const [draft, setDraft] = useState(config.hero);
  const fileRef = useRef();

  const handle = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = () => {
    updateSection("hero", draft);
    toast.success("Hero section berhasil disimpan!");
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Ukuran gambar maks 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => handle("hero_image", reader.result);
    reader.readAsDataURL(f);
  };

  return (
    <div data-testid="admin-hero-edit">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Hero Section</h1>
        <p className="text-sm text-slate-500 mt-1">Edit judul utama, sub-judul, dan tombol CTA pada halaman depan.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 p-6 rounded-2xl border-slate-200 space-y-5">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Headline Utama</Label>
            <Textarea
              value={draft.headline}
              onChange={(e) => handle("headline", e.target.value)}
              rows={2}
              className="rounded-xl"
              data-testid="hero-edit-headline"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Sub-headline</Label>
            <Textarea
              value={draft.sub_headline}
              onChange={(e) => handle("sub_headline", e.target.value)}
              rows={3}
              className="rounded-xl"
              data-testid="hero-edit-subheadline"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Teks Tombol Utama</Label>
              <Input value={draft.cta_primary} onChange={(e) => handle("cta_primary", e.target.value)} className="rounded-xl" data-testid="hero-edit-cta-primary" />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Teks Tombol Kedua</Label>
              <Input value={draft.cta_secondary} onChange={(e) => handle("cta_secondary", e.target.value)} className="rounded-xl" data-testid="hero-edit-cta-secondary" />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Nomor WhatsApp (format: 628xxx)</Label>
            <Input
              value={draft.whatsapp_number}
              onChange={(e) => handle("whatsapp_number", e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="628XXXXXXXXXX"
              className="rounded-xl"
              data-testid="hero-edit-whatsapp"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Gambar Hero (opsional)</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="rounded-xl"
                data-testid="hero-edit-upload-button"
              >
                <Upload className="w-4 h-4 mr-2" /> Upload Gambar
              </Button>
              {draft.hero_image && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handle("hero_image", "")}
                  className="text-red-600 rounded-xl"
                  data-testid="hero-edit-remove-image"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Hapus
                </Button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <p className="text-xs text-slate-400 mt-2">Maks 2MB. Tersimpan di browser kamu (localStorage).</p>
          </div>

          <Button
            onClick={handleSave}
            className="w-full sm:w-auto rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8"
            data-testid="hero-edit-save"
          >
            Simpan & Terapkan
          </Button>
        </Card>

        <Card className="lg:col-span-2 p-6 rounded-2xl border-slate-200 bg-slate-50" data-testid="hero-edit-preview">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Preview</div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            {draft.hero_image ? (
              <img src={draft.hero_image} alt="Preview" className="rounded-xl w-full h-32 object-cover mb-4" />
            ) : (
              <div className="rounded-xl bg-gradient-to-br from-indigo-100 to-amber-100 h-32 mb-4 flex items-center justify-center text-slate-400">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}
            <h3 className="text-xl font-extrabold font-display leading-tight text-slate-900 mb-2">{draft.headline}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{draft.sub_headline}</p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-bold bg-indigo-600 text-white rounded-full px-3 py-1.5">{draft.cta_primary}</span>
              <span className="text-xs font-bold bg-[#25D366] text-white rounded-full px-3 py-1.5">{draft.cta_secondary}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

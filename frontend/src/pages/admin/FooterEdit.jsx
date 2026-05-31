import { useState, useRef } from "react";
import { useConfig } from "@/lib/configStore";
import { compressImage } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";

export default function FooterEdit() {
  const { config, updateSection } = useConfig();
  const [draft, setDraft] = useState(config.business);
  const fileRef = useRef();

  const handle = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const uploadLogo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("File harus gambar.");
    try {
      const compressed = await compressImage(f, 600, 0.9);
      handle("logo_image", compressed);
    } catch (err) { toast.error(err.message || "Gagal upload."); }
  };

  const save = () => {
    updateSection("business", draft);
    toast.success("Footer & kontak berhasil disimpan!");
  };

  const fields = [
    { k: "name", label: "Nama Bisnis / Brand", testid: "footer-edit-name" },
    { k: "tagline", label: "Tagline Bisnis", testid: "footer-edit-tagline", textarea: true },
    { k: "email", label: "Email Kontak", testid: "footer-edit-email" },
    { k: "phone", label: "Nomor Telepon", testid: "footer-edit-phone" },
    { k: "address", label: "Alamat (opsional)", testid: "footer-edit-address", textarea: true },
    { k: "copyright", label: "Teks Copyright", testid: "footer-edit-copyright" },
  ];

  return (
    <div data-testid="admin-footer-edit">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Footer, Logo & Kontak</h1>
        <p className="text-sm text-slate-500 mt-1">Edit info bisnis & upload logo brand kamu.</p>
      </div>

      <Card className="rounded-2xl border-slate-200 p-6 space-y-5 max-w-2xl">
        <div>
          <Label className="text-sm font-semibold mb-2 block">Logo Brand</Label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
              {draft.logo_image ? (
                <img src={draft.logo_image} alt="Logo" className="w-full h-full object-cover" data-testid="logo-preview" />
              ) : (
                <ImageIcon className="w-7 h-7 text-slate-300" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="rounded-xl" data-testid="logo-upload-btn">
                <Upload className="w-4 h-4 mr-2" /> Upload Logo
              </Button>
              {draft.logo_image && (
                <Button type="button" variant="ghost" onClick={() => handle("logo_image", "")} className="text-red-600 rounded-xl text-xs">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Logo
                </Button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
          </div>
          <p className="text-xs text-slate-400 mt-2">Rekomendasi: PNG/JPG persegi (1:1), min 200px. Otomatis dikompres.</p>
        </div>

        {fields.map((f) => (
          <div key={f.k}>
            <Label className="text-sm font-semibold mb-1.5 block">{f.label}</Label>
            {f.textarea ? (
              <Textarea rows={2} value={draft[f.k] || ""} onChange={(e) => handle(f.k, e.target.value)} className="rounded-xl" data-testid={f.testid} />
            ) : (
              <Input value={draft[f.k] || ""} onChange={(e) => handle(f.k, e.target.value)} className="rounded-xl" data-testid={f.testid} />
            )}
          </div>
        ))}
        <Button onClick={save} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8" data-testid="footer-edit-save">
          Simpan & Terapkan
        </Button>
      </Card>
    </div>
  );
}

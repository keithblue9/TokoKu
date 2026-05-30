import { useState } from "react";
import { useConfig } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function FooterEdit() {
  const { config, updateSection } = useConfig();
  const [draft, setDraft] = useState(config.business);

  const handle = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

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
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Footer & Kontak</h1>
        <p className="text-sm text-slate-500 mt-1">Edit informasi bisnis yang ditampilkan di footer.</p>
      </div>

      <Card className="rounded-2xl border-slate-200 p-6 space-y-5 max-w-2xl">
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

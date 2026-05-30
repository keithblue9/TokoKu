import { useState } from "react";
import { useConfig, computePackagePrices, formatRupiah } from "@/lib/configStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

function NumberInput({ value, onChange, suffix, testid, placeholder }) {
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        placeholder={placeholder}
        className={`rounded-xl ${suffix ? "pr-12" : ""}`}
        data-testid={testid}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">{suffix}</span>}
    </div>
  );
}

function CalculatorCard({ pkg, onChange }) {
  const prices = computePackagePrices(pkg);
  const set = (k, v) => onChange({ ...pkg, [k]: v === "" ? 0 : v });

  return (
    <Card className="rounded-3xl border-slate-200 overflow-hidden" data-testid={`calc-card-${pkg.id}`}>
      <div className={`px-6 py-4 border-b border-slate-100 ${pkg.featured ? "bg-amber-50" : "bg-slate-50"}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-extrabold font-display text-lg text-slate-900">{pkg.name}</h3>
          {pkg.featured && <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Featured</span>}
        </div>
      </div>
      <div className="grid lg:grid-cols-2">
        <div className="p-6 space-y-5 border-r border-slate-100">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Setup (sekali bayar)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Modal Setup</Label>
              <NumberInput value={pkg.modal_setup} onChange={(v) => set("modal_setup", v)} testid={`calc-modal-setup-${pkg.id}`} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Margin</Label>
              <NumberInput value={pkg.margin_setup} onChange={(v) => set("margin_setup", v)} suffix="%" testid={`calc-margin-setup-${pkg.id}`} />
            </div>
          </div>

          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold pt-3 border-t border-slate-100">Domain (per bulan)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Modal Domain/bln</Label>
              <NumberInput value={pkg.modal_domain_monthly} onChange={(v) => set("modal_domain_monthly", v)} testid={`calc-modal-domain-${pkg.id}`} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Margin Domain</Label>
              <NumberInput value={pkg.margin_domain} onChange={(v) => set("margin_domain", v)} suffix="%" testid={`calc-margin-domain-${pkg.id}`} />
            </div>
          </div>

          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold pt-3 border-t border-slate-100">Override Manual (opsional)</div>
          <p className="text-xs text-slate-400 -mt-3">Kosongkan untuk pakai hasil otomatis.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Domain/tahun</Label>
              <NumberInput value={pkg.price_domain_yearly_override} onChange={(v) => onChange({ ...pkg, price_domain_yearly_override: v === "" ? null : v })} placeholder="otomatis" testid={`calc-override-yearly-${pkg.id}`} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Domain/2 tahun</Label>
              <NumberInput value={pkg.price_domain_2year_override} onChange={(v) => onChange({ ...pkg, price_domain_2year_override: v === "" ? null : v })} placeholder="otomatis" testid={`calc-override-2year-${pkg.id}`} />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 space-y-3" data-testid={`calc-result-${pkg.id}`}>
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">Hasil Kalkulasi (Real-Time)</div>
          <Row label="Harga Jual Setup" value={formatRupiah(prices.setup)} highlight />
          <Row label="Domain /bulan" value={formatRupiah(prices.monthly)} />
          <Row label="Domain /tahun" value={formatRupiah(prices.yearly)} sub={prices.yearlySavingsPct > 0 ? `hemat ${prices.yearlySavingsPct}%` : null} />
          <Row label="Domain /2 tahun" value={formatRupiah(prices.twoYear)} sub={prices.twoYearSavingsPct > 0 ? `hemat ${prices.twoYearSavingsPct}%` : null} />
          <div className="pt-3 mt-3 border-t border-slate-200">
            <Row label="Total Tahun Pertama (bulanan)" value={formatRupiah(prices.totalFirstYearMonthly)} bold />
            <Row label="Total Tahun Pertama (tahunan)" value={formatRupiah(prices.totalFirstYearYearly)} bold />
          </div>
          <div className="pt-3 mt-3 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <div>Estimasi margin setup: <span className="font-bold text-emerald-700">{formatRupiah(prices.marginSetupRp)}</span></div>
            <div>Estimasi margin domain/thn: <span className="font-bold text-emerald-700">{formatRupiah(prices.marginDomainYearlyRp)}</span></div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, sub, bold, highlight }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`text-right ${bold || highlight ? "font-extrabold font-display" : "font-semibold"} ${highlight ? "text-indigo-600 text-base" : "text-slate-900"}`}>
        {value}
        {sub && <span className="ml-2 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{sub}</span>}
      </span>
    </div>
  );
}

export default function HargaCalc() {
  const { config, setSection } = useConfig();
  const [draft, setDraft] = useState(config.packages);

  const updateOne = (idx, newPkg) => setDraft(draft.map((p, i) => (i === idx ? newPkg : p)));

  const save = () => {
    setSection("packages", draft);
    toast.success("Harga berhasil disimpan & diterapkan ke buyer view!");
  };

  return (
    <div data-testid="admin-harga-calc">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900">Kalkulator Harga</h1>
          <p className="text-sm text-slate-500 mt-1">Atur modal & margin tiap paket. Harga jual dihitung otomatis dengan rumus: <span className="font-mono bg-slate-100 px-1 rounded">modal ÷ (1 - margin%)</span></p>
        </div>
        <Button onClick={save} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6" data-testid="harga-save-top">
          Simpan & Terapkan
        </Button>
      </div>

      <div className="space-y-5">
        {draft.map((pkg, idx) => (
          <CalculatorCard key={pkg.id} pkg={pkg} onChange={(v) => updateOne(idx, v)} />
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8" data-testid="harga-save-bottom">
          Simpan & Terapkan ke Buyer View
        </Button>
      </div>
    </div>
  );
}

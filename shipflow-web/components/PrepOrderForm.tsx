"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2 } from "lucide-react";
import { PREP_BASE_UNIT_PRICE_CENTS, PREP_SERVICE_OPTIONS } from "@/lib/prep";
import { apiCreatePrepOrder, type CreatePrepOrderBody } from "@/lib/services/apiClient";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type ItemDraft = CreatePrepOrderBody["items"][number];

const emptyItem = (): ItemDraft => ({
  sku: "",
  productName: "",
  asin: "",
  units: 1,
  cartons: 1,
  prepServices: ["FNSKU labeling"],
  notes: "",
});

export function PrepOrderForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    marketplace: "amazon_fba",
    businessName: user?.businessName ?? "",
    contactName: "",
    contactEmail: user?.email ?? "",
    contactPhone: "",
    productSummary: "",
    customerNotes: "",
  });
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + Math.max(Number(item.units) || 0, 0), 0);
    const totalCartons = items.reduce((sum, item) => sum + Math.max(Number(item.cartons) || 0, 0), 0);
    return { totalUnits, totalCartons, estimatedTotal: (totalUnits * PREP_BASE_UNIT_PRICE_CENTS) / 100 };
  }, [items]);

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function toggleService(index: number, service: string) {
    const current = items[index]?.prepServices ?? [];
    updateItem(index, {
      prepServices: current.includes(service)
        ? current.filter((candidate) => candidate !== service)
        : [...current, service],
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await apiCreatePrepOrder({
        ...form,
        totalUnits: totals.totalUnits,
        totalCartons: totals.totalCartons,
        items,
      });
      router.push(`/prep/orders/${result.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not create this Prep request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Business / company name" value={form.businessName} onChange={(businessName) => setForm((current) => ({ ...current, businessName }))} />
          <Field label="Marketplace" value="Amazon FBA" disabled onChange={() => undefined} />
          <Field label="Contact name" value={form.contactName} required onChange={(contactName) => setForm((current) => ({ ...current, contactName }))} />
          <Field label="Contact email" value={form.contactEmail} type="email" required onChange={(contactEmail) => setForm((current) => ({ ...current, contactEmail }))} />
          <Field label="Contact phone" value={form.contactPhone} onChange={(contactPhone) => setForm((current) => ({ ...current, contactPhone }))} />
          <Field label="Product summary" value={form.productSummary} required onChange={(productSummary) => setForm((current) => ({ ...current, productSummary }))} />
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Notes</span>
          <textarea
            value={form.customerNotes}
            onChange={(event) => setForm((current) => ({ ...current, customerNotes: event.target.value }))}
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
            placeholder="Tell us anything important about packaging, labels, timing, or inventory condition."
          />
        </label>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-950">Product items</h2>
            <p className="text-sm text-slate-500">Add SKUs and prep services needed for review.</p>
          </div>
          <button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-sm font-black text-[#2563EB]">
            <PlusCircle className="h-4 w-4" /> Add item
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="SKU" value={item.sku ?? ""} onChange={(sku) => updateItem(index, { sku })} />
                <Field label="Product name" value={item.productName} required onChange={(productName) => updateItem(index, { productName })} />
                <Field label="ASIN optional" value={item.asin ?? ""} onChange={(asin) => updateItem(index, { asin })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Units" value={String(item.units)} type="number" required onChange={(units) => updateItem(index, { units: Number(units) })} />
                  <Field label="Cartons" value={String(item.cartons)} type="number" required onChange={(cartons) => updateItem(index, { cartons: Number(cartons) })} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {PREP_SERVICE_OPTIONS.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(index, service)}
                    className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${item.prepServices.includes(service) ? "bg-orange-50 text-[#F97316] ring-orange-200" : "bg-white text-slate-500 ring-slate-200"}`}
                  >
                    {service}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-3">
                <input
                  value={item.notes ?? ""}
                  onChange={(event) => updateItem(index, { notes: event.target.value })}
                  className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                  placeholder="Item notes"
                />
                {items.length > 1 ? (
                  <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-orange-100 bg-orange-50 p-5">
        <div>
          <p className="text-sm font-black text-slate-950">Estimated from {formatCurrency(totals.estimatedTotal)}</p>
          <p className="text-sm text-slate-600">{totals.totalUnits} units · {totals.totalCartons} cartons · final quote may vary after review.</p>
        </div>
        <button type="submit" disabled={submitting} className="min-h-11 rounded-2xl bg-[#F97316] px-5 text-sm font-black text-white shadow-lg shadow-orange-500/25 disabled:opacity-60">
          {submitting ? "Submitting..." : "Submit Prep request"}
        </button>
        {error ? <p className="basis-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      </section>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
      />
    </label>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Printer, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/Badge";
import { isPhone, required } from "@/lib/forms";
import { calculateShippingRate, getActiveCouriers } from "@/lib/services/courierService";
import { createShipment } from "@/lib/services/shipmentService";
import type { CourierConfig, Envio, ShippingRate } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type FormState = {
  senderName: string;
  senderPhone: string;
  originCity: string;
  recipientName: string;
  recipientPhone: string;
  destinationCity: string;
  destinationAddress: string;
  weight: string;
  productType: string;
  courier: string;
  cashOnDelivery: "no" | "si";
  cashAmount: string;
};

const initialState: FormState = {
  senderName: "",
  senderPhone: "",
  originCity: "New York, NY",
  recipientName: "",
  recipientPhone: "",
  destinationCity: "Chicago, IL",
  destinationAddress: "",
  weight: "1",
  productType: "Apparel and accessories",
  courier: "",
  cashOnDelivery: "no",
  cashAmount: "",
};

const cities = ["New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ", "Miami, FL", "Seattle, WA", "Austin, TX"];
const productTypes = ["Apparel and accessories", "Electronics", "Cosmetics", "Documents", "Home goods", "Other"];

export function CreateGuideForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [couriers, setCouriers] = useState<CourierConfig[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<Envio | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      getActiveCouriers().then((items) => {
        setCouriers(items);
        setForm((current) => ({ ...current, courier: current.courier || items[0]?.nombre || "" }));
      });
    }, 0);
  }, []);

  const rates = useMemo(() => {
    return couriers.map((courier) =>
      calculateShippingRate({
        courier,
        peso: Number(form.weight) || 1,
        ciudadOrigen: form.originCity,
        ciudadDestino: form.destinationCity,
        contraEntrega: form.cashOnDelivery === "si",
        valorCobrar: Number(form.cashAmount) || 0,
      }),
    );
  }, [couriers, form.cashAmount, form.cashOnDelivery, form.destinationCity, form.originCity, form.weight]);

  const selectedRate = rates.find((rate) => rate.courier.nombre === form.courier) ?? rates[0];

  function update(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    const requiredFields: Array<keyof FormState> = ["senderName", "senderPhone", "originCity", "recipientName", "recipientPhone", "destinationCity", "destinationAddress", "weight", "productType", "courier"];
    requiredFields.forEach((field) => {
      if (!required(form[field])) nextErrors[field] = "Required field.";
    });
    if (form.senderPhone && !isPhone(form.senderPhone)) nextErrors.senderPhone = "Invalid phone number.";
    if (form.recipientPhone && !isPhone(form.recipientPhone)) nextErrors.recipientPhone = "Invalid phone number.";
    if (Number(form.weight) <= 0) nextErrors.weight = "Enter a valid weight.";
    if (form.cashOnDelivery === "si" && Number(form.cashAmount) <= 0) nextErrors.cashAmount = "Enter the collection amount.";
    if (form.cashOnDelivery === "si" && selectedRate && !selectedRate.courier.permiteContraEntrega) nextErrors.courier = "This carrier does not support COD.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRate || !validate()) return;

    setSaving(true);
    const trackingNumber = `SF-${Date.now().toString().slice(-6)}`;
    const guide: Envio = {
      id: trackingNumber,
      trackingNumber,
      senderName: form.senderName.trim(),
      senderPhone: form.senderPhone.trim(),
      originCity: form.originCity,
      recipientName: form.recipientName.trim(),
      recipientPhone: form.recipientPhone.trim(),
      destinationCity: form.destinationCity,
      destinationAddress: form.destinationAddress.trim(),
      weight: Number(form.weight),
      productType: form.productType,
      courier: selectedRate.courier.nombre,
      shippingSubtotal: selectedRate.subtotal,
      cashOnDeliveryCommission: selectedRate.contraEntregaComision,
      total: selectedRate.total,
      cashOnDelivery: form.cashOnDelivery === "si",
      cashAmount: form.cashOnDelivery === "si" ? Number(form.cashAmount) : 0,
      status: "Pendiente",
      date: new Date().toISOString(),
      value: selectedRate.total,
    };

    window.setTimeout(async () => {
      setSummary(await createShipment(guide));
      setSaving(false);
    }, 350);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <form onSubmit={handleSubmit} className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5" noValidate>
        <div>
          <h2 className="text-xl font-black text-slate-950">Shipping label details</h2>
          <p className="mt-1 text-sm text-slate-500">Complete shipment information and select the best rate.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Sender name" name="senderName" value={form.senderName} error={errors.senderName} onChange={update} />
          <Field label="Sender phone" name="senderPhone" value={form.senderPhone} error={errors.senderPhone} onChange={update} />
          <Select label="Origin city" name="originCity" value={form.originCity} options={cities} error={errors.originCity} onChange={update} />
          <Field label="Recipient name" name="recipientName" value={form.recipientName} error={errors.recipientName} onChange={update} />
          <Field label="Recipient phone" name="recipientPhone" value={form.recipientPhone} error={errors.recipientPhone} onChange={update} />
          <Select label="Destination city" name="destinationCity" value={form.destinationCity} options={cities} error={errors.destinationCity} onChange={update} />
        </div>
        <Field label="Destination address" name="destinationAddress" value={form.destinationAddress} error={errors.destinationAddress} onChange={update} />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Package weight" name="weight" value={form.weight} type="number" error={errors.weight} onChange={update} />
          <Select label="Product type" name="productType" value={form.productType} options={productTypes} error={errors.productType} onChange={update} />
          <Select label="Selected carrier" name="courier" value={form.courier} options={couriers.map((courier) => courier.nombre)} error={errors.courier} onChange={update} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Cash on delivery?" name="cashOnDelivery" value={form.cashOnDelivery} options={["no", "si"]} onChange={update} />
          {form.cashOnDelivery === "si" ? <Field label="Amount to collect" name="cashAmount" value={form.cashAmount} type="number" error={errors.cashAmount} onChange={update} /> : null}
        </div>
        <button type="submit" disabled={saving} className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:opacity-70 sm:w-fit">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Generating..." : "Generate label"}
        </button>
      </form>

      <aside className="grid gap-5">
        <CourierComparator rates={rates} selected={form.courier} onSelect={(courier) => update("courier", courier)} />
        {selectedRate ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-black text-slate-950">Calculated total</h2>
              <Badge tone="green">Active rate</Badge>
            </div>
            <p className="mt-5 text-sm text-slate-500">Total cost</p>
            <p className="mt-1 text-4xl font-black text-slate-950">{formatCurrency(selectedRate.total)}</p>
            <p className="mt-2 text-sm text-slate-500">Subtotal {formatCurrency(selectedRate.subtotal)} · COD fee {formatCurrency(selectedRate.contraEntregaComision)}</p>
          </div>
        ) : null}
        {summary ? <GuideSummary summary={summary} /> : null}
      </aside>
    </div>
  );
}

function CourierComparator({ rates, selected, onSelect }: { rates: ShippingRate[]; selected: string; onSelect: (courier: string) => void }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h2 className="font-black text-slate-950">Carrier comparison</h2>
      <div className="mt-4 grid gap-3">
        {rates.map((rate) => (
          <button key={rate.courier.id} type="button" onClick={() => onSelect(rate.courier.nombre)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-200 hover:bg-cyan-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{rate.courier.nombre}</p>
                <p className="text-sm text-slate-500">{rate.courier.tiempoEstimado} · {rate.courier.cobertura}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{rate.courier.permiteContraEntrega ? "COD available" : "No COD"}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-[#06B6D4]">{formatCurrency(rate.total)}</p>
                {selected === rate.courier.nombre ? <CheckCircle2 className="ml-auto mt-2 h-5 w-5 text-[#16a34a]" /> : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GuideSummary({ summary }: { summary: Envio }) {
  return (
    <div className="print-guide rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm shadow-cyan-950/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone="blue"><Sparkles className="mr-2 h-3.5 w-3.5" />Label generated</Badge>
          <h2 className="mt-4 text-2xl font-black text-slate-950">{summary.id}</h2>
        </div>
        <button type="button" onClick={() => window.print()} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#06B6D4] shadow-sm" aria-label="Print label">
          <Printer className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-5 grid gap-3 text-sm">
        <SummaryRow label="Carrier" value={summary.courier} />
        <SummaryRow label="Route" value={`${summary.originCity} -> ${summary.destinationCity}`} />
        <SummaryRow label="Subtotal" value={formatCurrency(summary.shippingSubtotal ?? summary.value)} />
        <SummaryRow label="COD fee" value={formatCurrency(summary.cashOnDeliveryCommission ?? 0)} />
        <SummaryRow label="Total" value={formatCurrency(summary.total ?? summary.value)} />
      </div>
      <Link href={`/guia/${summary.trackingNumber}`} className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#06B6D4] px-5 text-sm font-bold text-white shadow-xl shadow-cyan-500/20">
        View label
      </Link>
    </div>
  );
}

function Field({ label, name, value, type = "text", error, onChange }: { label: string; name: keyof FormState; value: string; type?: string; error?: string; onChange: (name: keyof FormState, value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input name={name} value={value} type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} onChange={(event) => onChange(name, event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10" />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function Select({ label, name, value, options, error, onChange }: { label: string; name: keyof FormState; value: string; options: string[]; error?: string; onChange: (name: keyof FormState, value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10">
        {options.map((option) => <option key={option} value={option}>{option === "si" ? "Yes" : option === "no" ? "No" : option}</option>)}
      </select>
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 rounded-2xl bg-white/80 px-4 py-3"><span className="text-slate-500">{label}</span><span className="font-bold text-slate-950">{value}</span></div>;
}

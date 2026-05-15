"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/Badge";
import { isPhone, required } from "@/lib/forms";
import { calculateShippingRate, getActiveCouriers } from "@/lib/services/courierService";
import { createShipment } from "@/lib/services/shipmentService";
import {
  apiCreateSSLabel,
  apiGetRates,
  type SSLabelResult,
} from "@/lib/services/apiClient";
import type { CourierConfig, Envio, ShippingRate } from "@/lib/types";
import type { RateResult } from "@/lib/logistics/types";
import { formatCurrency } from "@/lib/utils";

type Provider = "internal" | "shipstation";

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
  // Internal only
  courier: string;
  cashOnDelivery: "no" | "si";
  cashAmount: string;
  // ShipStation extra address fields
  originPostalCode: string;
  originState: string;
  destinationPostalCode: string;
  destinationState: string;
  weightUnit: "lb" | "oz";
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
  originPostalCode: "",
  originState: "",
  destinationPostalCode: "",
  destinationState: "",
  weightUnit: "lb",
};

const cities = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Miami, FL",
  "Seattle, WA",
  "Austin, TX",
];
const productTypes = [
  "Apparel and accessories",
  "Electronics",
  "Cosmetics",
  "Documents",
  "Home goods",
  "Other",
];

export function CreateGuideForm() {
  const [provider, setProvider] = useState<Provider>("internal");
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Internal-only
  const [couriers, setCouriers] = useState<CourierConfig[]>([]);

  // ShipStation-only
  const [apiRates, setApiRates] = useState<RateResult[]>([]);
  const [selectedApiRate, setSelectedApiRate] = useState<RateResult | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [showSSConfirm, setShowSSConfirm] = useState(false);

  // Common result state
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Envio | null>(null);
  const [labelData, setLabelData] = useState<string | null>(null);

  // Stable per-intent idempotency key; reset when label is confirmed
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    window.setTimeout(() => {
      getActiveCouriers().then((items) => {
        setCouriers(items);
        setForm((current) => ({
          ...current,
          courier: current.courier || items[0]?.nombre || "",
        }));
      });
    }, 0);
  }, []);

  // Reset SS rates whenever provider changes or form fields change
  function handleProviderChange(next: Provider) {
    setProvider(next);
    setApiRates([]);
    setSelectedApiRate(null);
    setRatesError(null);
    setErrors({});
    setSummary(null);
    setLabelData(null);
  }

  const internalRates = useMemo(() => {
    return couriers.map((c) =>
      calculateShippingRate({
        courier: c,
        peso: Number(form.weight) || 1,
        ciudadOrigen: form.originCity,
        ciudadDestino: form.destinationCity,
        contraEntrega: form.cashOnDelivery === "si",
        valorCobrar: Number(form.cashAmount) || 0,
      }),
    );
  }, [couriers, form.cashAmount, form.cashOnDelivery, form.destinationCity, form.originCity, form.weight]);

  const selectedInternalRate =
    internalRates.find((r) => r.courier.nombre === form.courier) ?? internalRates[0];

  function update(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "weight" || name === "originCity" || name === "destinationCity") {
      setApiRates([]);
      setSelectedApiRate(null);
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateCommon() {
    const next: Record<string, string> = {};
    const commonFields: Array<keyof FormState> = [
      "senderName",
      "senderPhone",
      "originCity",
      "recipientName",
      "recipientPhone",
      "destinationCity",
      "destinationAddress",
      "weight",
      "productType",
    ];
    commonFields.forEach((f) => {
      if (!required(form[f])) next[f] = "Required field.";
    });
    if (form.senderPhone && !isPhone(form.senderPhone)) next.senderPhone = "Invalid phone number.";
    if (form.recipientPhone && !isPhone(form.recipientPhone)) next.recipientPhone = "Invalid phone number.";
    if (Number(form.weight) <= 0) next.weight = "Enter a valid weight.";
    return next;
  }

  function validateInternal() {
    const next = validateCommon();
    if (!required(form.courier)) next.courier = "Required field.";
    if (form.cashOnDelivery === "si" && Number(form.cashAmount) <= 0)
      next.cashAmount = "Enter the collection amount.";
    if (
      form.cashOnDelivery === "si" &&
      selectedInternalRate &&
      !selectedInternalRate.courier.permiteContraEntrega
    )
      next.courier = "This carrier does not support COD.";
    return next;
  }

  function validateSSCommon() {
    const next = validateCommon();
    return next;
  }

  function validateSSLabel() {
    const next = validateSSCommon();
    if (!required(form.originPostalCode)) next.originPostalCode = "Required for ShipStation labels.";
    if (!required(form.destinationPostalCode)) next.destinationPostalCode = "Required for ShipStation labels.";
    if (!selectedApiRate) next.form = "Select a rate before generating the label.";
    return next;
  }

  // ── Internal submit ─────────────────────────────────────────────────────────

  async function handleInternalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errs = validateInternal();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!selectedInternalRate) return;

    setSaving(true);
    setErrors({});
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
      courier: selectedInternalRate.courier.nombre,
      shippingSubtotal: selectedInternalRate.subtotal,
      cashOnDeliveryCommission: selectedInternalRate.contraEntregaComision,
      total: selectedInternalRate.total,
      cashOnDelivery: form.cashOnDelivery === "si",
      cashAmount: form.cashOnDelivery === "si" ? Number(form.cashAmount) : 0,
      status: "Pendiente",
      date: new Date().toISOString(),
      value: selectedInternalRate.total,
    };

    try {
      setSummary(await createShipment(guide));
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "We could not create this label." });
    } finally {
      setSaving(false);
    }
  }

  // ── ShipStation: fetch rates ────────────────────────────────────────────────

  async function handleFetchRates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errs = validateSSCommon();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setFetchingRates(true);
    setRatesError(null);
    setApiRates([]);
    setSelectedApiRate(null);
    setErrors({});

    try {
      const result = await apiGetRates({
        provider: "shipstation",
        origin: { city: form.originCity },
        destination: { city: form.destinationCity },
        parcel: { weight: Number(form.weight), weightUnit: form.weightUnit },
      });
      if (!result.rates.length) {
        setRatesError("No rates available for this route. Check credentials or try another route.");
      } else {
        setApiRates(result.rates);
        setSelectedApiRate(result.rates[0]);
      }
    } catch (err) {
      setRatesError(err instanceof Error ? err.message : "Could not fetch ShipStation rates.");
    } finally {
      setFetchingRates(false);
    }
  }

  // ── ShipStation: open confirmation ─────────────────────────────────────────

  function handleRequestSSLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errs = validateSSLabel();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setShowSSConfirm(true);
  }

  // ── ShipStation: confirmed create ──────────────────────────────────────────

  async function handleSSConfirmed() {
    if (!selectedApiRate) return;
    setShowSSConfirm(false);
    setSaving(true);
    setErrors({});

    try {
      const result: SSLabelResult = await apiCreateSSLabel({
        provider: "shipstation",
        origin: {
          city: form.originCity,
          postalCode: form.originPostalCode.trim(),
          state: form.originState.trim() || undefined,
          country: "US",
        },
        destination: {
          city: form.destinationCity,
          postalCode: form.destinationPostalCode.trim(),
          state: form.destinationState.trim() || undefined,
          country: "US",
          line1: form.destinationAddress.trim() || undefined,
        },
        parcel: { weight: Number(form.weight), weightUnit: form.weightUnit },
        carrierCode: selectedApiRate.courierId,
        serviceCode: selectedApiRate.serviceCode,
        expectedCost: selectedApiRate.customerPrice,
        idempotencyKey: idempotencyKeyRef.current,
        senderName: form.senderName.trim() || undefined,
        senderPhone: form.senderPhone.trim() || undefined,
        recipientName: form.recipientName.trim() || undefined,
        recipientPhone: form.recipientPhone.trim() || undefined,
        productType: form.productType || undefined,
      });

      setSummary(result.shipment);
      setLabelData(result.labelData);
      // New key for next label attempt
      idempotencyKeyRef.current = crypto.randomUUID();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "We could not create this label." });
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadLabel() {
    if (!labelData) return;
    const byteChars = atob(labelData);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `label-${summary?.trackingNumber ?? "shipstation"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6">
      {/* Provider selector */}
      <ProviderSelector provider={provider} onChange={handleProviderChange} />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* ── Internal flow ── */}
        {provider === "internal" && (
          <form
            onSubmit={handleInternalSubmit}
            className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5"
            noValidate
          >
            <div>
              <h2 className="text-xl font-black text-slate-950">Shipping label details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Complete shipment information and select the best rate.
              </p>
            </div>
            <CommonFields form={form} errors={errors} onChange={update} />
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Cash on delivery?"
                name="cashOnDelivery"
                value={form.cashOnDelivery}
                options={["no", "si"]}
                onChange={update}
              />
              {form.cashOnDelivery === "si" ? (
                <Field
                  label="Amount to collect"
                  name="cashAmount"
                  value={form.cashAmount}
                  type="number"
                  error={errors.cashAmount}
                  onChange={update}
                />
              ) : null}
            </div>
            <Select
              label="Selected carrier"
              name="courier"
              value={form.courier}
              options={couriers.map((c) => c.nombre)}
              error={errors.courier}
              onChange={update}
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:opacity-70 sm:w-fit"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Generating..." : "Generate label"}
            </button>
            {errors.form ? (
              <span className="text-sm font-semibold text-red-600">{errors.form}</span>
            ) : null}
          </form>
        )}

        {/* ── ShipStation flow ── */}
        {provider === "shipstation" && (
          <div className="grid gap-5">
            {/* Step 1: quote */}
            <form
              onSubmit={handleFetchRates}
              className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5"
              noValidate
            >
              <div>
                <h2 className="text-xl font-black text-slate-950">ShipStation — real label</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fill in the details and click <strong>Get rates</strong> to see real carrier prices.
                </p>
              </div>
              <CommonFields form={form} errors={errors} onChange={update} />
              <SSAddressFields form={form} errors={errors} onChange={update} />
              <button
                type="submit"
                disabled={fetchingRates}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#06B6D4] px-5 text-sm font-bold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-[#0891B2] disabled:opacity-70 sm:w-fit"
              >
                {fetchingRates ? "Fetching rates..." : "Get ShipStation rates"}
              </button>
              {ratesError ? (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {ratesError}
                </div>
              ) : null}
            </form>

            {/* Step 2: confirm + create (only after rates fetched) */}
            {apiRates.length > 0 && (
              <form
                onSubmit={handleRequestSSLabel}
                className="grid gap-4 rounded-3xl border border-cyan-200 bg-cyan-50/40 p-5 shadow-sm"
                noValidate
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <p className="text-sm font-semibold text-slate-700">
                    <strong>Real label:</strong> This will purchase a real label in ShipStation and
                    deduct your balance.
                  </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Field
                    label="Origin postal code *"
                    name="originPostalCode"
                    value={form.originPostalCode}
                    error={errors.originPostalCode}
                    onChange={update}
                  />
                  <Field
                    label="Destination postal code *"
                    name="destinationPostalCode"
                    value={form.destinationPostalCode}
                    error={errors.destinationPostalCode}
                    onChange={update}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !selectedApiRate}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:opacity-70 sm:w-fit"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Generating..." : "Generate real ShipStation label"}
                </button>
                {errors.form ? (
                  <span className="text-sm font-semibold text-red-600">{errors.form}</span>
                ) : null}
              </form>
            )}
          </div>
        )}

        {/* ── Sidebar ── */}
        <aside className="grid gap-5 content-start">
          {provider === "internal" && (
            <>
              <CourierComparator
                rates={internalRates}
                selected={form.courier}
                onSelect={(c) => update("courier", c)}
              />
              {selectedInternalRate ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-black text-slate-950">Calculated total</h2>
                    <Badge tone="green">Active rate</Badge>
                  </div>
                  <p className="mt-5 text-sm text-slate-500">Total cost</p>
                  <p className="mt-1 text-4xl font-black text-slate-950">
                    {formatCurrency(selectedInternalRate.total)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Subtotal {formatCurrency(selectedInternalRate.subtotal)} · COD fee{" "}
                    {formatCurrency(selectedInternalRate.contraEntregaComision)}
                  </p>
                </div>
              ) : null}
            </>
          )}

          {provider === "shipstation" && apiRates.length > 0 && (
            <ApiRatesList
              rates={apiRates}
              selected={selectedApiRate}
              onSelect={setSelectedApiRate}
            />
          )}

          {summary ? (
            <GuideSummary
              summary={summary}
              labelData={labelData}
              onDownload={handleDownloadLabel}
            />
          ) : null}
        </aside>
      </div>

      {/* ShipStation confirmation modal */}
      {showSSConfirm && selectedApiRate && (
        <SSConfirmModal
          rate={selectedApiRate}
          onConfirm={handleSSConfirmed}
          onCancel={() => setShowSSConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ProviderSelector({
  provider,
  onChange,
}: {
  provider: Provider;
  onChange: (p: Provider) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <p className="w-full text-sm font-black text-slate-700">Shipping provider:</p>
      {(["internal", "shipstation"] as Provider[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${
            provider === p
              ? "border-[#06B6D4] bg-cyan-50 text-[#0891B2]"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
          }`}
        >
          {provider === p ? <CheckCircle2 className="h-4 w-4" /> : null}
          {p === "internal" ? "Internal / demo" : "ShipStation (real)"}
        </button>
      ))}
    </div>
  );
}

function CommonFields({
  form,
  errors,
  onChange,
}: {
  form: FormState;
  errors: Record<string, string>;
  onChange: (name: keyof FormState, value: string) => void;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Sender name" name="senderName" value={form.senderName} error={errors.senderName} onChange={onChange} />
        <Field label="Sender phone" name="senderPhone" value={form.senderPhone} error={errors.senderPhone} onChange={onChange} />
        <Select label="Origin city" name="originCity" value={form.originCity} options={cities} error={errors.originCity} onChange={onChange} />
        <Field label="Recipient name" name="recipientName" value={form.recipientName} error={errors.recipientName} onChange={onChange} />
        <Field label="Recipient phone" name="recipientPhone" value={form.recipientPhone} error={errors.recipientPhone} onChange={onChange} />
        <Select label="Destination city" name="destinationCity" value={form.destinationCity} options={cities} error={errors.destinationCity} onChange={onChange} />
      </div>
      <Field label="Destination address" name="destinationAddress" value={form.destinationAddress} error={errors.destinationAddress} onChange={onChange} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Package weight" name="weight" value={form.weight} type="number" error={errors.weight} onChange={onChange} />
        <Select label="Product type" name="productType" value={form.productType} options={productTypes} error={errors.productType} onChange={onChange} />
      </div>
    </>
  );
}

function SSAddressFields({
  form,
  errors,
  onChange,
}: {
  form: FormState;
  errors: Record<string, string>;
  onChange: (name: keyof FormState, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Origin state (optional)" name="originState" value={form.originState} error={errors.originState} onChange={onChange} />
      <Field label="Destination state (optional)" name="destinationState" value={form.destinationState} error={errors.destinationState} onChange={onChange} />
      <Select label="Weight unit" name="weightUnit" value={form.weightUnit} options={["lb", "oz"]} onChange={onChange} />
    </div>
  );
}

function ApiRatesList({
  rates,
  selected,
  onSelect,
}: {
  rates: RateResult[];
  selected: RateResult | null;
  onSelect: (r: RateResult) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h2 className="font-black text-slate-950">ShipStation rates</h2>
      <div className="mt-4 grid gap-3">
        {rates.map((rate) => (
          <button
            key={`${rate.courierId}-${rate.serviceCode}`}
            type="button"
            onClick={() => onSelect(rate)}
            className={`rounded-2xl border p-4 text-left transition ${
              selected?.serviceCode === rate.serviceCode && selected?.courierId === rate.courierId
                ? "border-[#06B6D4] bg-cyan-50"
                : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-cyan-50/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{rate.serviceName}</p>
                <p className="text-xs text-slate-500">{rate.courierName}</p>
                {rate.estimatedTime ? (
                  <p className="mt-1 text-xs font-semibold text-slate-500">{rate.estimatedTime}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-black text-[#06B6D4]">{formatCurrency(rate.customerPrice)}</p>
                <p className="text-xs text-slate-400">{rate.currency}</p>
                {selected?.serviceCode === rate.serviceCode &&
                  selected?.courierId === rate.courierId ? (
                  <CheckCircle2 className="ml-auto mt-2 h-5 w-5 text-[#16a34a]" />
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CourierComparator({
  rates,
  selected,
  onSelect,
}: {
  rates: ShippingRate[];
  selected: string;
  onSelect: (courier: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h2 className="font-black text-slate-950">Carrier comparison</h2>
      <div className="mt-4 grid gap-3">
        {rates.map((rate) => (
          <button
            key={rate.courier.id}
            type="button"
            onClick={() => onSelect(rate.courier.nombre)}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-200 hover:bg-cyan-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{rate.courier.nombre}</p>
                <p className="text-sm text-slate-500">
                  {rate.courier.tiempoEstimado} · {rate.courier.cobertura}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {rate.courier.permiteContraEntrega ? "COD available" : "No COD"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black text-[#06B6D4]">{formatCurrency(rate.total)}</p>
                {selected === rate.courier.nombre ? (
                  <CheckCircle2 className="ml-auto mt-2 h-5 w-5 text-[#16a34a]" />
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GuideSummary({
  summary,
  labelData,
  onDownload,
}: {
  summary: Envio;
  labelData: string | null;
  onDownload: () => void;
}) {
  return (
    <div className="print-guide rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm shadow-cyan-950/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone="blue">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Label generated
          </Badge>
          <h2 className="mt-4 text-2xl font-black text-slate-950">{summary.trackingNumber}</h2>
          {summary.provider && (
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              {summary.provider}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#06B6D4] shadow-sm"
          aria-label="Print label"
        >
          <Printer className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-5 grid gap-3 text-sm">
        <SummaryRow label="Carrier" value={summary.courier} />
        <SummaryRow
          label="Route"
          value={`${summary.originCity} → ${summary.destinationCity}`}
        />
        {summary.labelStatus ? (
          <SummaryRow label="Label" value={summary.labelStatus} />
        ) : null}
        {summary.customerPrice != null ? (
          <SummaryRow label="Price" value={formatCurrency(summary.customerPrice)} />
        ) : (
          <SummaryRow
            label="Total"
            value={formatCurrency(summary.total ?? summary.value)}
          />
        )}
      </div>

      {labelData ? (
        <button
          type="button"
          onClick={onDownload}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20"
        >
          <Download className="mr-2 h-4 w-4" />
          Download label PDF
        </button>
      ) : summary.provider === "shipstation" ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          Label PDF not available for retry — download it immediately after first creation.
        </p>
      ) : null}

      <Link
        href={`/guia/${summary.trackingNumber}`}
        className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#06B6D4] px-5 text-sm font-bold text-white shadow-xl shadow-cyan-500/20"
      >
        View label
      </Link>
    </div>
  );
}

function SSConfirmModal({
  rate,
  onConfirm,
  onCancel,
}: {
  rate: RateResult;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
            <h2 className="text-lg font-black text-slate-950">Confirm real label</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-8 w-8 place-items-center rounded-xl hover:bg-slate-100"
            aria-label="Cancel"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          This will purchase a <strong>real label in ShipStation</strong> and deduct your balance.
          This action cannot be undone without voiding the label.
        </p>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
          <p className="font-black text-slate-950">{rate.serviceName}</p>
          <p className="text-slate-500">{rate.courierName}</p>
          <p className="mt-2 text-2xl font-black text-[#06B6D4]">
            {formatCurrency(rate.customerPrice)}
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-[#FF1493] py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 hover:bg-[#FF4FB3]"
          >
            Confirm and generate label
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  error,
  onChange,
}: {
  label: string;
  name: keyof FormState;
  value: string;
  type?: string;
  error?: string;
  onChange: (name: keyof FormState, value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        name={name}
        value={value}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        onChange={(e) => onChange(name, e.target.value)}
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
      />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function Select({
  label,
  name,
  value,
  options,
  error,
  onChange,
}: {
  label: string;
  name: keyof FormState;
  value: string;
  options: string[];
  error?: string;
  onChange: (name: keyof FormState, value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "si" ? "Yes" : opt === "no" ? "No" : opt}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-white/80 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-950">{value}</span>
    </div>
  );
}

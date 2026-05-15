"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Package,
  MapPin,
  User,
  Printer,
  Save,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/Badge";
import { isPhone, required } from "@/lib/forms";
import { calculateShippingRate, getActiveCouriers } from "@/lib/services/courierService";
import { createShipment } from "@/lib/services/shipmentService";
import {
  apiCreateLabel,
  apiGetRates,
  type CreateLabelResult,
} from "@/lib/services/apiClient";
import type { CourierConfig, Envio, ShippingRate } from "@/lib/types";
import type { RateResult } from "@/lib/logistics/types";
import { formatCurrency } from "@/lib/utils";

// "standard" = internal/mock | "online" = best_available (multi-provider)
type QuoteMode = "standard" | "online";

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
  // Standard-only
  courier: string;
  cashOnDelivery: "no" | "si";
  cashAmount: string;
  // Online quotation extra address fields
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
  const [mode, setMode] = useState<QuoteMode>("standard");
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Standard couriers
  const [couriers, setCouriers] = useState<CourierConfig[]>([]);

  // Online quotation state
  const [apiRates, setApiRates] = useState<RateResult[]>([]);
  const [selectedApiRate, setSelectedApiRate] = useState<RateResult | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Common result state
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Envio | null>(null);
  const [labelData, setLabelData] = useState<string | null>(null);

  // Stable idempotency key per purchase intent
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

  function handleModeChange(next: QuoteMode) {
    setMode(next);
    setApiRates([]);
    setSelectedApiRate(null);
    setRatesError(null);
    setErrors({});
    setSummary(null);
    setLabelData(null);
  }

  const standardRates = useMemo(() => {
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

  const selectedStandardRate =
    standardRates.find((r) => r.courier.nombre === form.courier) ?? standardRates[0];

  function update(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (["weight", "originCity", "destinationCity"].includes(name)) {
      setApiRates([]);
      setSelectedApiRate(null);
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateCommon() {
    const next: Record<string, string> = {};
    const fields: Array<keyof FormState> = [
      "senderName", "senderPhone", "originCity",
      "recipientName", "recipientPhone", "destinationCity",
      "destinationAddress", "weight", "productType",
    ];
    fields.forEach((f) => {
      if (!required(form[f])) next[f] = "Campo requerido.";
    });
    if (form.senderPhone && !isPhone(form.senderPhone)) next.senderPhone = "Teléfono inválido.";
    if (form.recipientPhone && !isPhone(form.recipientPhone)) next.recipientPhone = "Teléfono inválido.";
    if (Number(form.weight) <= 0) next.weight = "Ingresa un peso válido.";
    return next;
  }

  function validateStandard() {
    const next = validateCommon();
    if (!required(form.courier)) next.courier = "Campo requerido.";
    if (form.cashOnDelivery === "si" && Number(form.cashAmount) <= 0)
      next.cashAmount = "Ingresa el monto a cobrar.";
    if (
      form.cashOnDelivery === "si" &&
      selectedStandardRate &&
      !selectedStandardRate.courier.permiteContraEntrega
    )
      next.courier = "El carrier seleccionado no soporta contra entrega.";
    return next;
  }

  function validateOnlineLabel() {
    const next = validateCommon();
    if (!required(form.originPostalCode)) next.originPostalCode = "Requerido para generar guía.";
    if (!required(form.destinationPostalCode)) next.destinationPostalCode = "Requerido para generar guía.";
    if (!selectedApiRate) next.form = "Selecciona una tarifa antes de generar la guía.";
    return next;
  }

  // ── Standard submit ─────────────────────────────────────────────────────────

  async function handleStandardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errs = validateStandard();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (!selectedStandardRate) return;

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
      courier: selectedStandardRate.courier.nombre,
      shippingSubtotal: selectedStandardRate.subtotal,
      cashOnDeliveryCommission: selectedStandardRate.contraEntregaComision,
      total: selectedStandardRate.total,
      cashOnDelivery: form.cashOnDelivery === "si",
      cashAmount: form.cashOnDelivery === "si" ? Number(form.cashAmount) : 0,
      status: "Pendiente",
      date: new Date().toISOString(),
      value: selectedStandardRate.total,
    };

    try {
      setSummary(await createShipment(guide));
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "No se pudo crear la guía." });
    } finally {
      setSaving(false);
    }
  }

  // ── Online: fetch rates ─────────────────────────────────────────────────────

  async function handleFetchRates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errs = validateCommon();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setFetchingRates(true);
    setRatesError(null);
    setApiRates([]);
    setSelectedApiRate(null);
    setErrors({});

    try {
      const result = await apiGetRates({
        mode: "best_available",
        origin: { city: form.originCity },
        destination: { city: form.destinationCity },
        parcel: { weight: Number(form.weight), weightUnit: form.weightUnit },
      });
      if (!result.rates.length) {
        setRatesError("No hay tarifas disponibles para esta ruta. Verifica los datos o intenta otra ruta.");
      } else {
        setApiRates(result.rates);
        setSelectedApiRate(result.rates[0]);
      }
    } catch (err) {
      setRatesError(err instanceof Error ? err.message : "No se pudieron obtener tarifas. Verifica tu conexión.");
    } finally {
      setFetchingRates(false);
    }
  }

  // ── Online: request confirmation ────────────────────────────────────────────

  function handleRequestOnlineLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errs = validateOnlineLabel();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setShowConfirm(true);
  }

  // ── Online: confirmed ───────────────────────────────────────────────────────

  async function handleConfirmed() {
    if (!selectedApiRate) return;
    setShowConfirm(false);

    const rateProvider = selectedApiRate.provider;

    // Skeleton providers don't support label creation yet.
    if (rateProvider === "shippo" || rateProvider === "easypost" || rateProvider === "easyship") {
      setErrors({ form: "Esta opción todavía no está disponible para generar guía. Selecciona otra tarifa." });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const result: CreateLabelResult = await apiCreateLabel({
        provider: rateProvider,
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
        platformMarkup: selectedApiRate.pricing.platformMarkup,
        paymentFee: selectedApiRate.pricing.paymentFee,
        idempotencyKey: idempotencyKeyRef.current,
        senderName: form.senderName.trim() || undefined,
        senderPhone: form.senderPhone.trim() || undefined,
        recipientName: form.recipientName.trim() || undefined,
        recipientPhone: form.recipientPhone.trim() || undefined,
        productType: form.productType || undefined,
      });

      setSummary(result.shipment);
      setLabelData(result.labelData);
      idempotencyKeyRef.current = crypto.randomUUID();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "No se pudo crear la guía." });
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
    a.download = `guia-${summary?.trackingNumber ?? Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6">
      <ModeSelector mode={mode} onChange={handleModeChange} />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* ── Cotización estándar ── */}
        {mode === "standard" && (
          <form
            onSubmit={handleStandardSubmit}
            className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5"
            noValidate
          >
            <SectionHeader icon={<User className="h-4 w-4" />} title="Remitente" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del remitente" name="senderName" value={form.senderName} error={errors.senderName} onChange={update} placeholder="Ej. Juan García" />
              <Field label="Teléfono del remitente" name="senderPhone" value={form.senderPhone} error={errors.senderPhone} onChange={update} placeholder="+1 555 000 0000" />
              <div className="md:col-span-2">
                <Select label="Ciudad de origen" name="originCity" value={form.originCity} options={cities} error={errors.originCity} onChange={update} />
              </div>
            </div>

            <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Destinatario" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del destinatario" name="recipientName" value={form.recipientName} error={errors.recipientName} onChange={update} placeholder="Ej. María López" />
              <Field label="Teléfono del destinatario" name="recipientPhone" value={form.recipientPhone} error={errors.recipientPhone} onChange={update} placeholder="+1 555 000 0001" />
              <div className="md:col-span-2">
                <Select label="Ciudad de destino" name="destinationCity" value={form.destinationCity} options={cities} error={errors.destinationCity} onChange={update} />
              </div>
              <div className="md:col-span-2">
                <Field label="Dirección completa de entrega" name="destinationAddress" value={form.destinationAddress} error={errors.destinationAddress} onChange={update} placeholder="Calle, número, apartamento..." />
              </div>
            </div>

            <SectionHeader icon={<Package className="h-4 w-4" />} title="Paquete" />
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Peso del paquete" name="weight" value={form.weight} type="number" error={errors.weight} onChange={update} placeholder="1" />
              <Select label="Tipo de producto" name="productType" value={form.productType} options={productTypes} error={errors.productType} onChange={update} />
              <Select label="Carrier" name="courier" value={form.courier} options={couriers.map((c) => c.nombre)} error={errors.courier} onChange={update} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="¿Contra entrega?" name="cashOnDelivery" value={form.cashOnDelivery} options={["no", "si"]} onChange={update} />
              {form.cashOnDelivery === "si" ? (
                <Field label="Monto a cobrar" name="cashAmount" value={form.cashAmount} type="number" error={errors.cashAmount} onChange={update} placeholder="0.00" />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF1493] px-6 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:opacity-70"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Generando..." : "Generar guía"}
              </button>
              <p className="text-xs text-slate-400">Cotizamos con la mejor opción disponible para tu envío.</p>
            </div>
            {errors.form ? <p className="text-sm font-semibold text-red-600">{errors.form}</p> : null}
          </form>
        )}

        {/* ── Cotización en línea ── */}
        {mode === "online" && (
          <div className="grid gap-5">
            <form
              onSubmit={handleFetchRates}
              className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5"
              noValidate
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#06B6D4]">Cotización en línea</p>
                <p className="mt-1 text-sm text-slate-500">
                  Completa los datos y cotiza con las tarifas disponibles. El proveedor técnico se selecciona automáticamente.
                </p>
              </div>

              <SectionHeader icon={<User className="h-4 w-4" />} title="Remitente" />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre del remitente" name="senderName" value={form.senderName} error={errors.senderName} onChange={update} placeholder="Ej. Juan García" />
                <Field label="Teléfono del remitente" name="senderPhone" value={form.senderPhone} error={errors.senderPhone} onChange={update} placeholder="+1 555 000 0000" />
                <Select label="Ciudad de origen" name="originCity" value={form.originCity} options={cities} error={errors.originCity} onChange={update} />
                <Field label="Estado (opcional)" name="originState" value={form.originState} error={errors.originState} onChange={update} placeholder="Ej. NY" />
              </div>

              <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Destinatario" />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre del destinatario" name="recipientName" value={form.recipientName} error={errors.recipientName} onChange={update} placeholder="Ej. María López" />
                <Field label="Teléfono del destinatario" name="recipientPhone" value={form.recipientPhone} error={errors.recipientPhone} onChange={update} placeholder="+1 555 000 0001" />
                <Select label="Ciudad de destino" name="destinationCity" value={form.destinationCity} options={cities} error={errors.destinationCity} onChange={update} />
                <Field label="Estado (opcional)" name="destinationState" value={form.destinationState} error={errors.destinationState} onChange={update} placeholder="Ej. IL" />
                <div className="md:col-span-2">
                  <Field label="Dirección completa de entrega" name="destinationAddress" value={form.destinationAddress} error={errors.destinationAddress} onChange={update} placeholder="Calle, número, apartamento..." />
                </div>
              </div>

              <SectionHeader icon={<Package className="h-4 w-4" />} title="Paquete" />
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Peso" name="weight" value={form.weight} type="number" error={errors.weight} onChange={update} placeholder="1" />
                <Select label="Unidad de peso" name="weightUnit" value={form.weightUnit} options={["lb", "oz"]} onChange={update} />
                <Select label="Tipo de producto" name="productType" value={form.productType} options={productTypes} error={errors.productType} onChange={update} />
              </div>

              <button
                type="submit"
                disabled={fetchingRates}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#06B6D4] px-5 text-sm font-bold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-[#0891B2] disabled:opacity-70 sm:w-fit"
              >
                <Zap className="mr-2 h-4 w-4" />
                {fetchingRates ? "Buscando tarifas..." : "Buscar tarifas"}
              </button>

              {ratesError ? (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {ratesError}
                </div>
              ) : null}
            </form>

            {/* Paso 2: seleccionar tarifa y generar */}
            {apiRates.length > 0 && (
              <form
                onSubmit={handleRequestOnlineLabel}
                className="grid gap-4 rounded-3xl border border-cyan-200 bg-cyan-50/40 p-5 shadow-sm"
                noValidate
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <p className="text-sm font-semibold text-slate-700">
                    <strong>Guía real:</strong> Al confirmar se generará una guía de envío real y se descontará de tu saldo.
                  </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Field
                    label="ZIP / Código postal de origen *"
                    name="originPostalCode"
                    value={form.originPostalCode}
                    error={errors.originPostalCode}
                    onChange={update}
                    placeholder="Ej. 10001"
                  />
                  <Field
                    label="ZIP / Código postal de destino *"
                    name="destinationPostalCode"
                    value={form.destinationPostalCode}
                    error={errors.destinationPostalCode}
                    onChange={update}
                    placeholder="Ej. 60601"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !selectedApiRate}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:opacity-70 sm:w-fit"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Generando..." : "Generar guía"}
                </button>
                {errors.form ? <p className="text-sm font-semibold text-red-600">{errors.form}</p> : null}
              </form>
            )}
          </div>
        )}

        {/* ── Sidebar ── */}
        <aside className="grid gap-5 content-start">
          {mode === "standard" && (
            <>
              <RateComparator
                rates={standardRates}
                selected={form.courier}
                onSelect={(c) => update("courier", c)}
              />
              {selectedStandardRate ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-black text-slate-950">Total calculado</h2>
                    <Badge tone="green">Tarifa activa</Badge>
                  </div>
                  <p className="mt-5 text-sm text-slate-500">Costo total</p>
                  <p className="mt-1 text-4xl font-black text-slate-950">
                    {formatCurrency(selectedStandardRate.total)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Subtotal {formatCurrency(selectedStandardRate.subtotal)} · Comisión C/E{" "}
                    {formatCurrency(selectedStandardRate.contraEntregaComision)}
                  </p>
                </div>
              ) : null}
            </>
          )}

          {mode === "online" && apiRates.length > 0 && (
            <AvailableRatesList
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

      {/* Modal de confirmación */}
      {showConfirm && selectedApiRate && (
        <ConfirmModal
          rate={selectedApiRate}
          onConfirm={handleConfirmed}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ModeSelector({ mode, onChange }: { mode: QuoteMode; onChange: (m: QuoteMode) => void }) {
  const options: { value: QuoteMode; label: string; desc: string }[] = [
    { value: "standard", label: "Cotización estándar", desc: "Carriers disponibles en la plataforma" },
    { value: "online", label: "Mejor tarifa disponible", desc: "Motor de cotización en línea" },
  ];

  return (
    <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:flex sm:flex-wrap sm:items-center">
      <p className="text-sm font-black text-slate-700 sm:mr-2">Tipo de cotización:</p>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${
            mode === opt.value
              ? "border-[#06B6D4] bg-cyan-50 text-[#0891B2]"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
          }`}
        >
          {mode === opt.value ? <CheckCircle2 className="h-4 w-4" /> : null}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
      <span className="text-slate-400">{icon}</span>
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</h3>
    </div>
  );
}

function RateComparator({
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
      <h2 className="font-black text-slate-950">Comparar carriers</h2>
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
                  {rate.courier.permiteContraEntrega ? "Contra entrega disponible" : "Sin contra entrega"}
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

const CARRIER_DISPLAY: Record<string, string> = {
  stamps_com: "USPS via Stamps.com",
  ups: "UPS",
  fedex: "FedEx",
  dhl_express: "DHL Express",
  usps: "USPS",
  dhl: "DHL",
};

function displayCarrier(courierId: string, courierName: string): string {
  return (
    CARRIER_DISPLAY[courierId.toLowerCase()] ??
    CARRIER_DISPLAY[courierName.toLowerCase()] ??
    courierName
  );
}

function formatDelivery(estimatedTime?: string): string | null {
  if (!estimatedTime) return null;
  const m = estimatedTime.match(/(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    return `Entrega en ${n} día${n !== 1 ? "s" : ""}`;
  }
  return estimatedTime;
}

function AvailableRatesList({
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
      <h2 className="font-black text-slate-950">Tarifas disponibles</h2>
      <p className="mt-1 text-xs text-slate-400">Precio incluye envío, servicio y cargo de pago</p>
      <div className="mt-4 grid gap-3">
        {rates.map((rate) => {
          const isCheapest = !!rate.tags?.includes("cheapest");
          const isFastest = !!rate.tags?.includes("fastest");
          const isRecommended = !!rate.tags?.includes("recommended");
          const isSelected =
            selected?.serviceCode === rate.serviceCode &&
            selected?.courierId === rate.courierId &&
            selected?.provider === rate.provider;
          const deliveryText = formatDelivery(rate.estimatedTime);
          const carrierLabel = displayCarrier(rate.courierId, rate.courierName);

          return (
            <button
              key={`${rate.provider}-${rate.courierId}-${rate.serviceCode}`}
              type="button"
              onClick={() => onSelect(rate)}
              className={`rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? "border-[#06B6D4] bg-cyan-50 ring-1 ring-[#06B6D4]/30"
                  : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-cyan-50/40"
              }`}
            >
              {(isRecommended || isCheapest || isFastest) && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {isRecommended && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
                      Nuestra recomendación
                    </span>
                  )}
                  {isCheapest && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-black text-green-700">
                      El costo más bajo
                    </span>
                  )}
                  {isFastest && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700">
                      Lo más rápido
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-slate-950">{rate.serviceName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{carrierLabel}</p>
                  {deliveryText ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {deliveryText}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400">Tiempo de entrega no especificado</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-black text-[#06B6D4]">
                    {formatCurrency(rate.customerPrice)}
                  </p>
                  <p className="text-xs text-slate-400">{rate.currency}</p>
                  {isSelected && (
                    <CheckCircle2 className="ml-auto mt-2 h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
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
  const displayPrice = summary.customerPrice ?? summary.total ?? summary.value;

  return (
    <div className="print-guide rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm shadow-cyan-950/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone="blue">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Guía generada
          </Badge>
          <h2 className="mt-4 text-2xl font-black text-slate-950">{summary.trackingNumber}</h2>
          {summary.labelStatus && (
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              {summary.labelStatus === "purchased" ? "Guía activa" :
               summary.labelStatus === "internal" ? "Procesada" :
               summary.labelStatus}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#06B6D4] shadow-sm"
          aria-label="Imprimir guía"
        >
          <Printer className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-5 grid gap-3 text-sm">
        <SummaryRow label="Carrier" value={summary.courier} />
        <SummaryRow label="Ruta" value={`${summary.originCity} → ${summary.destinationCity}`} />
        <SummaryRow label="Total" value={formatCurrency(displayPrice)} />
      </div>

      {labelData ? (
        <button
          type="button"
          onClick={onDownload}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20"
        >
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF de guía
        </button>
      ) : summary.labelStatus === "purchased" ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          El PDF de esta guía no está disponible en este momento. Descárgalo inmediatamente después de la creación.
        </p>
      ) : null}

      <Link
        href={`/guia/${summary.trackingNumber}`}
        className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#06B6D4] px-5 text-sm font-bold text-white shadow-xl shadow-cyan-500/20"
      >
        Ver guía
      </Link>
    </div>
  );
}

function ConfirmModal({
  rate,
  onConfirm,
  onCancel,
}: {
  rate: RateResult;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { pricing } = rate;
  const hasFeeBreakdown = pricing.paymentFee > 0;
  const carrierLabel = displayCarrier(rate.courierId, rate.courierName);
  const deliveryText = formatDelivery(rate.estimatedTime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
            <h2 className="text-lg font-black text-slate-950">Confirmar guía</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-8 w-8 place-items-center rounded-xl hover:bg-slate-100"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Esto generará una <strong>guía de envío real</strong> y descontará tu saldo. Esta acción
          no puede deshacerse sin anular la guía.
        </p>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
          <p className="font-black text-slate-950">{rate.serviceName}</p>
          <p className="text-slate-500">{carrierLabel}</p>
          {deliveryText && (
            <p className="mt-1 text-xs text-slate-400">{deliveryText}</p>
          )}

          {hasFeeBreakdown ? (
            <div className="mt-3 border-t border-slate-200 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Envío</span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(pricing.providerCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cargo de servicio ShipFlow</span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(pricing.platformMarkup)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cargo de procesamiento de pago</span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(pricing.paymentFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-black text-slate-950">Total</span>
                <span className="text-2xl font-black text-[#06B6D4]">
                  {formatCurrency(rate.customerPrice)}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-2xl font-black text-[#06B6D4]">
              {formatCurrency(rate.customerPrice)}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-[#FF1493] py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 hover:bg-[#FF4FB3]"
          >
            Confirmar y generar
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
  placeholder,
  onChange,
}: {
  label: string;
  name: keyof FormState;
  value: string;
  type?: string;
  error?: string;
  placeholder?: string;
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
        placeholder={placeholder}
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
            {opt === "si" ? "Sí" : opt === "no" ? "No" : opt}
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

"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  MailCheck,
  Package,
  MapPin,
  User,
  Printer,
  Save,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/Badge";
import { AddressInput } from "@/components/AddressInput";
import type { AddressInputErrors } from "@/components/AddressInput";
import { isPhone } from "@/lib/forms";
import {
  apiCreateLabel,
  apiGetConfigStatus,
  apiGetRates,
  type ConfigStatus,
  type CreateLabelResult,
} from "@/lib/services/apiClient";
import type { Envio, StructuredAddress } from "@/lib/types";
import type { RateResult } from "@/lib/logistics/types";
import { formatCurrency } from "@/lib/utils";

const EMPTY_ADDRESS: StructuredAddress = {
  name: "",
  phone: "",
  street1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  source: "manual",
  validationStatus: "incomplete",
};

type FormState = {
  origin: StructuredAddress;
  destination: StructuredAddress;
  weight: string;
  productType: string;
  weightUnit: "lb" | "oz";
  length: string;
  width: string;
  height: string;
  dimensionUnit: "in" | "cm";
};

const initialState: FormState = {
  origin: { ...EMPTY_ADDRESS, city: "New York", state: "NY", country: "US" },
  destination: { ...EMPTY_ADDRESS, city: "Chicago", state: "IL", country: "US" },
  weight: "1",
  productType: "Apparel and accessories",
  weightUnit: "lb",
  length: "1",
  width: "1",
  height: "1",
  dimensionUnit: "in",
};

const productTypes = [
  "Apparel and accessories",
  "Electronics",
  "Cosmetics",
  "Documents",
  "Home goods",
  "Other",
];

export function CreateGuideForm() {
  const router = useRouter();
  const { emailVerified, loading: authLoading } = useAuth();

  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Server config status — fetched once on mount
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);

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
    apiGetConfigStatus().then(setConfigStatus);
  }, []);

  function updateOrigin(addr: StructuredAddress) {
    setForm((current) => ({ ...current, origin: addr }));
    setApiRates([]);
    setSelectedApiRate(null);
  }

  function updateDestination(addr: StructuredAddress) {
    setForm((current) => ({ ...current, destination: addr }));
    setApiRates([]);
    setSelectedApiRate(null);
  }

  function updateField(name: keyof Omit<FormState, "origin" | "destination">, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (["weight", "weightUnit", "length", "width", "height", "dimensionUnit"].includes(name)) {
      setApiRates([]);
      setSelectedApiRate(null);
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  type ErrorMap = Record<string, string>;

  function validateAddress(addr: StructuredAddress, prefix: string): ErrorMap {
    const next: ErrorMap = {};
    if (!addr.name?.trim()) next[`${prefix}.name`] = "Campo requerido.";
    if (!addr.phone?.trim()) next[`${prefix}.phone`] = "Campo requerido.";
    else if (!isPhone(addr.phone)) next[`${prefix}.phone`] = "Teléfono inválido.";
    if (!addr.street1?.trim()) next[`${prefix}.street1`] = "Calle requerida.";
    if (!addr.city?.trim()) next[`${prefix}.city`] = "Campo requerido.";
    if (!addr.state?.trim()) next[`${prefix}.state`] = "Estado requerido.";
    if (!addr.postalCode?.trim()) next[`${prefix}.postalCode`] = "ZIP requerido.";
    if ((addr.country || "US") !== "US") next[`${prefix}.country`] = "Solo Estados Unidos.";
    return next;
  }

  function validateQuote(): ErrorMap {
    const next: ErrorMap = {
      ...validateAddress(form.origin, "origin"),
      ...validateAddress(form.destination, "destination"),
      ...(!form.productType ? { productType: "Campo requerido." } : {}),
    };
    const weight = Number(form.weight);
    const length = Number(form.length);
    const width = Number(form.width);
    const height = Number(form.height);

    if (!Number.isFinite(weight) || weight <= 0) next.weight = "Ingresa un peso válido.";
    if (!Number.isFinite(length) || length <= 0) next.length = "Ingresa un largo válido.";
    if (!Number.isFinite(width) || width <= 0) next.width = "Ingresa un ancho válido.";
    if (!Number.isFinite(height) || height <= 0) next.height = "Ingresa un alto válido.";

    return next;
  }

  function validateOnlineLabel(): ErrorMap {
    return {
      ...validateQuote(),
      ...(!selectedApiRate ? { form: "Selecciona una tarifa antes de generar la guía." } : {}),
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function originErrors(): AddressInputErrors {
    return {
      name: errors["origin.name"],
      phone: errors["origin.phone"],
      street1: errors["origin.street1"],
      city: errors["origin.city"],
      state: errors["origin.state"],
      postalCode: errors["origin.postalCode"],
    };
  }

  function destinationErrors(): AddressInputErrors {
    return {
      name: errors["destination.name"],
      phone: errors["destination.phone"],
      street1: errors["destination.street1"],
      city: errors["destination.city"],
      state: errors["destination.state"],
      postalCode: errors["destination.postalCode"],
    };
  }

  function quoteValidationMessage(errs: ErrorMap) {
    const addressFields = Object.keys(errs).filter((key) => key.startsWith("origin.") || key.startsWith("destination."));
    const packageFields = ["weight", "length", "width", "height"].filter((key) => errs[key]);

    if (addressFields.length > 0) {
      return "Completa calle, ciudad, estado y ZIP en origen y destino para cotizar correctamente.";
    }
    if (packageFields.length > 0) {
      return "Completa peso, largo, ancho y alto del paquete.";
    }
    return null;
  }

  function noRatesMessage(result?: { diagnostic?: string; configuredCount?: number }) {
    if (configStatus?.activeRateProviders === 0 || result?.configuredCount === 0) {
      return "No hay integraciones de cotización real configuradas.";
    }
    if (result?.diagnostic === "address_incomplete") {
      return "Revisa calle, ciudad, estado y ZIP.";
    }
    if (result?.diagnostic === "providers_failed") {
      return "No encontramos tarifas para esta ruta con los datos ingresados. Revisa dirección, ZIP y dimensiones.";
    }
    return "No encontramos tarifas para esta ruta con los datos ingresados. Revisa dirección, ZIP y dimensiones.";
  }

  // ── Fetch real rates ────────────────────────────────────────────────────────

  async function handleFetchRates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (configStatus && !configStatus.supabaseConfigured) {
      setRatesError(
        "El servidor no está configurado para cotizar. Revisa la configuración de Supabase.",
      );
      return;
    }

    if (configStatus && !configStatus.ratesConfigured) {
      setRatesError("Configura al menos una integración de cotización real.");
      return;
    }

    const errs = validateQuote();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setRatesError(quoteValidationMessage(errs));
      return;
    }

    setFetchingRates(true);
    setRatesError(null);
    setApiRates([]);
    setSelectedApiRate(null);
    setErrors({});

    try {
      const result = await apiGetRates({
        mode: "best_available",
        origin: {
          line1: form.origin.street1,
          line2: form.origin.street2 || undefined,
          city: form.origin.city,
          postalCode: form.origin.postalCode,
          state: form.origin.state,
          country: "US",
        },
        destination: {
          line1: form.destination.street1,
          line2: form.destination.street2 || undefined,
          city: form.destination.city,
          postalCode: form.destination.postalCode,
          state: form.destination.state,
          country: "US",
        },
        parcel: {
          weight: Number(form.weight),
          weightUnit: form.weightUnit,
          length: Number(form.length),
          width: Number(form.width),
          height: Number(form.height),
          dimensionUnit: form.dimensionUnit,
        },
      });
      const visibleRates = result.rates.filter((rate) => rate.provider !== "internal" && rate.provider !== "mock");
      if (!visibleRates.length) {
        setRatesError(noRatesMessage(result));
      } else {
        setApiRates(visibleRates);
        setSelectedApiRate(visibleRates[0]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudieron obtener tarifas.";
      if (msg === "EMAIL_NOT_VERIFIED") {
        router.push("/verifica-tu-correo");
        return;
      }
      if (msg.toLowerCase().includes("supabase") || msg.toLowerCase().includes("not configured")) {
        setRatesError("El servidor no está configurado correctamente para cotizar.");
      } else if (msg.toLowerCase().includes("address") || msg.toLowerCase().includes("postal") || msg.toLowerCase().includes("zip")) {
        setRatesError("Revisa calle, ciudad, estado y ZIP.");
      } else if (msg.toLowerCase().includes("parcel") || msg.toLowerCase().includes("weight")) {
        setRatesError("Completa peso, largo, ancho y alto del paquete.");
      } else {
        setRatesError("No encontramos tarifas para esta ruta con los datos ingresados. Revisa dirección, ZIP y dimensiones.");
      }
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
          line1: form.origin.street1,
          line2: form.origin.street2 || undefined,
          city: form.origin.city,
          postalCode: form.origin.postalCode,
          state: form.origin.state,
          country: "US",
        },
        destination: {
          city: form.destination.city,
          postalCode: form.destination.postalCode,
          state: form.destination.state,
          country: "US",
          line1: form.destination.street1,
          line2: form.destination.street2 || undefined,
        },
        parcel: {
          weight: Number(form.weight),
          weightUnit: form.weightUnit,
          length: Number(form.length),
          width: Number(form.width),
          height: Number(form.height),
          dimensionUnit: form.dimensionUnit,
        },
        carrierCode: selectedApiRate.courierId,
        serviceCode: selectedApiRate.serviceCode,
        expectedCost: selectedApiRate.customerPrice,
        platformMarkup: selectedApiRate.pricing.platformMarkup,
        paymentFee: selectedApiRate.pricing.paymentFee,
        pricingSubtotal: selectedApiRate.pricing.subtotal,
        pricingModel: "shipflow_v1",
        pricingBreakdown: {
          providerCost: selectedApiRate.pricing.providerCost,
          platformMarkup: selectedApiRate.pricing.platformMarkup,
          subtotal: selectedApiRate.pricing.subtotal,
          paymentFee: selectedApiRate.pricing.paymentFee,
          customerPrice: selectedApiRate.pricing.customerPrice,
          markupPercentage: selectedApiRate.pricing.markupPercentage,
          markupMinimum: selectedApiRate.pricing.markupMinimum,
          paymentFeePercentage: selectedApiRate.pricing.paymentFeePercentage,
          paymentFeeFixed: selectedApiRate.pricing.paymentFeeFixed,
        },
        idempotencyKey: idempotencyKeyRef.current,
        senderName: form.origin.name?.trim() || undefined,
        senderPhone: form.origin.phone?.trim() || undefined,
        recipientName: form.destination.name?.trim() || undefined,
        recipientPhone: form.destination.phone?.trim() || undefined,
        productType: form.productType || undefined,
      });

      setSummary(result.shipment);
      setLabelData(result.labelData);
      idempotencyKeyRef.current = crypto.randomUUID();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("line1") || msg.toLowerCase().includes("postal") || msg.toLowerCase().includes("city")) {
        setErrors({ form: "Revisa calle, ciudad, estado y ZIP antes de generar la guía." });
      } else if (msg.toLowerCase().includes("parcel") || msg.toLowerCase().includes("weight") || msg.toLowerCase().includes("dimensions")) {
        setErrors({ form: "Completa peso, largo, ancho y alto del paquete." });
      } else {
        setErrors({ form: "No se pudo crear la guía con la tarifa seleccionada." });
      }
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

  // ── Config alerts ───────────────────────────────────────────────────────────

  const showConfigWarning = configStatus !== null && !configStatus.supabaseConfigured;
  const showNoRatesWarning =
    configStatus !== null && configStatus.supabaseConfigured && !configStatus.ratesConfigured;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!authLoading && !emailVerified) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-pink-50 text-pink-500">
          <MailCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Verifica tu correo primero</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          Necesitas confirmar tu dirección de correo antes de poder cotizar o generar guías.
        </p>
        <button
          onClick={() => router.push("/verifica-tu-correo")}
          className="mt-6 inline-flex h-11 items-center rounded-2xl bg-[#FF1493] px-6 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3]"
        >
          Verificar correo
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {showConfigWarning && (
        <ConfigAlert type="error">
          <strong>El servidor no está listo para cotizar.</strong> Revisa la configuración de Supabase.
        </ConfigAlert>
      )}
      {showNoRatesWarning && (
        <ConfigAlert type="warning">
          <strong>Sin integraciones de cotización activas.</strong> Configura al menos una
          integración real en el servidor para ver tarifas.
        </ConfigAlert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="grid gap-5">
          <form
            onSubmit={handleFetchRates}
            className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5"
            noValidate
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#06B6D4]">Cotizar envío</p>
              <p className="mt-1 text-sm text-slate-500">
                Cotiza tu envío con dirección de origen, destino y paquete. Buscamos automáticamente la mejor tarifa disponible.
              </p>
            </div>

            <SectionHeader icon={<User className="h-4 w-4" />} title="Origen" />
            <AddressInput
              sectionLabel="Origen"
              value={form.origin}
              onChange={updateOrigin}
              requirePostal
              errors={originErrors()}
            />
            <AddressSummary addr={form.origin} />

            <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Destino" />
            <AddressInput
              sectionLabel="Destino"
              value={form.destination}
              onChange={updateDestination}
              requirePostal
              errors={destinationErrors()}
            />
            <AddressSummary addr={form.destination} />

            <SectionHeader icon={<Package className="h-4 w-4" />} title="Paquete" />
            <div className="grid gap-4 md:grid-cols-3">
              <NumberField label="Peso" value={form.weight} onChange={(v) => updateField("weight", v)} placeholder="1" error={errors.weight} />
              <SelectField label="Unidad de peso" value={form.weightUnit} options={["lb", "oz"]} onChange={(v) => updateField("weightUnit", v)} />
              <SelectField label="Tipo de producto" value={form.productType} options={productTypes} onChange={(v) => updateField("productType", v)} error={errors.productType} />
              <NumberField label="Largo" value={form.length} onChange={(v) => updateField("length", v)} placeholder="1" error={errors.length} />
              <NumberField label="Ancho" value={form.width} onChange={(v) => updateField("width", v)} placeholder="1" error={errors.width} />
              <NumberField label="Alto" value={form.height} onChange={(v) => updateField("height", v)} placeholder="1" error={errors.height} />
              <SelectField label="Unidad de dimensión" value={form.dimensionUnit} options={["in", "cm"]} onChange={(v) => updateField("dimensionUnit", v)} />
            </div>

            <button
              type="submit"
              disabled={fetchingRates || showConfigWarning}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#06B6D4] px-5 text-sm font-bold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-[#0891B2] disabled:opacity-50 sm:w-fit"
            >
              <Zap className="mr-2 h-4 w-4" />
              {fetchingRates ? "Cotizando..." : "Cotizar envío"}
            </button>

            {ratesError ? (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {ratesError}
              </div>
            ) : null}
          </form>

          {apiRates.length > 0 && (
            <form
              onSubmit={handleRequestOnlineLabel}
              className="grid gap-4 rounded-3xl border border-cyan-200 bg-cyan-50/40 p-5 shadow-sm"
              noValidate
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm font-semibold text-slate-700">
                  Selecciona una tarifa para revisar el desglose y continuar con la guía.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || !selectedApiRate}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:opacity-70 sm:w-fit"
              >
                <Save className="mr-2 h-4 w-4" />
                Continuar
              </button>
              {errors.form ? <p className="text-sm font-semibold text-red-600">{errors.form}</p> : null}
            </form>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="grid gap-5 content-start">
          {apiRates.length > 0 && (
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

function ConfigAlert({ type, children }: { type: "error" | "warning"; children: React.ReactNode }) {
  const colors =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div className={`flex items-start gap-3 rounded-3xl border p-4 text-sm ${colors}`}>
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>{children}</div>
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
      <div className="mt-1 flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5 shrink-0" />
        Tarifa estimada según dirección y paquete ingresados.
      </div>
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

        <p className="mt-2 text-xs text-slate-400">
          Tarifa estimada según la dirección y el paquete ingresados. El precio final puede variar
          si la dirección cambia al confirmar el label.
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

function NumberField({
  label, value, onChange, placeholder, error,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        value={value}
        type="number"
        min="0"
        step="0.01"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
      />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function SelectField({
  label, value, options, onChange, error,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

function AddressSummary({ addr }: { addr: StructuredAddress }) {
  if (!addr.city) return null;
  const isComplete = addr.validationStatus === "complete";
  const isNeedsReview = addr.validationStatus === "needs_review";
  const parts = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ");
  const countryPart = addr.country && addr.country !== "US" ? ` · ${addr.country}` : "";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${
        isComplete
          ? "border-green-200 bg-green-50"
          : isNeedsReview
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-slate-50"
      }`}
    >
      <span className="truncate text-slate-600">{parts}{countryPart}</span>
      <span
        className={`shrink-0 font-bold ${
          isComplete
            ? "text-green-700"
            : isNeedsReview
              ? "text-amber-700"
              : "text-slate-500"
        }`}
      >
        {isComplete ? "Completa ✓" : isNeedsReview ? "Revisar" : "Incompleta"}
      </span>
    </div>
  );
}

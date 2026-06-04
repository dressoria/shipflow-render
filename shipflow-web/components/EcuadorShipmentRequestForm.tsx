"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Loader2,
  Package,
  Plus,
  Search,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { Badge } from "@/components/Badge";
import { AddressBookSelector } from "@/components/AddressBookSelector";
import { ECUADOR_OPERATORS } from "@/components/EcuadorOperatorsLogos";
import { useAddressBook } from "@/hooks/useAddressBook";
import { readLastUsedAddress, type AddressBookEntry } from "@/lib/addressBook";
import type { EcuadorQuoteResult } from "@/lib/ecuador/types";
import {
  apiCreateEcuadorShipmentRequest,
  apiGetEcuadorDelivereoQuote,
  type CreateEcuadorShipmentRequestBody,
} from "@/lib/services/apiClient";
import { formatCurrency } from "@/lib/utils";

type WizardStep = 1 | 2 | 3;

type ShipmentAddress = {
  name: string;
  phone: string;
  address: string;
  city: string;
  reference: string;
  region: string;
  postalCode: string;
};

type MultiDestinationDraft = {
  id: string;
  label: string;
  name: string;
  address: string;
  city: string;
  reference: string;
};

type PackageDraft = {
  id: string;
  content: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  quantity: number;
};

const CITY_OPTIONS = ["Quito", "Guayaquil", "Cuenca", "Manta", "Ambato", "Loja"];

const initialAddress = (): ShipmentAddress => ({
  name: "",
  phone: "",
  address: "",
  city: "",
  reference: "",
  region: "",
  postalCode: "",
});

const createPackageDraft = (): PackageDraft => ({
  id: createLocalId("pkg"),
  content: "",
  weightKg: 1,
  lengthCm: 12,
  widthCm: 12,
  heightCm: 12,
  quantity: 1,
});

const createMultiDestinationDraft = (): MultiDestinationDraft => ({
  id: createLocalId("multi"),
  label: "",
  name: "",
  address: "",
  city: "",
  reference: "",
});

export function EcuadorShipmentRequestForm() {
  const router = useRouter();
  const { entries } = useAddressBook();
  const initialSelections = getInitialAddressSelections(entries);
  const [step, setStep] = useState<WizardStep>(1);
  const [origin, setOrigin] = useState<ShipmentAddress>(() =>
    initialSelections.origin ? mapAddressEntryToShipment(initialSelections.origin) : initialAddress(),
  );
  const [destination, setDestination] = useState<ShipmentAddress>(() =>
    initialSelections.destination ? mapAddressEntryToShipment(initialSelections.destination) : initialAddress(),
  );
  const [selectedOriginAddressId, setSelectedOriginAddressId] = useState<string | null>(
    initialSelections.origin?.id ?? null,
  );
  const [selectedDestinationAddressId, setSelectedDestinationAddressId] = useState<string | null>(
    initialSelections.destination?.id ?? null,
  );
  const [extraDestinations, setExtraDestinations] = useState<MultiDestinationDraft[]>([]);
  const [packages, setPackages] = useState<PackageDraft[]>([createPackageDraft()]);
  const [openPackageId, setOpenPackageId] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState("");
  const [declaredValue, setDeclaredValue] = useState<number | undefined>(undefined);
  const [quote, setQuote] = useState<EcuadorQuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedOperatorName, setSelectedOperatorName] = useState<string | null>(null);

  const packageTotals = useMemo(() => {
    const totalWeight = packages.reduce((sum, item) => sum + item.weightKg * Math.max(1, item.quantity), 0);
    const count = packages.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
    return { totalWeight, count };
  }, [packages]);

  const stepLabels = ["Origen y destino", "Paquetes", "Tarifas y cotizaciones"] as const;

  function updateAddress(target: "origin" | "destination", key: keyof ShipmentAddress, value: string) {
    if (target === "origin") {
      setOrigin((current) => ({ ...current, [key]: value }));
      if (key !== "reference") setSelectedOriginAddressId(null);
    } else {
      setDestination((current) => ({ ...current, [key]: value }));
      if (key !== "reference") setSelectedDestinationAddressId(null);
    }

    resetQuoteState();
  }

  function updatePackage(id: string, key: keyof PackageDraft, value: string | number) {
    setPackages((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
    resetQuoteState();
  }

  function addPackage() {
    const next = createPackageDraft();
    setPackages((current) => [...current, next]);
    setOpenPackageId(next.id);
    resetQuoteState();
  }

  function removePackage(id: string) {
    setPackages((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
    resetQuoteState();
  }

  function addMultiDestination() {
    setExtraDestinations((current) => [...current, createMultiDestinationDraft()]);
  }

  function updateMultiDestination(id: string, key: keyof MultiDestinationDraft, value: string) {
    setExtraDestinations((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  function removeMultiDestination(id: string) {
    setExtraDestinations((current) => current.filter((item) => item.id !== id));
  }

  function handleAddressSelect(target: "origin" | "destination", entry: AddressBookEntry) {
    if (target === "origin") {
      setSelectedOriginAddressId(entry.id);
      setOrigin(mapAddressEntryToShipment(entry));
    } else {
      setSelectedDestinationAddressId(entry.id);
      setDestination(mapAddressEntryToShipment(entry));
    }
    resetQuoteState();
  }

  function resetQuoteState() {
    setQuote(null);
    setQuoteError("");
    setSelectedOperatorName(null);
  }

  function nextStep() {
    const nextError = validateStep(step, { origin, destination, packages });
    setFormError(nextError);
    if (nextError) return;
    setStep((current) => Math.min(3, current + 1) as WizardStep);
  }

  function previousStep() {
    setFormError("");
    setStep((current) => Math.max(1, current - 1) as WizardStep);
  }

  async function calculateQuote() {
    const nextError = validateStep(2, { origin, destination, packages });
    setFormError(nextError);
    if (nextError) return;

    setQuoteLoading(true);
    setQuoteError("");

    try {
      const result = await apiGetEcuadorDelivereoQuote(buildQuoteRequestBody({ origin, destination, packages, customerNotes, declaredValue }));
      setQuote(result.quote);
      setSelectedOperatorName("Delivereo");
    } catch (nextError) {
      setQuote(null);
      setSelectedOperatorName(null);
      setQuoteError(nextError instanceof Error ? nextError.message : "No pudimos consultar las cotizaciones para esta ruta.");
    } finally {
      setQuoteLoading(false);
    }
  }

  async function submitRequest() {
    const nextError = validateStep(3, { origin, destination, packages });
    setFormError(nextError);
    if (nextError) return;

    setSubmitting(true);
    setFormError("");

    try {
      const result = await apiCreateEcuadorShipmentRequest(
        buildShipmentRequestBody({
          origin,
          destination,
          packages,
          customerNotes,
          declaredValue,
          selectedOperatorName,
          quote,
          extraDestinations,
        }),
      );
      router.push(`/ecuador/envios/${result.shipment.id}`);
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : "No pudimos guardar tu solicitud Ecuador.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge tone="blue" className="border border-sky-100 bg-sky-50 text-sky-700 ring-sky-100">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Cotización de envío
            </Badge>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Prepara tu solicitud Ecuador en tres pasos</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Organiza origen, destino, paquetes y cotizaciones disponibles desde una experiencia multicourier en español. Sin cobro y sin orden real todavía.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-sky-100 bg-sky-50/70 p-4 text-sm text-slate-600">
            <p className="font-black text-sky-700">Solicitud Ecuador</p>
            <p className="mt-2 leading-6">
              Puedes guardar una solicitud interna y seleccionar el operador que prefieras. Los operadores en preparación no muestran precios falsos.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {stepLabels.map((label, index) => {
            const currentStep = (index + 1) as WizardStep;
            const active = step === currentStep;
            const completed = step > currentStep;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(currentStep)}
                className={`rounded-3xl border p-4 text-left transition ${
                  active
                    ? "border-sky-300 bg-sky-50"
                    : completed
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-slate-200 bg-slate-50/70 hover:border-sky-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-2xl text-sm font-black ${
                      active ? "bg-sky-600 text-white" : completed ? "bg-emerald-600 text-white" : "bg-white text-slate-500"
                    }`}
                  >
                    {completed ? <CheckCircle2 className="h-4 w-4" /> : currentStep}
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Paso {currentStep}</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {formError ? (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold">{formError}</p>
        </div>
      ) : null}

      {step === 1 ? (
        <StepAddresses
          origin={origin}
          destination={destination}
          selectedOriginAddressId={selectedOriginAddressId}
          selectedDestinationAddressId={selectedDestinationAddressId}
          extraDestinations={extraDestinations}
          onOriginSelect={(entry) => handleAddressSelect("origin", entry)}
          onDestinationSelect={(entry) => handleAddressSelect("destination", entry)}
          onAddressChange={updateAddress}
          onAddMultiDestination={addMultiDestination}
          onUpdateMultiDestination={updateMultiDestination}
          onRemoveMultiDestination={removeMultiDestination}
        />
      ) : null}

      {step === 2 ? (
        <StepPackages
          packages={packages}
          declaredValue={declaredValue}
          customerNotes={customerNotes}
          packageTotals={packageTotals}
          openPackageId={openPackageId}
          onTogglePackage={setOpenPackageId}
          onAddPackage={addPackage}
          onUpdatePackage={updatePackage}
          onRemovePackage={removePackage}
          onDeclaredValueChange={setDeclaredValue}
          onCustomerNotesChange={setCustomerNotes}
        />
      ) : null}

      {step === 3 ? (
        <StepQuotes
          origin={origin}
          destination={destination}
          extraDestinations={extraDestinations}
          packageTotals={packageTotals}
          quote={quote}
          quoteLoading={quoteLoading}
          quoteError={quoteError}
          selectedOperatorName={selectedOperatorName}
          onCalculateQuote={calculateQuote}
          onSelectOperator={setSelectedOperatorName}
        />
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-600">
            {step === 3
              ? "Cuando confirmes, guardaremos tu solicitud Ecuador para revisión interna. No se crea orden real ni se procesa ningún pago."
              : "Puedes avanzar entre pasos, volver atrás y seguir preparando tu solicitud sin crear órdenes reales."}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {step > 1 ? (
              <button
                type="button"
                onClick={previousStep}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Volver
              </button>
            ) : null}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submitRequest}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? "Guardando solicitud..." : selectedOperatorName ? `Solicitar opción ${selectedOperatorName}` : "Guardar solicitud Ecuador"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StepAddresses({
  origin,
  destination,
  selectedOriginAddressId,
  selectedDestinationAddressId,
  extraDestinations,
  onOriginSelect,
  onDestinationSelect,
  onAddressChange,
  onAddMultiDestination,
  onUpdateMultiDestination,
  onRemoveMultiDestination,
}: {
  origin: ShipmentAddress;
  destination: ShipmentAddress;
  selectedOriginAddressId: string | null;
  selectedDestinationAddressId: string | null;
  extraDestinations: MultiDestinationDraft[];
  onOriginSelect: (entry: AddressBookEntry) => void;
  onDestinationSelect: (entry: AddressBookEntry) => void;
  onAddressChange: (target: "origin" | "destination", key: keyof ShipmentAddress, value: string) => void;
  onAddMultiDestination: () => void;
  onUpdateMultiDestination: (id: string, key: keyof MultiDestinationDraft, value: string) => void;
  onRemoveMultiDestination: (id: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
      <div className="grid gap-5">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Paso 1</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Origen y destino</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Elige direcciones guardadas, completa los datos manualmente y prepara varios destinos si tu operación lo necesita.
              </p>
            </div>
            <button
              type="button"
              onClick={onAddMultiDestination}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir multi-envío
            </button>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <AddressPanel
              title="Origen"
              label="Remitente"
              address={origin}
              selectedAddressId={selectedOriginAddressId}
              role="sender"
              accent="sky"
              onAddressSelect={onOriginSelect}
              onAddressChange={(key, value) => onAddressChange("origin", key, value)}
            />
            <AddressPanel
              title="Destino"
              label="Destinatario"
              address={destination}
              selectedAddressId={selectedDestinationAddressId}
              role="recipient"
              accent="orange"
              onAddressSelect={onDestinationSelect}
              onAddressChange={(key, value) => onAddressChange("destination", key, value)}
            />
          </div>
        </section>

        {extraDestinations.length > 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Multi-envío</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">Destinos adicionales preparados</h3>
              </div>
              <Badge tone="blue" className="border border-sky-100 bg-sky-50 text-sky-700 ring-sky-100">
                Solo preparación
              </Badge>
            </div>
            <div className="mt-4 grid gap-4">
              {extraDestinations.map((item, index) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">Destino adicional {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => onRemoveMultiDestination(item.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                      aria-label="Eliminar destino adicional"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <TextField label="Etiqueta" value={item.label} onChange={(value) => onUpdateMultiDestination(item.id, "label", value)} placeholder="Cliente frecuente" />
                    <TextField label="Nombre / contacto" value={item.name} onChange={(value) => onUpdateMultiDestination(item.id, "name", value)} placeholder="María Torres" />
                    <TextField label="Ciudad" value={item.city} onChange={(value) => onUpdateMultiDestination(item.id, "city", value)} placeholder="Quito" />
                    <TextField label="Dirección" value={item.address} onChange={(value) => onUpdateMultiDestination(item.id, "address", value)} placeholder="Av. 6 de Diciembre y..." />
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Referencia</span>
                    <textarea
                      value={item.reference}
                      onChange={(event) => onUpdateMultiDestination(item.id, "reference", event.target.value)}
                      className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                      placeholder="Observaciones para preparación operativa"
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <aside className="grid content-start gap-5">
        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-sm shadow-slate-950/5">
          <div className="relative aspect-[4/3]">
            <Image
              src="/images/ecuador/maps/ecuador-map-coverage.webp"
              alt="Cobertura Ecuador con rutas y ciudades principales"
              fill
              sizes="360px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(15,23,42,0.12)_100%)]" />
            <div className="absolute left-4 top-4 rounded-2xl border border-white/80 bg-white/92 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Mapa visual</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">Cobertura local y nacional en preparación</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm font-bold text-slate-700">Selecciona ciudades frecuentes para completar más rápido:</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {CITY_OPTIONS.map((city) => (
                <span key={city} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                  {city}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              El buscador de direcciones y el mapa quedan listos para conectarse a autocomplete cuando el entorno lo habilite. Mientras tanto, puedes pegar direcciones completas y apoyarte en la libreta.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function StepPackages({
  packages,
  declaredValue,
  customerNotes,
  packageTotals,
  openPackageId,
  onTogglePackage,
  onAddPackage,
  onUpdatePackage,
  onRemovePackage,
  onDeclaredValueChange,
  onCustomerNotesChange,
}: {
  packages: PackageDraft[];
  declaredValue?: number;
  customerNotes: string;
  packageTotals: { totalWeight: number; count: number };
  openPackageId: string | null;
  onTogglePackage: (id: string | null) => void;
  onAddPackage: () => void;
  onUpdatePackage: (id: string, key: keyof PackageDraft, value: string | number) => void;
  onRemovePackage: (id: string) => void;
  onDeclaredValueChange: (value: number | undefined) => void;
  onCustomerNotesChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_340px]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Paso 2</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Paquetes y multi-bulto</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Usa centímetros y kilogramos para preparar cada paquete. Puedes añadir varios bultos antes de consultar cotizaciones.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddPackage}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir otro paquete
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {packages.map((pkg, index) => {
            const open = openPackageId === pkg.id;
            return (
              <div key={pkg.id} className="rounded-[1.8rem] border border-slate-200 bg-slate-50/70 p-4">
                <button
                  type="button"
                  onClick={() => onTogglePackage(open ? null : pkg.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-sm font-black text-slate-950">Paquete {index + 1}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {pkg.lengthCm}x{pkg.widthCm}x{pkg.heightCm} cm · {pkg.weightKg} kg · {pkg.quantity} unidad(es)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {packages.length > 1 ? (
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemovePackage(pkg.id);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500"
                      >
                        <X className="h-4 w-4" />
                      </span>
                    ) : null}
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
                      <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                    </span>
                  </div>
                </button>

                {open ? (
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label="Contenido"
                        value={pkg.content}
                        onChange={(value) => onUpdatePackage(pkg.id, "content", value)}
                        placeholder="Ropa, accesorios, repuestos..."
                      />
                      <NumberField
                        label="Cantidad"
                        value={pkg.quantity}
                        onChange={(value) => onUpdatePackage(pkg.id, "quantity", value)}
                        min={1}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                      <NumberField
                        label="Peso (kg)"
                        value={pkg.weightKg}
                        onChange={(value) => onUpdatePackage(pkg.id, "weightKg", value)}
                      />
                      <NumberField
                        label="Largo (cm)"
                        value={pkg.lengthCm}
                        onChange={(value) => onUpdatePackage(pkg.id, "lengthCm", value)}
                      />
                      <NumberField
                        label="Ancho (cm)"
                        value={pkg.widthCm}
                        onChange={(value) => onUpdatePackage(pkg.id, "widthCm", value)}
                      />
                      <NumberField
                        label="Alto (cm)"
                        value={pkg.heightCm}
                        onChange={(value) => onUpdatePackage(pkg.id, "heightCm", value)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <NumberField label="Valor declarado total (USD)" value={declaredValue ?? 0} onChange={(value) => onDeclaredValueChange(value || undefined)} />
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Notas de solicitud</span>
            <textarea
              value={customerNotes}
              onChange={(event) => onCustomerNotesChange(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              placeholder="Horarios, fragilidad, volumen especial o instrucciones para la revisión interna."
            />
          </label>
        </div>
      </section>

      <aside className="grid content-start gap-5">
        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm shadow-slate-950/5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Resumen lateral</p>
          <h3 className="mt-2 text-xl font-black text-slate-950">Tu carga actual</h3>
          <div className="mt-4 grid gap-3">
            <MiniStat label="Paquetes" value={String(packageTotals.count)} />
            <MiniStat label="Peso total" value={`${packageTotals.totalWeight.toFixed(2)} kg`} />
            <MiniStat label="Unidad" value="cm / kg" />
          </div>
          <div className="mt-4 grid gap-3">
            {packages.map((pkg, index) => (
              <div key={pkg.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Paquete {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {pkg.lengthCm}x{pkg.widthCm}x{pkg.heightCm} cm · {pkg.weightKg} kg
                </p>
                <p className="mt-1 text-sm text-slate-500">{pkg.content || "Contenido por definir"}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function StepQuotes({
  origin,
  destination,
  extraDestinations,
  packageTotals,
  quote,
  quoteLoading,
  quoteError,
  selectedOperatorName,
  onCalculateQuote,
  onSelectOperator,
}: {
  origin: ShipmentAddress;
  destination: ShipmentAddress;
  extraDestinations: MultiDestinationDraft[];
  packageTotals: { totalWeight: number; count: number };
  quote: EcuadorQuoteResult | null;
  quoteLoading: boolean;
  quoteError: string;
  selectedOperatorName: string | null;
  onCalculateQuote: () => void;
  onSelectOperator: (operatorName: string) => void;
}) {
  return (
    <div className="grid gap-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Paso 3</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Tarifas y cotizaciones</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Consulta operadores disponibles para tus paquetes. La plataforma muestra resultados sin crear orden real y sin exponer detalles técnicos del proveedor.
            </p>
          </div>
          <button
            type="button"
            onClick={onCalculateQuote}
            disabled={quoteLoading}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#F97316] px-5 text-sm font-bold text-white shadow-xl shadow-orange-500/20 transition hover:bg-[#EA580C] disabled:opacity-60"
          >
            {quoteLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando mejores precios
              </>
            ) : quote ? (
              "Actualizar cotizaciones"
            ) : (
              "Buscar cotizaciones"
            )}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Origen" value={origin.city || "Por definir"} />
          <MiniStat label="Destino" value={destination.city || "Por definir"} />
          <MiniStat label="Paquetes" value={`${packageTotals.count} bulto(s)`} />
          <MiniStat label="Peso total" value={`${packageTotals.totalWeight.toFixed(2)} kg`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">Sin cobro</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">No crea orden real todavía</span>
          {extraDestinations.length > 0 ? (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
              {extraDestinations.length} destino(s) adicional(es) en preparación
            </span>
          ) : null}
        </div>
      </section>

      {quoteLoading ? <QuoteLoadingCard origin={origin.city} destination={destination.city} /> : null}

      {quoteError ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {quoteError}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Operadores disponibles</h3>
            <p className="mt-1 text-sm text-slate-500">SendiFlash presenta opciones disponibles y operadores en preparación para esta ruta.</p>
          </div>
          <Badge tone="blue" className="border border-sky-100 bg-sky-50 text-sky-700 ring-sky-100">
            Multicourier Ecuador
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {ECUADOR_OPERATORS.map((operator) => {
            const hasLiveQuote = operator.name === "Delivereo" && quote;
            const selected = selectedOperatorName === operator.name;

            return (
              <button
                key={operator.name}
                type="button"
                onClick={() => onSelectOperator(operator.name)}
                className={`rounded-[1.8rem] border p-5 text-left transition ${
                  selected
                    ? "border-sky-300 bg-sky-50"
                    : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                      <Image
                        src={operator.logo}
                        alt={`${operator.name} logo`}
                        width={120}
                        height={40}
                        className="max-h-8 w-auto"
                      />
                    </div>
                    <div className="min-w-0">
                    <p className="text-lg font-black text-slate-950">{operator.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {hasLiveQuote ? "Cotización disponible para esta ruta" : "Operador visible dentro del agregador SendiFlash"}
                    </p>
                  </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      hasLiveQuote ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {hasLiveQuote ? "Cotización disponible" : "En preparación"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ResultInfo
                    label="Precio estimado"
                    value={hasLiveQuote && quote.customerPrice != null ? formatCurrency(quote.customerPrice) : "Próximamente"}
                  />
                  <ResultInfo
                    label="Tiempo estimado"
                    value={hasLiveQuote ? quote.estimatedTime || "Por confirmar" : "En preparación"}
                  />
                  <ResultInfo
                    label="Estado"
                    value={hasLiveQuote ? "Sin cobro · solicitud disponible" : "Visible para preparación"}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    {selected
                      ? "Esta opción quedará asociada a tu solicitud."
                      : hasLiveQuote
                        ? "Selecciona esta opción para guardar la solicitud Ecuador."
                        : "Puedes dejarla marcada como preferencia para seguimiento interno."}
                  </p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
                    {selected ? "Seleccionada" : hasLiveQuote ? "Seleccionar" : "Solicitar esta opción"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AddressPanel({
  title,
  label,
  address,
  selectedAddressId,
  role,
  accent,
  onAddressSelect,
  onAddressChange,
}: {
  title: string;
  label: string;
  address: ShipmentAddress;
  selectedAddressId: string | null;
  role: "sender" | "recipient";
  accent: "sky" | "orange";
  onAddressSelect: (entry: AddressBookEntry) => void;
  onAddressChange: (key: keyof ShipmentAddress, value: string) => void;
}) {
  const toneClasses =
    accent === "sky" ? "border-sky-100 bg-sky-50/50" : "border-orange-100 bg-orange-50/60";

  return (
    <div className={`rounded-[1.8rem] border p-4 ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
        </div>
        <Badge tone="blue" className="border border-white/70 bg-white text-slate-600 ring-0">
          {role === "sender" ? "Remitente" : "Destinatario"}
        </Badge>
      </div>

      <div className="mt-4">
        <AddressBookSelector
          title={`${title} guardado`}
          role={role}
          selectedId={selectedAddressId}
          onSelect={onAddressSelect}
        />
      </div>

      <div className="mt-4 grid gap-4">
        <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            <Search className="h-3.5 w-3.5" />
            Buscar o pegar dirección
          </div>
          <input
            value={address.address}
            onChange={(event) => onAddressChange("address", event.target.value)}
            placeholder="Escribe o pega una dirección completa"
            className="mt-3 min-h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Campo listo para conectarse a autocomplete cuando el entorno lo habilite. Mientras tanto, puedes pegar direcciones completas sin romper el flujo.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Nombre / contacto" value={address.name} onChange={(value) => onAddressChange("name", value)} placeholder="Andrea Torres" />
          <TextField label="Teléfono" value={address.phone} onChange={(value) => onAddressChange("phone", value)} placeholder="+593 99 123 4567" />
          <TextField label="Ciudad" value={address.city} onChange={(value) => onAddressChange("city", value)} placeholder="Quito" />
          <TextField label="Provincia / estado" value={address.region} onChange={(value) => onAddressChange("region", value)} placeholder="Pichincha" />
          <TextField label="Código postal" value={address.postalCode} onChange={(value) => onAddressChange("postalCode", value)} placeholder="170150" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CITY_OPTIONS.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => onAddressChange("city", city)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
          >
            {city}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Referencia</span>
        <textarea
          value={address.reference}
          onChange={(event) => onAddressChange("reference", event.target.value)}
          className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          placeholder="Edificio, barrio, puntos de referencia o indicaciones"
        />
      </label>
    </div>
  );
}

function QuoteLoadingCard({ origin, destination }: { origin: string; destination: string }) {
  return (
    <section className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-950">Buscando mejores precios</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Consultando operadores disponibles para tus paquetes entre {origin || "origen"} y {destination || "destino"}.
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Esto no genera cobro ni orden real.</p>
        </div>
        <div className="flex gap-3" aria-hidden="true">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">
            <Package className="h-5 w-5 animate-bounce" />
          </span>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[#F97316]">
            <Truck className="h-5 w-5 animate-pulse" />
          </span>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
        </div>
      </div>
    </section>
  );
}

function ResultInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input
        type="number"
        min={min}
        step="any"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function mapAddressEntryToShipment(entry: AddressBookEntry): ShipmentAddress {
  return {
    name: entry.contactName,
    phone: entry.phone,
    address: entry.addressLine1,
    city: entry.city,
    reference: entry.reference ?? "",
    region: entry.region,
    postalCode: entry.postalCode ?? "",
  };
}

function getInitialAddressSelections(entries: AddressBookEntry[]) {
  const defaultOrigin = entries.find((entry) => entry.isDefault && (entry.role === "sender" || entry.role === "both")) ?? null;
  const defaultDestination = entries.find((entry) => entry.isDefault && (entry.role === "recipient" || entry.role === "both")) ?? null;
  const lastUsed = readLastUsedAddress();
  const remembered = lastUsed?.id ? entries.find((entry) => entry.id === lastUsed.id) ?? null : null;

  return {
    origin: defaultOrigin,
    destination:
      remembered && (remembered.role === "recipient" || remembered.role === "both")
        ? remembered
        : defaultDestination,
  };
}

function buildQuoteRequestBody(input: {
  origin: ShipmentAddress;
  destination: ShipmentAddress;
  packages: PackageDraft[];
  customerNotes: string;
  declaredValue?: number;
}) {
  const aggregate = aggregatePackages(input.packages);

  return {
    originName: input.origin.name,
    originPhone: input.origin.phone,
    originAddress: input.origin.address,
    originCity: input.origin.city,
    originReference: input.origin.reference,
    destinationName: input.destination.name,
    destinationPhone: input.destination.phone,
    destinationAddress: input.destination.address,
    destinationCity: input.destination.city,
    destinationReference: input.destination.reference,
    packageDescription: aggregate.description,
    packageWeight: aggregate.totalWeight,
    packageLength: aggregate.lengthCm,
    packageWidth: aggregate.widthCm,
    packageHeight: aggregate.heightCm,
    declaredValue: input.declaredValue,
    customerNotes: input.customerNotes,
    language: "es" as const,
  };
}

function buildShipmentRequestBody(input: {
  origin: ShipmentAddress;
  destination: ShipmentAddress;
  packages: PackageDraft[];
  customerNotes: string;
  declaredValue?: number;
  selectedOperatorName: string | null;
  quote: EcuadorQuoteResult | null;
  extraDestinations: MultiDestinationDraft[];
}): CreateEcuadorShipmentRequestBody {
  const aggregate = aggregatePackages(input.packages);
  const extraNotes = [
    input.customerNotes.trim(),
    input.selectedOperatorName ? `Operador solicitado: ${input.selectedOperatorName}.` : "",
    input.quote?.customerPrice != null ? `Precio estimado visible: ${input.quote.customerPrice} ${input.quote.currency}.` : "",
    input.extraDestinations.length > 0
      ? `Multi-envío preparado: ${input.extraDestinations
          .map((item) => `${item.label || item.name || "Destino"} (${item.city})`)
          .join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    provider: "manual",
    status: "quote_requested",
    originName: input.origin.name,
    originPhone: input.origin.phone,
    originAddress: input.origin.address,
    originCity: input.origin.city,
    originReference: joinReference(input.origin),
    destinationName: input.destination.name,
    destinationPhone: input.destination.phone,
    destinationAddress: input.destination.address,
    destinationCity: input.destination.city,
    destinationReference: joinReference(input.destination),
    packageDescription: aggregate.description,
    packageWeight: aggregate.totalWeight,
    packageLength: aggregate.lengthCm,
    packageWidth: aggregate.widthCm,
    packageHeight: aggregate.heightCm,
    declaredValue: input.declaredValue,
    customerNotes: extraNotes || undefined,
  };
}

function aggregatePackages(packages: PackageDraft[]) {
  const totalWeight = packages.reduce((sum, item) => sum + item.weightKg * Math.max(1, item.quantity), 0);
  const lengthCm = packages.reduce((max, item) => Math.max(max, item.lengthCm), 0);
  const widthCm = packages.reduce((max, item) => Math.max(max, item.widthCm), 0);
  const heightCm = packages.reduce((sum, item) => sum + item.heightCm * Math.max(1, item.quantity), 0);
  const description = packages
    .map((item, index) => `${item.quantity}x ${item.content || `Paquete ${index + 1}`}`)
    .join(" · ");

  return {
    totalWeight: Number(totalWeight.toFixed(2)),
    lengthCm,
    widthCm,
    heightCm,
    description,
  };
}

function validateStep(step: WizardStep, input: { origin: ShipmentAddress; destination: ShipmentAddress; packages: PackageDraft[] }) {
  if (step >= 1) {
    if (!input.origin.name || !input.origin.phone || !input.origin.address || !input.origin.city) {
      return "Completa nombre, teléfono, dirección y ciudad del origen antes de continuar.";
    }
    if (!input.destination.name || !input.destination.phone || !input.destination.address || !input.destination.city) {
      return "Completa nombre, teléfono, dirección y ciudad del destino antes de continuar.";
    }
  }

  if (step >= 2) {
    const invalidPackage = input.packages.find(
      (item) =>
        !item.content ||
        item.weightKg <= 0 ||
        item.lengthCm <= 0 ||
        item.widthCm <= 0 ||
        item.heightCm <= 0 ||
        item.quantity <= 0,
    );

    if (invalidPackage) {
      return "Completa contenido, cantidad, peso y dimensiones de cada paquete antes de consultar cotizaciones.";
    }
  }

  return "";
}

function joinReference(address: ShipmentAddress) {
  return [address.reference, address.region ? `Provincia/estado: ${address.region}` : "", address.postalCode ? `Código postal: ${address.postalCode}` : ""]
    .filter(Boolean)
    .join(" · ");
}

function createLocalId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

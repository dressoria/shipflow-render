"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { AddressBookDialog } from "@/components/AddressBookDialog";
import { AddressBookSelector } from "@/components/AddressBookSelector";
import { ECUADOR_OPERATORS } from "@/components/EcuadorOperatorsLogos";
import { useAddressBook } from "@/hooks/useAddressBook";
import {
  readLastUsedAddress,
  type AddressBookEntry,
  type AddressBookEntryDraft,
} from "@/lib/addressBook";
import { loadGoogleMapsScript, parseAddressComponents } from "@/lib/googleMapsUtils";
import {
  apiCreateEcuadorShipmentRequest,
  apiGetEcuadorQuotes,
  type EcuadorProviderQuoteResult,
  type CreateEcuadorShipmentRequestBody,
} from "@/lib/services/apiClient";
import { formatCurrency } from "@/lib/utils";

type WizardStep = 1 | 2 | 3 | 4;

type ShipmentAddress = {
  name: string;
  phone: string;
  streetMain: string;
  streetCrossing: string;
  address: string;
  city: string;
  reference: string;
  region: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
};

type EcuadorGoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type EcuadorGooglePlace = {
  address_components?: EcuadorGoogleAddressComponent[];
  formatted_address?: string;
  geometry?: {
    location?: {
      lat(): number;
      lng(): number;
    };
  };
};

type EcuadorGoogleAutocomplete = {
  addListener(event: string, fn: () => void): void;
  getPlace(): EcuadorGooglePlace;
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
const ECUADOR_PROVINCES = [
  "Azuay",
  "Bolivar",
  "Cañar",
  "Carchi",
  "Chimborazo",
  "Cotopaxi",
  "El Oro",
  "Esmeraldas",
  "Galápagos",
  "Guayas",
  "Imbabura",
  "Loja",
  "Los Ríos",
  "Manabí",
  "Morona Santiago",
  "Napo",
  "Orellana",
  "Pastaza",
  "Pichincha",
  "Santa Elena",
  "Santo Domingo de los Tsáchilas",
  "Sucumbíos",
  "Tungurahua",
  "Zamora Chinchipe",
] as const;
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
const HAS_ECUADOR_GOOGLE_AUTOCOMPLETE = Boolean(GOOGLE_MAPS_KEY);

const initialAddress = (): ShipmentAddress => ({
  name: "",
  phone: "",
  streetMain: "",
  streetCrossing: "",
  address: "",
  city: "",
  reference: "",
  region: "",
  postalCode: "",
  latitude: undefined,
  longitude: undefined,
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

const STEP_LABELS = ["Origen y destino", "Productos / paquetes", "Transportadora", "Resumen"] as const;

const PACKAGE_SIZE_PRESETS = [
  { label: "Pequeño", dims: { lengthCm: 10, widthCm: 10, heightCm: 20 } },
  { label: "Mediano", dims: { lengthCm: 20, widthCm: 20, heightCm: 25 } },
  { label: "Grande", dims: { lengthCm: 30, widthCm: 30, heightCm: 30 } },
] as const;

export function EcuadorShipmentRequestForm() {
  const router = useRouter();
  const { entries, upsertEntry } = useAddressBook();
  const initialSelections = getInitialAddressSelections(entries);
  const firstPackage = useMemo(() => createPackageDraft(), []);
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
  const [packages, setPackages] = useState<PackageDraft[]>([firstPackage]);
  const [openPackageId, setOpenPackageId] = useState<string | null>(firstPackage.id);
  const [customerNotes, setCustomerNotes] = useState("");
  const [declaredValue, setDeclaredValue] = useState<number | undefined>(undefined);
  const [quoteResults, setQuoteResults] = useState<EcuadorProviderQuoteResult[]>([]);
  const [quoteSummary, setQuoteSummary] = useState<{
    totalProviders: number;
    realQuotesCount: number;
    pendingProvidersCount: number;
    failedProvidersCount: number;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedOperatorName, setSelectedOperatorName] = useState<string | null>(null);
  const [saveAddressTarget, setSaveAddressTarget] = useState<"origin" | "destination" | null>(null);

  const packageTotals = useMemo(() => {
    const totalWeight = packages.reduce((sum, item) => sum + item.weightKg * Math.max(1, item.quantity), 0);
    const count = packages.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
    return { totalWeight, count };
  }, [packages]);

  useEffect(() => {
    if (entries.length === 0) return;
    const defaults = getInitialAddressSelections(entries);

    Promise.resolve().then(() => {
      if (!selectedOriginAddressId && defaults.origin) {
        setSelectedOriginAddressId(defaults.origin.id);
        setOrigin((current) => (current.city ? current : mapAddressEntryToShipment(defaults.origin as AddressBookEntry)));
      }
      if (!selectedDestinationAddressId && defaults.destination) {
        setSelectedDestinationAddressId(defaults.destination.id);
        setDestination((current) => (current.city ? current : mapAddressEntryToShipment(defaults.destination as AddressBookEntry)));
      }
    });
  }, [entries, selectedDestinationAddressId, selectedOriginAddressId]);

  const defaultSenderAddress =
    entries.find((entry) => entry.isDefaultSender && (entry.role === "sender" || entry.role === "both")) ?? null;
  const defaultRecipientAddress =
    entries.find((entry) => entry.isDefaultRecipient && (entry.role === "recipient" || entry.role === "both")) ?? null;
  const saveAddressDraft =
    saveAddressTarget === "origin"
      ? buildAddressBookDraftFromShipment(origin, "sender")
      : saveAddressTarget === "destination"
        ? buildAddressBookDraftFromShipment(destination, "recipient")
        : null;
  const selectedQuoteResult = quoteResults.find((item) => item.ok && item.providerName === selectedOperatorName) ?? null;

  function updateAddress(target: "origin" | "destination", key: keyof ShipmentAddress, value: string | number | undefined) {
    const shouldClearCoordinates =
      key === "address" || key === "streetMain" || key === "streetCrossing" || key === "city" || key === "region" || key === "postalCode";

    if (target === "origin") {
      setOrigin((current) => ({
        ...current,
        [key]: value,
        ...(shouldClearCoordinates ? { latitude: undefined, longitude: undefined } : {}),
      }));
      if (key !== "reference") setSelectedOriginAddressId(null);
    } else {
      setDestination((current) => ({
        ...current,
        [key]: value,
        ...(shouldClearCoordinates ? { latitude: undefined, longitude: undefined } : {}),
      }));
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
    setPackages((current) => {
      if (current.length === 1) return current;
      const next = current.filter((item) => item.id !== id);
      if (openPackageId === id) {
        setOpenPackageId(next[0]?.id ?? null);
      }
      return next;
    });
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
    setQuoteResults([]);
    setQuoteSummary(null);
    setQuoteError("");
    setSelectedOperatorName(null);
  }

  function nextStep() {
    const nextError = validateStep(step, { origin, destination, packages });
    setFormError(nextError);
    if (nextError) return;
    setStep((current) => Math.min(4, current + 1) as WizardStep);
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
      const result = await apiGetEcuadorQuotes(buildQuoteRequestBody({ origin, destination, packages, customerNotes, declaredValue }));
      setQuoteResults(result.results);
      setQuoteSummary(result.summary);
      setSelectedOperatorName(null);
    } catch (nextError) {
      setQuoteResults([]);
      setQuoteSummary(null);
      setSelectedOperatorName(null);
      setQuoteError(nextError instanceof Error ? nextError.message : "No pudimos consultar las cotizaciones para esta ruta.");
    } finally {
      setQuoteLoading(false);
    }
  }

  async function submitRequest() {
    const nextError = validateStep(4, { origin, destination, packages });
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
          selectedQuoteResult,
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
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Prepara tu solicitud Ecuador en cuatro pasos</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Organiza origen, destino, paquetes y cotizaciones disponibles desde una experiencia multicourier en español. Sin cobro y sin orden real todavía.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-sky-100 bg-sky-50/70 p-4 text-sm text-slate-600">
            <p className="font-black text-sky-700">Solicitud Ecuador</p>
            <p className="mt-2 leading-6">
              Puedes guardar una solicitud interna y seleccionar el operador que prefieras. Los operadores en preparación no muestran precios falsos.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Cotización referencial · Sin cobro · Sin orden real
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {STEP_LABELS.map((label, index) => {
            const currentStep = (index + 1) as WizardStep;
            const active = step === currentStep;
            const completed = step > currentStep;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(currentStep)}
                className={`rounded-3xl border p-3 text-left transition sm:p-4 ${
                  active
                    ? "border-sky-300 bg-sky-50"
                    : completed
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-slate-200 bg-slate-50/70 hover:border-sky-200"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-black sm:h-8 sm:w-8 sm:rounded-2xl sm:text-sm ${
                      active ? "bg-sky-600 text-white" : completed ? "bg-emerald-600 text-white" : "bg-white text-slate-500"
                    }`}
                  >
                    {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : currentStep}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Paso {currentStep}</p>
                    <p className="mt-0.5 truncate text-xs font-black text-slate-950 sm:text-sm">{label}</p>
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
          entries={entries}
          origin={origin}
          destination={destination}
          selectedOriginAddressId={selectedOriginAddressId}
          selectedDestinationAddressId={selectedDestinationAddressId}
          defaultSenderAddress={defaultSenderAddress}
          defaultRecipientAddress={defaultRecipientAddress}
          extraDestinations={extraDestinations}
          onOriginSelect={(entry) => handleAddressSelect("origin", entry)}
          onDestinationSelect={(entry) => handleAddressSelect("destination", entry)}
          onAddressChange={updateAddress}
          onAddMultiDestination={addMultiDestination}
          onUpdateMultiDestination={updateMultiDestination}
          onRemoveMultiDestination={removeMultiDestination}
          onOpenSaveAddress={setSaveAddressTarget}
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
        <StepCarrier
          origin={origin}
          destination={destination}
          extraDestinations={extraDestinations}
          packageTotals={packageTotals}
          quoteResults={quoteResults}
          quoteSummary={quoteSummary}
          quoteLoading={quoteLoading}
          quoteError={quoteError}
          selectedOperatorName={selectedOperatorName}
          onCalculateQuote={calculateQuote}
          onSelectOperator={setSelectedOperatorName}
        />
      ) : null}

      {step === 4 ? (
        <StepSummary
          origin={origin}
          destination={destination}
          packages={packages}
          packageTotals={packageTotals}
          extraDestinations={extraDestinations}
          selectedOperatorName={selectedOperatorName}
          selectedQuoteResult={selectedQuoteResult}
          declaredValue={declaredValue}
          customerNotes={customerNotes}
          submitting={submitting}
          onSubmit={submitRequest}
        />
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-600">
            {step === 4
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

            {step < 4 ? (
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

      {saveAddressDraft ? (
        <AddressBookDialog
          key={`${saveAddressTarget}-${saveAddressDraft.label}-${saveAddressDraft.addressLine1}`}
          open={Boolean(saveAddressTarget)}
          draftSeed={saveAddressDraft}
          onClose={() => setSaveAddressTarget(null)}
          onSave={async (draft) => {
            await upsertEntry(draft);
            setSaveAddressTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}

function StepAddresses({
  entries,
  origin,
  destination,
  selectedOriginAddressId,
  selectedDestinationAddressId,
  defaultSenderAddress,
  defaultRecipientAddress,
  extraDestinations,
  onOriginSelect,
  onDestinationSelect,
  onAddressChange,
  onAddMultiDestination,
  onUpdateMultiDestination,
  onRemoveMultiDestination,
  onOpenSaveAddress,
}: {
  entries: AddressBookEntry[];
  origin: ShipmentAddress;
  destination: ShipmentAddress;
  selectedOriginAddressId: string | null;
  selectedDestinationAddressId: string | null;
  defaultSenderAddress: AddressBookEntry | null;
  defaultRecipientAddress: AddressBookEntry | null;
  extraDestinations: MultiDestinationDraft[];
  onOriginSelect: (entry: AddressBookEntry) => void;
  onDestinationSelect: (entry: AddressBookEntry) => void;
  onAddressChange: (target: "origin" | "destination", key: keyof ShipmentAddress, value: string | number | undefined) => void;
  onAddMultiDestination: () => void;
  onUpdateMultiDestination: (id: string, key: keyof MultiDestinationDraft, value: string) => void;
  onRemoveMultiDestination: (id: string) => void;
  onOpenSaveAddress: (target: "origin" | "destination") => void;
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
                Elige direcciones guardadas o completa los datos de remitente y destinatario con ciudad, calle y referencia.
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
              hasSavedAddresses={entries.length > 0}
              selectedAddressId={selectedOriginAddressId}
              defaultEntry={defaultSenderAddress}
              role="sender"
              accent="sky"
              onAddressSelect={onOriginSelect}
              onAddressChange={(key, value) => onAddressChange("origin", key, value)}
              onUseDefault={() => defaultSenderAddress && onOriginSelect(defaultSenderAddress)}
              onSaveAddress={() => onOpenSaveAddress("origin")}
            />
            <AddressPanel
              title="Destino"
              label="Destinatario"
              address={destination}
              hasSavedAddresses={entries.length > 0}
              selectedAddressId={selectedDestinationAddressId}
              defaultEntry={defaultRecipientAddress}
              role="recipient"
              accent="orange"
              onAddressSelect={onDestinationSelect}
              onAddressChange={(key, value) => onAddressChange("destination", key, value)}
              onUseDefault={() => defaultRecipientAddress && onDestinationSelect(defaultRecipientAddress)}
              onSaveAddress={() => onOpenSaveAddress("destination")}
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
                    <TextField label="Ciudad / cantón" value={item.city} onChange={(value) => onUpdateMultiDestination(item.id, "city", value)} placeholder="Quito" />
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
        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm shadow-slate-950/5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Direcciones rápidas</p>
          <h3 className="mt-2 text-xl font-black text-slate-950">Sin depender de código postal</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            En Ecuador los envíos se identifican por ciudad, calle y referencia. Completa los campos manualmente o usa tu libreta guardada.
          </p>
          <div className="mt-4 grid gap-3">
            <MiniStat label="Libreta guardada" value={entries.length > 0 ? `${entries.length} dirección(es)` : "Vacía por ahora"} />
            <MiniStat label="Autocomplete" value={HAS_ECUADOR_GOOGLE_AUTOCOMPLETE ? "Disponible" : "Pendiente de configuración"} />
            <MiniStat label="País activo" value="Ecuador (EC)" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {CITY_OPTIONS.map((city) => (
              <span key={city} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                {city}
              </span>
            ))}
          </div>
          {!HAS_ECUADOR_GOOGLE_AUTOCOMPLETE ? (
            <p className="mt-4 text-xs leading-5 text-slate-500">
              La selección por mapa se habilitará cuando el servicio esté configurado. Mientras tanto, puedes completar la dirección manualmente.
            </p>
          ) : null}
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Paso 2</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Productos / paquetes</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Centímetros y kilogramos. Puedes añadir varios bultos antes de consultar tarifas.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddPackage}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir otro paquete
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {packages.map((pkg, index) => {
            const open = openPackageId === pkg.id;
            const activePreset = PACKAGE_SIZE_PRESETS.find(
              (p) => p.dims.lengthCm === pkg.lengthCm && p.dims.widthCm === pkg.widthCm && p.dims.heightCm === pkg.heightCm,
            );
            return (
              <div
                key={pkg.id}
                className={`rounded-[1.8rem] border transition ${open ? "border-sky-200 bg-sky-50/40" : "border-slate-200 bg-slate-50/60"}`}
              >
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => onTogglePackage(open ? null : pkg.id)}
                  className="flex w-full items-center gap-3 rounded-[1.8rem] p-4 text-left"
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${open ? "bg-sky-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-950">
                      Paquete {index + 1}
                      {pkg.content ? <span className="ml-2 font-semibold text-slate-500">· {pkg.content}</span> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {pkg.lengthCm}×{pkg.widthCm}×{pkg.heightCm}&thinsp;cm · {pkg.weightKg}&thinsp;kg · {pkg.quantity} ud.
                      {activePreset ? <span className="ml-1.5 text-sky-600">({activePreset.label})</span> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {packages.length > 1 ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemovePackage(pkg.id);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:text-red-500"
                        aria-label="Eliminar paquete"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <span className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400">
                      <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
                    </span>
                  </div>
                </button>

                {open ? (
                  <div className="grid gap-4 px-4 pb-5">
                    {/* Size presets */}
                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Tamaño rápido</p>
                      <div className="grid grid-cols-3 gap-2">
                        {PACKAGE_SIZE_PRESETS.map((preset) => {
                          const isActive =
                            pkg.lengthCm === preset.dims.lengthCm &&
                            pkg.widthCm === preset.dims.widthCm &&
                            pkg.heightCm === preset.dims.heightCm;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                onUpdatePackage(pkg.id, "lengthCm", preset.dims.lengthCm);
                                onUpdatePackage(pkg.id, "widthCm", preset.dims.widthCm);
                                onUpdatePackage(pkg.id, "heightCm", preset.dims.heightCm);
                              }}
                              className={`rounded-2xl border p-3 text-left transition ${
                                isActive
                                  ? "border-sky-300 bg-sky-50 shadow-sm"
                                  : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/50"
                              }`}
                            >
                              <div className={`grid h-8 w-8 place-items-center rounded-xl ${isActive ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                                <Package className="h-4 w-4" />
                              </div>
                              <p className={`mt-2 text-sm font-black ${isActive ? "text-sky-700" : "text-slate-800"}`}>{preset.label}</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {preset.dims.lengthCm}×{preset.dims.widthCm}×{preset.dims.heightCm}&thinsp;cm
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fields */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        label="Contenido"
                        value={pkg.content}
                        onChange={(value) => onUpdatePackage(pkg.id, "content", value)}
                        placeholder="Ropa, accesorios, repuestos..."
                      />
                      <NumberField
                        label="Cantidad de paquetes"
                        value={pkg.quantity}
                        onChange={(value) => onUpdatePackage(pkg.id, "quantity", value)}
                        min={1}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <NumberField label="Valor declarado total (USD)" value={declaredValue ?? 0} onChange={(value) => onDeclaredValueChange(value || undefined)} />
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Notas de solicitud</span>
            <textarea
              value={customerNotes}
              onChange={(event) => onCustomerNotesChange(event.target.value)}
              className="mt-2 min-h-[88px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              placeholder="Fragilidad, horarios, instrucciones para revisión interna."
            />
          </label>
        </div>
      </section>

      <aside className="grid content-start gap-5">
        <section className="rounded-[2rem] border border-sky-100 bg-sky-50/40 p-5 shadow-sm shadow-slate-950/5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Resumen de carga</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-sky-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Bultos</p>
              <p className="mt-1 text-2xl font-black text-sky-700">{packageTotals.count}</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Peso total</p>
              <p className="mt-1 text-2xl font-black text-sky-700">{packageTotals.totalWeight.toFixed(1)}<span className="ml-1 text-sm font-bold text-slate-500">kg</span></p>
            </div>
          </div>
          {declaredValue ? (
            <div className="mt-3 rounded-2xl border border-sky-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Valor declarado</p>
              <p className="mt-1 text-lg font-black text-slate-950">${declaredValue}</p>
            </div>
          ) : null}
          <div className="mt-4 rounded-2xl border border-sky-100 bg-white p-3">
            <p className="text-xs leading-5 text-sky-700">
              <span className="font-black">Sin cobro.</span> El peso y dimensiones se usan solo para calcular tarifas referenciales.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function StepCarrier({
  origin,
  destination,
  extraDestinations,
  packageTotals,
  quoteResults,
  quoteSummary,
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
  quoteResults: EcuadorProviderQuoteResult[];
  quoteSummary: {
    totalProviders: number;
    realQuotesCount: number;
    pendingProvidersCount: number;
    failedProvidersCount: number;
  } | null;
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
            <h3 className="mt-2 text-2xl font-black text-slate-950">Opciones de envío</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Calcula las tarifas disponibles para tu ruta. Selecciona la transportadora que prefieras antes de continuar al resumen.
            </p>
          </div>
          <button
            type="button"
            onClick={onCalculateQuote}
            disabled={quoteLoading}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-[#F97316] px-5 text-sm font-bold text-white shadow-xl shadow-orange-500/20 transition hover:bg-[#EA580C] disabled:opacity-60"
          >
            {quoteLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando mejores precios
              </>
            ) : quoteResults.length > 0 ? (
              "Recalcular tarifas"
            ) : (
              "Calcular tarifas"
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
          {quoteSummary ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              {quoteSummary.realQuotesCount} cotización(es) disponible(s) · {quoteSummary.pendingProvidersCount} en preparación
            </span>
          ) : null}
          {extraDestinations.length > 0 ? (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
              {extraDestinations.length} destino(s) adicional(es)
            </span>
          ) : null}
        </div>
      </section>

      {quoteLoading ? <QuoteLoadingCard origin={origin.city} destination={destination.city} /> : null}

      {quoteError ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          No pudimos consultar cotizaciones en este momento. Por favor intenta de nuevo o avanza al resumen.
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Transportadoras disponibles</h3>
            <p className="mt-1 text-sm text-slate-500">
              Tarifas disponibles y operadores en preparación para tu ruta.
            </p>
          </div>
          <Badge tone="blue" className="border border-sky-100 bg-sky-50 text-sky-700 ring-sky-100">
            Multicourier Ecuador
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {ECUADOR_OPERATORS.map((operator) => {
            const providerResult = quoteResults.find((item) => item.providerName === operator.name) ?? null;
            const hasLiveQuote = providerResult?.ok === true;
            const failedResult = providerResult?.ok === false ? providerResult : null;
            const isPendingActivation = failedResult?.reason === "provider_auth_failed";
            const isContactRequired = failedResult?.reason === "contact_required";
            const selected = selectedOperatorName === operator.name;

            const statusLabel = hasLiveQuote
              ? "Cotización disponible"
              : isPendingActivation
                ? "Pendiente de activación"
                : isContactRequired
                  ? "Pendiente de contacto"
                  : "En preparación";

            const priceDisplay = hasLiveQuote ? formatCurrency(providerResult.amount) : "En preparación";
            const etaDisplay = hasLiveQuote
              ? (providerResult.etaLabel || providerResult.estimatedDays || "Por confirmar")
              : "Por confirmar";

            const helperCopy = selected
              ? "Esta opción quedará asociada a tu solicitud."
              : hasLiveQuote
                ? "Selecciona esta opción para incluirla en el resumen."
                : "Puedes marcarla como preferencia para seguimiento interno.";

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
                        {hasLiveQuote ? "Cotización disponible para esta ruta" : "Disponible para preparación de solicitud"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                      hasLiveQuote
                        ? "bg-emerald-50 text-emerald-700"
                        : isPendingActivation
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ResultInfo label="Precio estimado" value={priceDisplay} />
                  <ResultInfo label="Tiempo estimado" value={String(etaDisplay)} />
                  <ResultInfo
                    label="Estado"
                    value={hasLiveQuote ? "Solicitud disponible" : "Visible para preparación"}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">{helperCopy}</p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
                    {selected ? "Seleccionada" : hasLiveQuote ? "Seleccionar" : "Marcar preferencia"}
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

function StepSummary({
  origin,
  destination,
  packages,
  packageTotals,
  extraDestinations,
  selectedOperatorName,
  selectedQuoteResult,
  declaredValue,
  customerNotes,
  submitting,
  onSubmit,
}: {
  origin: ShipmentAddress;
  destination: ShipmentAddress;
  packages: PackageDraft[];
  packageTotals: { totalWeight: number; count: number };
  extraDestinations: MultiDestinationDraft[];
  selectedOperatorName: string | null;
  selectedQuoteResult: EcuadorProviderQuoteResult | null;
  declaredValue?: number;
  customerNotes: string;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const originAddress = buildFullAddress(origin);
  const destinationAddress = buildFullAddress(destination);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_340px]">
      <div className="grid gap-5">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Paso 4</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Resumen de tu solicitud</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Revisa los datos antes de guardar. Esta solicitud no crea ninguna orden real ni genera cobro.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.6rem] border border-sky-100 bg-sky-50/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Origen · Remitente</p>
              <p className="mt-2 text-sm font-black text-slate-950">{origin.name || "Sin nombre"}</p>
              {origin.phone ? <p className="mt-1 text-sm text-slate-600">{origin.phone}</p> : null}
              <p className="mt-1 text-sm text-slate-700">{originAddress || "Dirección incompleta"}</p>
              {origin.city ? (
                <p className="mt-1 text-sm text-slate-600">
                  {origin.city}{origin.region ? `, ${origin.region}` : ""}
                </p>
              ) : null}
              {origin.reference ? (
                <p className="mt-1 text-xs text-slate-500">Ref: {origin.reference}</p>
              ) : null}
            </div>

            <div className="rounded-[1.6rem] border border-orange-100 bg-orange-50/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">Destino · Destinatario</p>
              <p className="mt-2 text-sm font-black text-slate-950">{destination.name || "Sin nombre"}</p>
              {destination.phone ? <p className="mt-1 text-sm text-slate-600">{destination.phone}</p> : null}
              <p className="mt-1 text-sm text-slate-700">{destinationAddress || "Dirección incompleta"}</p>
              {destination.city ? (
                <p className="mt-1 text-sm text-slate-600">
                  {destination.city}{destination.region ? `, ${destination.region}` : ""}
                </p>
              ) : null}
              {destination.reference ? (
                <p className="mt-1 text-xs text-slate-500">Ref: {destination.reference}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Paquetes</p>
            <div className="mt-3 grid gap-2">
              {packages.map((pkg, index) => (
                <div key={pkg.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-700">
                    Paquete {index + 1} · {pkg.content || "Sin contenido"}
                  </span>
                  <span className="text-slate-500">
                    {pkg.lengthCm}×{pkg.widthCm}×{pkg.heightCm} cm · {pkg.weightKg} kg × {pkg.quantity}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-200 pt-3">
              <span className="text-sm font-black text-slate-700">{packageTotals.count} bulto(s)</span>
              <span className="text-sm text-slate-500">{packageTotals.totalWeight.toFixed(2)} kg total</span>
              {declaredValue ? <span className="text-sm text-slate-500">Valor declarado: ${declaredValue}</span> : null}
            </div>
          </div>

          {selectedOperatorName ? (
            <div className="mt-4 rounded-[1.6rem] border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Transportadora seleccionada</p>
              <p className="mt-2 text-sm font-black text-slate-950">{selectedOperatorName}</p>
              {selectedQuoteResult?.ok ? (
                <p className="mt-1 text-sm text-slate-600">
                  Precio estimado: {formatCurrency(selectedQuoteResult.amount)} ·{" "}
                  {selectedQuoteResult.etaLabel || selectedQuoteResult.estimatedDays || "ETA por confirmar"}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">Marcada como preferencia para seguimiento interno</p>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Transportadora</p>
              <p className="mt-2 text-sm text-slate-600">
                No seleccionada — puedes volver al paso anterior para elegir una opción.
              </p>
            </div>
          )}

          {extraDestinations.length > 0 ? (
            <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Destinos adicionales</p>
              <div className="mt-2 grid gap-1">
                {extraDestinations.map((item, index) => (
                  <p key={item.id} className="text-sm text-slate-600">
                    {index + 1}. {item.label || item.name || "Destino sin nombre"} · {item.city || "Ciudad sin definir"}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {customerNotes ? (
            <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Notas de solicitud</p>
              <p className="mt-2 text-sm text-slate-600">{customerNotes}</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">¿Todo está correcto?</p>
              <p className="mt-1 text-sm text-slate-500">
                Esta acción guarda una solicitud referencial interna. No genera cobro ni crea ninguna orden real.
              </p>
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando solicitud...
                </>
              ) : selectedOperatorName ? (
                <>Solicitar opción {selectedOperatorName}</>
              ) : (
                <>Guardar solicitud</>
              )}
            </button>
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-5">
        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm shadow-slate-950/5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Estado de solicitud</p>
          <div className="mt-3 grid gap-3">
            <MiniStat label="Tipo" value="Solicitud referencial" />
            <MiniStat label="Cobro" value="Sin cobro" />
            <MiniStat label="Orden real" value="No se crea todavía" />
          </div>
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs leading-5 text-sky-700">
              Una vez guardada, la solicitud quedará visible en el panel de envíos Ecuador para revisión y seguimiento interno.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function AddressPanel({
  title,
  label,
  address,
  hasSavedAddresses,
  selectedAddressId,
  defaultEntry,
  role,
  accent,
  onAddressSelect,
  onAddressChange,
  onUseDefault,
  onSaveAddress,
}: {
  title: string;
  label: string;
  address: ShipmentAddress;
  hasSavedAddresses: boolean;
  selectedAddressId: string | null;
  defaultEntry: AddressBookEntry | null;
  role: "sender" | "recipient";
  accent: "sky" | "orange";
  onAddressSelect: (entry: AddressBookEntry) => void;
  onAddressChange: (key: keyof ShipmentAddress, value: string | number | undefined) => void;
  onUseDefault: () => void;
  onSaveAddress: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const toneClasses =
    accent === "sky" ? "border-sky-100 bg-sky-50/50" : "border-orange-100 bg-orange-50/60";
  const accentTextClass = accent === "sky" ? "text-sky-700" : "text-orange-700";

  useEffect(() => {
    if (!HAS_ECUADOR_GOOGLE_AUTOCOMPLETE) return;
    loadGoogleMapsScript(GOOGLE_MAPS_KEY, () => setMapsReady(true));
  }, []);

  useEffect(() => {
    if (!mapsReady || !searchRef.current) return;
    const googleWindow = window as Window & {
      google?: {
        maps: {
          places: {
            Autocomplete: new (
              el: HTMLInputElement,
              opts?: {
                types?: string[];
                fields?: string[];
                componentRestrictions?: { country: string | string[] };
              },
            ) => EcuadorGoogleAutocomplete;
          };
        };
      };
    };
    if (!googleWindow.google) return;

    const autocomplete = new googleWindow.google.maps.places.Autocomplete(searchRef.current, {
      types: ["geocode"],
      fields: ["address_components", "formatted_address", "geometry"],
      componentRestrictions: { country: "ec" },
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      const parsed = parseAddressComponents(
        place.address_components ?? [],
        lat != null && lng != null ? { lat, lng } : undefined,
        place.formatted_address,
        undefined,
        "google_places",
      );
      const street = parsed.street1?.trim() || place.formatted_address?.trim() || "";
      onAddressChange("address", street);
      if (street) onAddressChange("streetMain", street);
      if (parsed.city) onAddressChange("city", parsed.city.trim());
      if (parsed.state) onAddressChange("region", parsed.state.trim());
      if (parsed.postalCode) onAddressChange("postalCode", parsed.postalCode.trim());
      if (parsed.latitude != null) onAddressChange("latitude", parsed.latitude);
      if (parsed.longitude != null) onAddressChange("longitude", parsed.longitude);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  const canSave = Boolean(address.city.trim() && (address.streetMain.trim() || address.address.trim()));

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

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUseDefault}
          disabled={!defaultEntry}
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-bold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {role === "sender" ? "Usar remitente predeterminado" : "Usar destinatario predeterminado"}
        </button>
        <button
          type="button"
          onClick={onSaveAddress}
          disabled={!canSave}
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar en libreta
        </button>
        {!hasSavedAddresses ? (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
            Todavía no tienes direcciones guardadas
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={role === "sender" ? "Nombre / empresa" : "Nombre y apellido / empresa"}
            value={address.name}
            onChange={(value) => onAddressChange("name", value)}
            placeholder={role === "sender" ? "Tu empresa o nombre" : "Andrea Torres"}
          />
          <TextField
            label="Teléfono"
            value={address.phone}
            onChange={(value) => onAddressChange("phone", value)}
            placeholder="+593 99 123 4567"
          />
          <TextField
            label="Ciudad / cantón"
            value={address.city}
            onChange={(value) => onAddressChange("city", value)}
            placeholder="Quito"
          />
          <SelectField
            label="Provincia"
            value={address.region}
            onChange={(value) => onAddressChange("region", value)}
            options={ECUADOR_PROVINCES.map((province) => ({ value: province, label: province }))}
            placeholder="Selecciona una provincia"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CITY_OPTIONS.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => onAddressChange("city", city)}
              className={`rounded-full border px-3 py-1 text-xs font-black transition ${
                address.city === city
                  ? `border-transparent ${accentTextClass} bg-white shadow-sm`
                  : "border-slate-200 bg-white/60 text-slate-600 hover:border-sky-200 hover:text-sky-700"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Dirección</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <TextField
              label="Calle principal"
              value={address.streetMain}
              onChange={(value) => onAddressChange("streetMain", value)}
              placeholder="Av. 6 de Diciembre"
            />
            <TextField
              label="Numeración / intersección"
              value={address.streetCrossing}
              onChange={(value) => onAddressChange("streetCrossing", value)}
              placeholder="N24-253 y Colón"
            />
          </div>
          {HAS_ECUADOR_GOOGLE_AUTOCOMPLETE ? (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                <Search className="h-3.5 w-3.5" />
                Buscar dirección (autocomplete)
              </div>
              <input
                ref={searchRef}
                value={address.address}
                onChange={(event) => onAddressChange("address", event.target.value)}
                placeholder="Escribe para buscar o pega una dirección completa"
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          ) : (
            <p className="mt-3 text-xs leading-5 text-slate-400">
              La selección por mapa se habilitará cuando el servicio esté configurado.
            </p>
          )}
        </div>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Referencia</span>
          <textarea
            value={address.reference}
            onChange={(event) => onAddressChange("reference", event.target.value)}
            className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            placeholder="Edificio, barrio, puntos de referencia o indicaciones al repartidor"
          />
        </label>
      </div>
    </div>
  );
}

function QuoteLoadingCard({ origin, destination }: { origin: string; destination: string }) {
  return (
    <section className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-950">Consultando operadores disponibles</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Buscando mejores precios para {origin || "origen"} → {destination || "destino"}.
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

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
      >
        <option value="">{placeholder ?? "Selecciona una opción"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function buildFullAddress(address: ShipmentAddress): string {
  if (address.streetMain.trim()) {
    return [address.streetMain.trim(), address.streetCrossing.trim()].filter(Boolean).join(" y ");
  }
  return address.address.trim();
}

function mapAddressEntryToShipment(entry: AddressBookEntry): ShipmentAddress {
  return {
    name: entry.contactName,
    phone: entry.phone,
    streetMain: entry.addressLine1,
    streetCrossing: entry.addressLine2 ?? "",
    address: entry.addressLine1,
    city: entry.city,
    reference: entry.reference ?? "",
    region: entry.region,
    postalCode: entry.postalCode ?? "",
    latitude: entry.latitude,
    longitude: entry.longitude,
  };
}

function buildAddressBookDraftFromShipment(
  address: ShipmentAddress,
  role: "sender" | "recipient",
): AddressBookEntryDraft {
  const labelBase = address.name.trim() || address.city.trim() || (role === "sender" ? "Remitente" : "Destinatario");
  const line1 = buildFullAddress(address) || address.city.trim();
  return {
    label: labelBase,
    country: "EC",
    role,
    contactName: address.name.trim(),
    company: "",
    addressLine1: line1,
    addressLine2: address.reference.trim() || undefined,
    city: address.city.trim(),
    region: address.region.trim(),
    postalCode: address.postalCode.trim() || undefined,
    phone: address.phone.trim(),
    email: "",
    reference: address.reference.trim(),
    latitude: address.latitude,
    longitude: address.longitude,
    isDefaultSender: role === "sender",
    isDefaultRecipient: role === "recipient",
  };
}

function getInitialAddressSelections(entries: AddressBookEntry[]) {
  const defaultOrigin =
    entries.find((entry) => entry.isDefaultSender && (entry.role === "sender" || entry.role === "both")) ?? null;
  const defaultDestination =
    entries.find((entry) => entry.isDefaultRecipient && (entry.role === "recipient" || entry.role === "both")) ?? null;
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
  const originAddr = buildFullAddress(input.origin) || input.origin.city;
  const destinationAddr = buildFullAddress(input.destination) || input.destination.city;

  return {
    originName: input.origin.name || "Remitente Ecuador",
    originPhone: input.origin.phone || "+593000000000",
    originAddress: originAddr,
    originCity: input.origin.city,
    originReference: input.origin.reference,
    destinationName: input.destination.name || "Destinatario Ecuador",
    destinationPhone: input.destination.phone || "+593000000000",
    destinationAddress: destinationAddr,
    destinationCity: input.destination.city,
    destinationReference: input.destination.reference,
    originLatitude: input.origin.latitude,
    originLongitude: input.origin.longitude,
    destinationLatitude: input.destination.latitude,
    destinationLongitude: input.destination.longitude,
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
  selectedQuoteResult: EcuadorProviderQuoteResult | null;
  extraDestinations: MultiDestinationDraft[];
}): CreateEcuadorShipmentRequestBody {
  const aggregate = aggregatePackages(input.packages);
  const originAddr = buildFullAddress(input.origin) || input.origin.city;
  const destinationAddr = buildFullAddress(input.destination) || input.destination.city;
  const extraNotes = [
    input.customerNotes.trim(),
    input.selectedOperatorName ? `Operador solicitado: ${input.selectedOperatorName}.` : "",
    input.selectedQuoteResult?.ok ? `Precio estimado visible: ${input.selectedQuoteResult.amount} ${input.selectedQuoteResult.currency}.` : "",
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
    originAddress: originAddr,
    originCity: input.origin.city,
    originReference: joinReference(input.origin),
    destinationName: input.destination.name,
    destinationPhone: input.destination.phone,
    destinationAddress: destinationAddr,
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
    if (!input.origin.city) {
      return "Completa al menos la ciudad de origen antes de continuar.";
    }
    if (!input.destination.city) {
      return "Completa al menos la ciudad de destino antes de continuar.";
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
      return "Completa contenido, cantidad, peso y dimensiones de cada paquete antes de continuar.";
    }
  }

  if (step >= 4) {
    if (!input.origin.name || !input.origin.phone || !input.origin.city) {
      return "Antes de guardar la solicitud, completa nombre, teléfono y ciudad del origen.";
    }
    if (!input.destination.name || !input.destination.phone || !input.destination.city) {
      return "Antes de guardar la solicitud, completa nombre, teléfono y ciudad del destino.";
    }
  }

  return "";
}

function joinReference(address: ShipmentAddress) {
  return [
    address.reference,
    address.region ? `Provincia: ${address.region}` : "",
    address.postalCode ? `CP: ${address.postalCode}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function createLocalId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

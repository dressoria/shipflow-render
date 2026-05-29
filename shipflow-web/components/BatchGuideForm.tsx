"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, Plus, Trash2, Wallet, Zap } from "lucide-react";
import { AddressInput, type AddressInputErrors } from "@/components/AddressInput";
import { Badge } from "@/components/Badge";
import { useAuth } from "@/hooks/useAuth";
import {
  apiCreateLabel,
  apiCreateLabelCheckoutSession,
  apiGetConfigFeatures,
  apiGetConfigStatus,
  apiGetRates,
  type ConfigFeatures,
  type ConfigStatus,
  type CreateLabelResult,
} from "@/lib/services/apiClient";
import { getAvailableBalance } from "@/lib/services/balanceService";
import {
  INTERNATIONAL_SHIPPING_SOON_MESSAGE,
  UNSUPPORTED_COUNTRY_MESSAGE,
  validateDomesticShipmentCountries,
} from "@/lib/domesticMarkets";
import type { RateResult } from "@/lib/logistics/types";
import type { StructuredAddress } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const BATCH_DRAFT_KEY = "sendiflash-batch-guide-draft-v1";
const BATCH_LIMIT = 5;
const LABELS_NOT_IMPLEMENTED_PROVIDERS = new Set(["shippo", "easypost", "easyship"]);

const EMPTY_ADDRESS: StructuredAddress = {
  name: "",
  phone: "",
  phoneCountryCode: "+1",
  street1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  source: "manual",
  validationStatus: "incomplete",
};

const productTypes = [
  "Apparel and accessories",
  "Electronics",
  "Cosmetics",
  "Documents",
  "Home goods",
  "Other",
];

type PackageInfo = {
  weight: string;
  weightUnit: "lb" | "oz";
  length: string;
  width: string;
  height: string;
  dimensionUnit: "in" | "cm";
  productType: string;
  productDescription: string;
};

type BatchRow = {
  id: string;
  destination: StructuredAddress;
  packageInfo: PackageInfo;
  rates: RateResult[];
  selectedRateId: string;
  status: "idle" | "loading" | "ready" | "no_rates" | "error" | "purchased" | "checkout_opened";
  message: string | null;
  result?: CreateLabelResult | null;
};

type BatchDraft = {
  batchId: string;
  origin: StructuredAddress;
  sharedPackage: boolean;
  packageInfo: PackageInfo;
  rows: BatchRow[];
};

const defaultPackage: PackageInfo = {
  weight: "1",
  weightUnit: "lb",
  length: "1",
  width: "1",
  height: "1",
  dimensionUnit: "in",
  productType: "Apparel and accessories",
  productDescription: "",
};

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function newRow(): BatchRow {
  return {
    id: newId("row"),
    destination: { ...EMPTY_ADDRESS, country: "US" },
    packageInfo: { ...defaultPackage },
    rates: [],
    selectedRateId: "",
    status: "idle",
    message: null,
    result: null,
  };
}

function initialDraft(): BatchDraft {
  return {
    batchId: newId("batch"),
    origin: { ...EMPTY_ADDRESS, city: "New York", state: "NY", country: "US" },
    sharedPackage: true,
    packageInfo: { ...defaultPackage },
    rows: [
      {
        ...newRow(),
        destination: { ...EMPTY_ADDRESS, city: "Chicago", state: "IL", country: "US" },
      },
      newRow(),
    ],
  };
}

function restoreDraft(): BatchDraft {
  if (typeof window === "undefined") return initialDraft();
  try {
    const raw = window.localStorage.getItem(BATCH_DRAFT_KEY);
    if (!raw) return initialDraft();
    const parsed = JSON.parse(raw) as Partial<BatchDraft>;
    return {
      ...initialDraft(),
      ...parsed,
      batchId: parsed.batchId ?? newId("batch"),
      origin: { ...EMPTY_ADDRESS, ...(parsed.origin ?? {}) },
      packageInfo: { ...defaultPackage, ...(parsed.packageInfo ?? {}) },
      rows: (parsed.rows ?? [newRow()]).slice(0, BATCH_LIMIT).map((row) => ({
        ...newRow(),
        ...row,
        destination: { ...EMPTY_ADDRESS, ...(row.destination ?? {}) },
        packageInfo: { ...defaultPackage, ...(row.packageInfo ?? {}) },
        rates: [],
        selectedRateId: "",
        status: "idle",
        message: null,
        result: null,
      })),
    };
  } catch {
    return initialDraft();
  }
}

function productDescription(pkg: PackageInfo) {
  if (pkg.productType === "Other") return pkg.productDescription.trim();
  return pkg.productType;
}

function rowPackage(draft: BatchDraft, row: BatchRow) {
  return draft.sharedPackage ? draft.packageInfo : row.packageInfo;
}

function packageErrors(pkg: PackageInfo) {
  const errors: Record<string, string> = {};
  const weight = Number(pkg.weight);
  const length = Number(pkg.length);
  const width = Number(pkg.width);
  const height = Number(pkg.height);
  if (!Number.isFinite(weight) || weight <= 0) errors.weight = "Valid weight required.";
  if (!Number.isFinite(length) || length <= 0) errors.length = "Valid length required.";
  if (!Number.isFinite(width) || width <= 0) errors.width = "Valid width required.";
  if (!Number.isFinite(height) || height <= 0) errors.height = "Valid height required.";
  if (pkg.productType === "Other" && !pkg.productDescription.trim()) {
    errors.productDescription = "Describe the product.";
  }
  return errors;
}

function addressErrors(address: StructuredAddress, prefix: "origin" | "destination"): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!address.name?.trim()) errors[`${prefix}.name`] = "Required.";
  if (!address.phone?.trim()) errors[`${prefix}.phone`] = "Required.";
  if (!address.street1?.trim()) errors[`${prefix}.street1`] = "Street address required.";
  if (!address.city?.trim()) errors[`${prefix}.city`] = "Required.";
  if (!address.state?.trim()) errors[`${prefix}.state`] = "Required.";
  if (!address.postalCode?.trim()) errors[`${prefix}.postalCode`] = "Postal code required.";
  return errors;
}

function toAddressInputErrors(errors: Record<string, string>, prefix: "origin" | "destination"): AddressInputErrors {
  return {
    name: errors[`${prefix}.name`],
    phone: errors[`${prefix}.phone`],
    street1: errors[`${prefix}.street1`],
    city: errors[`${prefix}.city`],
    state: errors[`${prefix}.state`],
    postalCode: errors[`${prefix}.postalCode`],
    country: errors[`${prefix}.country`],
  };
}

function toDestinationInputErrors(errors: Record<string, string>, rowId: string): AddressInputErrors {
  return {
    name: errors[`${rowId}.destination.name`],
    phone: errors[`${rowId}.destination.phone`],
    street1: errors[`${rowId}.destination.street1`],
    city: errors[`${rowId}.destination.city`],
    state: errors[`${rowId}.destination.state`],
    postalCode: errors[`${rowId}.destination.postalCode`],
    country: errors[`${rowId}.destination.country`],
  };
}

function rateKey(rate: RateResult) {
  return `${rate.provider}:${rate.providerRateId ?? rate.serviceCode}:${rate.courierId}`;
}

function selectedRate(row: BatchRow) {
  return row.rates.find((rate) => rateKey(rate) === row.selectedRateId) ?? row.rates[0] ?? null;
}

function displayCarrier(rate: RateResult) {
  const raw = `${rate.courierId} ${rate.courierName}`.toLowerCase();
  if (raw.includes("usps") || raw.includes("stamps")) return "USPS";
  if (raw.includes("ups")) return "UPS";
  if (raw.includes("fedex")) return "FedEx";
  if (raw.includes("dhl")) return "DHL";
  return rate.courierName;
}

function statusLabel(row: BatchRow) {
  if (row.status === "loading") return "Loading";
  if (row.status === "ready") return "Ready";
  if (row.status === "no_rates") return "No rates";
  if (row.status === "error") return "Error";
  if (row.status === "purchased") return "Purchased";
  if (row.status === "checkout_opened") return "Checkout opened";
  return "Draft";
}

export function BatchGuideForm() {
  const { emailVerified, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState<BatchDraft>(restoreDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [configFeatures, setConfigFeatures] = useState<ConfigFeatures | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [ratingAll, setRatingAll] = useState(false);
  const [walletPurchasing, setWalletPurchasing] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const idempotencyRef = useRef<Record<string, string>>({});

  useEffect(() => {
    apiGetConfigStatus().then(setConfigStatus).catch(() => setConfigStatus(null));
  }, []);

  useEffect(() => {
    if (authLoading || !emailVerified) return;
    apiGetConfigFeatures().then(setConfigFeatures).catch(() => setConfigFeatures(null));
    getAvailableBalance().then(setWalletBalance).catch(() => setWalletBalance(null));
  }, [authLoading, emailVerified]);

  useEffect(() => {
    const persisted = {
      ...draft,
      rows: draft.rows.map((row) => ({ ...row, rates: [], selectedRateId: "", result: null })),
    };
    window.localStorage.setItem(BATCH_DRAFT_KEY, JSON.stringify(persisted));
  }, [draft]);

  const selectedRows = draft.rows.map((row) => ({ row, rate: selectedRate(row), pkg: rowPackage(draft, row) }));
  const total = useMemo(
    () => selectedRows.reduce((sum, item) => sum + (item.rate?.customerPrice ?? 0), 0),
    [selectedRows],
  );
  const canPay = selectedRows.length > 0 && selectedRows.every((item) => item.rate && item.row.status === "ready");
  const walletShortfall = walletBalance == null ? 0 : Math.max(0, total - walletBalance);
  const directCardAvailable =
    configStatus?.directLabelPaymentEnabled === true &&
    configFeatures?.directLabelPaymentAvailable === true;

  function updateDraft(updater: (current: BatchDraft) => BatchDraft) {
    setDraft((current) => updater(current));
    setBatchMessage(null);
  }

  function setOrigin(origin: StructuredAddress) {
    updateDraft((current) => ({
      ...current,
      origin,
      rows: current.rows.map((row) => ({ ...row, rates: [], selectedRateId: "", status: "idle", message: null })),
    }));
  }

  function updatePackage(value: Partial<PackageInfo>, rowId?: string) {
    updateDraft((current) => {
      if (current.sharedPackage || !rowId) {
        return {
          ...current,
          packageInfo: { ...current.packageInfo, ...value },
          rows: current.rows.map((row) => ({ ...row, rates: [], selectedRateId: "", status: "idle", message: null })),
        };
      }
      return {
        ...current,
        rows: current.rows.map((row) =>
          row.id === rowId
            ? { ...row, packageInfo: { ...row.packageInfo, ...value }, rates: [], selectedRateId: "", status: "idle", message: null }
            : row,
        ),
      };
    });
  }

  function updateRow(rowId: string, patch: Partial<BatchRow>) {
    updateDraft((current) => ({
      ...current,
      rows: current.rows.map((row) => row.id === rowId ? { ...row, ...patch } : row),
    }));
  }

  function addRow() {
    if (draft.rows.length >= BATCH_LIMIT) {
      setBatchMessage(`Batch limit is ${BATCH_LIMIT} shipments.`);
      return;
    }
    updateDraft((current) => ({ ...current, rows: [...current.rows, newRow()] }));
  }

  function removeRow(rowId: string) {
    updateDraft((current) => ({
      ...current,
      rows: current.rows.length <= 1 ? current.rows : current.rows.filter((row) => row.id !== rowId),
    }));
  }

  function clearDraft() {
    const next = initialDraft();
    window.localStorage.removeItem(BATCH_DRAFT_KEY);
    idempotencyRef.current = {};
    setDraft(next);
    setErrors({});
    setBatchMessage(null);
  }

  function validateRow(row: BatchRow) {
    const pkg = rowPackage(draft, row);
    const next = {
      ...addressErrors(draft.origin, "origin"),
      ...addressErrors(row.destination, "destination"),
      ...packageErrors(pkg),
    };
    try {
      validateDomesticShipmentCountries(draft.origin, row.destination);
    } catch (error) {
      next["destination.country"] = error instanceof Error ? error.message : INTERNATIONAL_SHIPPING_SOON_MESSAGE;
    }
    return next;
  }

  async function rateRow(row: BatchRow) {
    const rowErrors = validateRow(row);
    if (Object.keys(rowErrors).length > 0) {
      const scopedErrors = Object.fromEntries(
        Object.entries(rowErrors).map(([key, value]) => [
          key.startsWith("destination.") ? `${row.id}.${key}` : key,
          value,
        ]),
      );
      setErrors((current) => ({ ...current, [row.id]: "Review this shipment.", ...scopedErrors }));
      updateRow(row.id, { status: "error", message: rowErrors["destination.country"] ?? "Review required fields." });
      return;
    }

    updateRow(row.id, { status: "loading", message: null, rates: [], selectedRateId: "" });
    try {
      const pkg = rowPackage(draft, row);
      const { countryCode } = validateDomesticShipmentCountries(draft.origin, row.destination);
      const result = await apiGetRates({
        mode: "best_available",
        origin: {
          line1: draft.origin.street1,
          line2: draft.origin.street2 || undefined,
          city: draft.origin.city,
          state: draft.origin.state,
          postalCode: draft.origin.postalCode,
          country: countryCode,
        },
        destination: {
          line1: row.destination.street1,
          line2: row.destination.street2 || undefined,
          city: row.destination.city,
          state: row.destination.state,
          postalCode: row.destination.postalCode,
          country: countryCode,
        },
        parcel: {
          weight: Number(pkg.weight),
          weightUnit: pkg.weightUnit,
          length: Number(pkg.length),
          width: Number(pkg.width),
          height: Number(pkg.height),
          dimensionUnit: pkg.dimensionUnit,
        },
      });

      if (!result.rates.length) {
        updateRow(row.id, { status: "no_rates", message: "No rates were returned for this route. This market may require carrier setup." });
        return;
      }

      updateRow(row.id, {
        status: "ready",
        rates: result.rates,
        selectedRateId: rateKey(result.rates[0]),
        message: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not get rates.";
      updateRow(row.id, {
        status: "error",
        message: message === UNSUPPORTED_COUNTRY_MESSAGE || message === INTERNATIONAL_SHIPPING_SOON_MESSAGE
          ? message
          : "No rates were returned for this route. This market may require carrier setup.",
      });
    }
  }

  async function rateAll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ratingAll) return;
    setErrors({});
    setBatchMessage("Getting rates for each shipment. This beta flow processes up to five rows.");
    setRatingAll(true);
    for (const row of draft.rows) {
      await rateRow(row);
    }
    setRatingAll(false);
    setBatchMessage(null);
  }

  function labelBody(row: BatchRow, rate: RateResult) {
    const pkg = rowPackage(draft, row);
    const { countryCode } = validateDomesticShipmentCountries(draft.origin, row.destination);
    const batchIndex = draft.rows.findIndex((candidate) => candidate.id === row.id) + 1;
    const breakdown = {
      providerCost: rate.pricing.providerCost,
      platformMarkup: rate.pricing.platformMarkup,
      subtotal: rate.pricing.subtotal,
      paymentFee: rate.pricing.paymentFee,
      customerPrice: rate.pricing.customerPrice,
      markupPercentage: rate.pricing.markupPercentage,
      markupMinimum: rate.pricing.markupMinimum,
      paymentFeePercentage: rate.pricing.paymentFeePercentage,
      paymentFeeFixed: rate.pricing.paymentFeeFixed,
      paymentMethod: "wallet",
      batchId: draft.batchId,
      batchIndex,
      batchSize: draft.rows.length,
      productDescription: productDescription(pkg),
    };

    return {
      provider: rate.provider,
      providerRateId: rate.providerRateId,
      origin: {
        line1: draft.origin.street1,
        line2: draft.origin.street2 || undefined,
        city: draft.origin.city,
        state: draft.origin.state,
        postalCode: draft.origin.postalCode,
        country: countryCode,
      },
      destination: {
        line1: row.destination.street1,
        line2: row.destination.street2 || undefined,
        city: row.destination.city,
        state: row.destination.state,
        postalCode: row.destination.postalCode,
        country: countryCode,
      },
      parcel: {
        weight: Number(pkg.weight),
        weightUnit: pkg.weightUnit,
        length: Number(pkg.length),
        width: Number(pkg.width),
        height: Number(pkg.height),
        dimensionUnit: pkg.dimensionUnit,
      },
      carrierCode: rate.courierId,
      serviceCode: rate.serviceCode,
      expectedCost: rate.customerPrice,
      platformMarkup: rate.pricing.platformMarkup,
      paymentFee: rate.pricing.paymentFee,
      pricingSubtotal: rate.pricing.subtotal,
      pricingModel: "shipflow_v1",
      pricingBreakdown: breakdown,
      idempotencyKey: idempotencyRef.current[row.id] ?? (idempotencyRef.current[row.id] = `batch-${draft.batchId}-${row.id}`),
      senderName: draft.origin.name?.trim() || undefined,
      senderPhone: draft.origin.phone?.trim() || undefined,
      recipientName: row.destination.name?.trim() || undefined,
      recipientPhone: row.destination.phone?.trim() || undefined,
      productType: productDescription(pkg) || undefined,
    };
  }

  async function payWithWallet() {
    if (!canPay || walletPurchasing || walletBalance == null || walletBalance < total) return;
    setWalletPurchasing(true);
    setBatchMessage("Purchasing labels one at a time. Successful rows are saved immediately; failed rows stay available for review.");

    for (const { row, rate } of selectedRows) {
      if (!rate) continue;
      if (LABELS_NOT_IMPLEMENTED_PROVIDERS.has(rate.provider) || rate.supportsLabels === false) {
        updateRow(row.id, { status: "error", message: "This selected rate cannot generate labels yet." });
        continue;
      }
      updateRow(row.id, { status: "loading", message: "Purchasing label..." });
      try {
        const result = await apiCreateLabel(labelBody(row, rate));
        updateRow(row.id, { status: "purchased", result, message: "Label ready." });
      } catch {
        updateRow(row.id, {
          status: "error",
          message: "This label could not be purchased. Successful rows remain saved; contact support before retrying.",
        });
        break;
      }
    }

    getAvailableBalance().then(setWalletBalance).catch(() => {});
    setWalletPurchasing(false);
    setBatchMessage("Batch wallet purchase finished. Review each row for its final status.");
  }

  async function payByCard() {
    if (!canPay || cardLoading || !directCardAvailable) return;
    setCardLoading(true);
    setBatchMessage("Opening one secure checkout tab per shipment. Keep this page open to track results.");

    for (const { row, rate, pkg } of selectedRows) {
      if (!rate) continue;
      try {
        const { countryCode } = validateDomesticShipmentCountries(draft.origin, row.destination);
        const batchIndex = draft.rows.findIndex((candidate) => candidate.id === row.id) + 1;
        const result = await apiCreateLabelCheckoutSession({
          provider: rate.provider,
          serviceCode: rate.serviceCode,
          serviceName: rate.serviceName,
          rateSnapshot: {
            provider: rate.provider,
            serviceCode: rate.serviceCode,
            carrierCode: rate.courierId,
            providerRateId: rate.providerRateId,
            providerCost: rate.pricing.providerCost,
            customerPrice: rate.customerPrice,
            currency: rate.currency,
            pricingBreakdown: {
              ...rate.pricing,
              batchId: draft.batchId,
              batchIndex,
              batchSize: draft.rows.length,
              productDescription: productDescription(pkg),
            },
          },
          origin: { ...draft.origin, country: countryCode },
          destination: { ...row.destination, country: countryCode },
          parcel: {
            weight: Number(pkg.weight),
            weightUnit: pkg.weightUnit,
            length: Number(pkg.length),
            width: Number(pkg.width),
            height: Number(pkg.height),
            dimensionUnit: pkg.dimensionUnit,
          },
          idempotencyKey: `batch-card-${draft.batchId}-${row.id}`,
        });
        const opened = window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
        updateRow(row.id, {
          status: "checkout_opened",
          message: opened ? "Checkout opened in a new tab." : "Popup blocked. Open this checkout from the browser history or retry this row.",
        });
        if (!opened) window.location.href = result.checkoutUrl;
      } catch {
        updateRow(row.id, { status: "error", message: "Could not start checkout for this shipment." });
      }
    }

    setCardLoading(false);
  }

  if (!authLoading && !emailVerified) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Verify your email before creating batch labels.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge tone="amber">Beta batch</Badge>
            <h2 className="mt-3 text-2xl font-black text-slate-950">Create multiple labels</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Use one origin and prepare up to {BATCH_LIMIT} domestic shipments. CSV import, customs, and larger bulk operations are deferred.
            </p>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            className="h-10 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Clear batch draft
          </button>
        </div>
      </div>

      {batchMessage ? (
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
          {batchMessage}
        </div>
      ) : null}

      <form onSubmit={rateAll} className="grid gap-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#2563EB]">Shared origin</h3>
          <div className="mt-4">
            <AddressInput
              sectionLabel="Origin"
              value={draft.origin}
              onChange={setOrigin}
              requirePostal
              errors={toAddressInputErrors(errors, "origin")}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#F97316]">Package settings</h3>
              <p className="mt-1 text-sm text-slate-500">Use one package for all rows, or customize each shipment.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={draft.sharedPackage}
                onChange={(event) => updateDraft((current) => ({ ...current, sharedPackage: event.target.checked }))}
              />
              Use same package for all
            </label>
          </div>
          {draft.sharedPackage ? (
            <PackageFields pkg={draft.packageInfo} onChange={(patch) => updatePackage(patch)} errors={packageErrors(draft.packageInfo)} />
          ) : null}
        </section>

        <section className="grid gap-4">
          {draft.rows.map((row, index) => {
            const pkg = rowPackage(draft, row);
            const rate = selectedRate(row);
            return (
              <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">{index + 1}</span>
                    <div>
                      <h3 className="font-black text-slate-950">Shipment {index + 1}</h3>
                      <p className="text-sm text-slate-500">Status: {statusLabel(row)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => rateRow(row)}
                      disabled={row.status === "loading" || ratingAll}
                      className="h-10 rounded-2xl bg-[#2563EB] px-4 text-sm font-bold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
                    >
                      {row.status === "loading" ? "Getting rates..." : "Get rates"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={draft.rows.length <= 1}
                      className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                      aria-label={`Remove shipment ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <AddressInput
                    sectionLabel={`Destination ${index + 1}`}
                    value={row.destination}
                    onChange={(destination) => updateRow(row.id, { destination, rates: [], selectedRateId: "", status: "idle", message: null })}
                    requirePostal
                    errors={toDestinationInputErrors(errors, row.id)}
                  />
                </div>

                {!draft.sharedPackage ? (
                  <PackageFields pkg={row.packageInfo} onChange={(patch) => updatePackage(patch, row.id)} errors={packageErrors(row.packageInfo)} />
                ) : null}

                {row.message ? (
                  <div className={`mt-4 flex items-start gap-2 rounded-2xl p-3 text-sm font-semibold ${
                    row.status === "purchased" || row.status === "checkout_opened"
                      ? "bg-green-50 text-green-800"
                      : "bg-amber-50 text-amber-800"
                  }`}>
                    {row.status === "purchased" || row.status === "checkout_opened" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
                    <span>{row.message}</span>
                  </div>
                ) : null}

                {row.rates.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <label className="grid gap-2 text-sm font-bold text-slate-700">
                      Selected rate
                      <select
                        value={row.selectedRateId}
                        onChange={(event) => updateRow(row.id, { selectedRateId: event.target.value })}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none"
                      >
                        {row.rates.map((candidate) => (
                          <option key={rateKey(candidate)} value={rateKey(candidate)}>
                            {displayCarrier(candidate)} - {candidate.serviceName} - {formatCurrency(candidate.customerPrice)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {rate ? (
                      <p className="mt-2 text-sm text-slate-600">
                        {pkg.weight} {pkg.weightUnit} · {pkg.length}x{pkg.width}x{pkg.height} {pkg.dimensionUnit} · {productDescription(pkg)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {row.result?.shipment?.trackingNumber ? (
                  <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                    <Link className="text-[#2563EB]" href={`/guia/${row.result.shipment.trackingNumber}`}>View label</Link>
                    <Link className="text-[#2563EB]" href="/envios">My Shipments</Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <button
            type="button"
            onClick={addRow}
            disabled={draft.rows.length >= BATCH_LIMIT}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add shipment
          </button>
          <button
            type="submit"
            disabled={ratingAll}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#F97316] px-5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#EA580C] disabled:opacity-60"
          >
            <Zap className="h-4 w-4" />
            {ratingAll ? "Getting rates..." : "Get batch rates"}
          </button>
        </div>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-950">Batch checkout</h3>
            <p className="mt-1 text-sm text-slate-500">
              Total for selected rates: <strong className="text-slate-950">{formatCurrency(total)}</strong>
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Batch ID: {draft.batchId}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={payWithWallet}
              disabled={!canPay || walletPurchasing || walletBalance == null || walletBalance < total}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-black text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Wallet className="h-4 w-4" />
              {walletPurchasing ? "Purchasing..." : walletBalance != null && walletBalance < total ? `Short ${formatCurrency(walletShortfall)}` : "Pay with wallet"}
            </button>
            <button
              type="button"
              onClick={payByCard}
              disabled={!canPay || cardLoading || !directCardAvailable}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#F97316] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              {cardLoading ? "Opening..." : "Pay by card"}
            </button>
          </div>
        </div>
        {!canPay ? (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Select a valid rate for every shipment before checkout.
          </p>
        ) : null}
        {!directCardAvailable ? (
          <p className="mt-3 text-xs font-semibold text-slate-500">Card checkout is visible but not available for this account right now.</p>
        ) : null}
      </section>
    </div>
  );
}

function PackageFields({
  pkg,
  onChange,
  errors,
}: {
  pkg: PackageInfo;
  onChange: (patch: Partial<PackageInfo>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="mt-4 grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1fr_120px_1.4fr]">
        <NumberField label="Weight" value={pkg.weight} onChange={(value) => onChange({ weight: value })} error={errors.weight} />
        <SelectField label="Unit" value={pkg.weightUnit} options={["lb", "oz"]} onChange={(value) => onChange({ weightUnit: value as PackageInfo["weightUnit"] })} />
        <SelectField label="Product" value={pkg.productType} options={productTypes} onChange={(value) => onChange({ productType: value })} />
      </div>
      {pkg.productType === "Other" ? (
        <InputField
          label="Describe product"
          value={pkg.productDescription}
          onChange={(value) => onChange({ productDescription: value })}
          error={errors.productDescription}
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_120px]">
        <NumberField label="Length" value={pkg.length} onChange={(value) => onChange({ length: value })} error={errors.length} />
        <NumberField label="Width" value={pkg.width} onChange={(value) => onChange({ width: value })} error={errors.width} />
        <NumberField label="Height" value={pkg.height} onChange={(value) => onChange({ height: value })} error={errors.height} />
        <SelectField label="Unit" value={pkg.dimensionUnit} options={["in", "cm"]} onChange={(value) => onChange({ dimensionUnit: value as PackageInfo["dimensionUnit"] })} />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
      />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function InputField({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
      />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

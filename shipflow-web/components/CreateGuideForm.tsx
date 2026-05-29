"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  Info,
  MailCheck,
  Package,
  MapPin,
  User,
  Printer,
  Save,
  Sparkles,
  Wallet,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/Badge";
import { AddressInput } from "@/components/AddressInput";
import type { AddressInputErrors } from "@/components/AddressInput";
import { isPhone } from "@/lib/forms";
import {
  apiCreateLabel,
  apiCreateLabelCheckoutSession,
  apiGetConfigFeatures,
  apiGetConfigStatus,
  apiGetRates,
  apiGetUserLabelOrder,
  type ConfigFeatures,
  type ConfigStatus,
  type CreateLabelResult,
  type UserLabelOrderStatus,
} from "@/lib/services/apiClient";
import { getAvailableBalance } from "@/lib/services/balanceService";
import {
  getDomesticCountryName,
  INTERNATIONAL_SHIPPING_SOON_MESSAGE,
  normalizeCountryCode,
  UNSUPPORTED_COUNTRY_MESSAGE,
  validateDomesticShipmentCountries,
} from "@/lib/domesticMarkets";
import { getUserFacingLabelOrderMessage, isErrorLabelOrderStatus } from "@/lib/label-order-status";
import type { Envio, StructuredAddress } from "@/lib/types";
import type { RateResult } from "@/lib/logistics/types";
import { formatCurrency } from "@/lib/utils";

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

type FormState = {
  origin: StructuredAddress;
  destination: StructuredAddress;
  weight: string;
  productType: string;
  productDescription: string;
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
  productDescription: "",
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

const LABELS_NOT_IMPLEMENTED_PROVIDERS = new Set(["shippo", "easypost", "easyship"]);
const SHIPMENT_DRAFT_KEY = "sendiflash-create-guide-draft-v1";

function restoreDraftForm(): FormState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(SHIPMENT_DRAFT_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<FormState>;
    return {
      ...initialState,
      ...parsed,
      origin: { ...initialState.origin, ...(parsed.origin ?? {}) },
      destination: { ...initialState.destination, ...(parsed.destination ?? {}) },
      weightUnit: parsed.weightUnit === "oz" ? "oz" : "lb",
      dimensionUnit: parsed.dimensionUnit === "cm" ? "cm" : "in",
    };
  } catch {
    return initialState;
  }
}

function shipmentSummary(form: FormState) {
  const origin = [form.origin.city, form.origin.state].filter(Boolean).join(", ") || "Origin";
  const destination = [form.destination.city, form.destination.state].filter(Boolean).join(", ") || "Destination";
  const dimensions = `${form.length || "?"}x${form.width || "?"}x${form.height || "?"} ${form.dimensionUnit}`;
  const product = form.productType === "Other" && form.productDescription.trim()
    ? form.productDescription.trim()
    : form.productType || "Package";
  return `From: ${origin} -> To: ${destination} · ${form.weight || "?"} ${form.weightUnit} · ${dimensions} · ${product}`;
}

function addressCompactLabel(addr: StructuredAddress, fallback: string) {
  return [addr.city, addr.state, normalizeCountryCode(addr.country)].filter(Boolean).join(", ") || fallback;
}

function addressPersonLabel(addr: StructuredAddress, fallback: string) {
  return addr.name?.trim() || addr.company?.trim() || fallback;
}

function packageCompactLabel(form: FormState) {
  return `${form.weight || "?"} ${form.weightUnit} · ${form.length || "?"}x${form.width || "?"}x${form.height || "?"} ${form.dimensionUnit}`;
}

function fullPhone(addr: StructuredAddress) {
  const phone = addr.phone?.trim() ?? "";
  if (!phone) return "";
  if (phone.startsWith("+")) return phone;
  return `${addr.phoneCountryCode ?? "+1"} ${phone}`.trim();
}

function resolvedProductType(form: FormState) {
  if (form.productType === "Other") return form.productDescription.trim();
  return form.productType;
}

function LabelPaymentSuccessBanner({
  order,
  labelPurchaseEnabled,
}: {
  order: UserLabelOrderStatus | null;
  labelPurchaseEnabled: boolean;
}) {
  const status = order?.status ?? null;
  const isError = status !== null && isErrorLabelOrderStatus(status);
  const isTerminalGood = status === "label_purchased";
  const isExpiredOrCanceled = status === "expired" || status === "canceled";

  let title: string;
  let body: React.ReactNode;
  let Icon: typeof CheckCircle2;
  let colorClass: string;

  if (isExpiredOrCanceled) {
    title = status === "expired" ? "Payment attempt expired." : "Order canceled.";
    body = getUserFacingLabelOrderMessage(status);
    Icon = XCircle;
    colorClass = "border-slate-200 bg-slate-50 text-slate-700";
  } else if (isError) {
    Icon = AlertTriangle;
    colorClass = "border-amber-200 bg-amber-50 text-amber-800";
    if (status === "action_required") {
      title = "Payment confirmed. Review needed.";
      body = (
        <>
          {getUserFacingLabelOrderMessage(status)}{" "}
          <Link href="/support" className="underline font-medium">
            See what happens next
          </Link>
          .
        </>
      );
    } else if (status === "refund_needed") {
      title = "Label could not be generated.";
      body = getUserFacingLabelOrderMessage(status);
    } else if (status === "refund_pending") {
      title = "Refund in progress.";
      body = getUserFacingLabelOrderMessage(status);
    } else {
      title = "Refund completed.";
      body = getUserFacingLabelOrderMessage(status);
    }
  } else if (isTerminalGood) {
    title = "Your label is ready.";
    Icon = CheckCircle2;
    colorClass = "border-green-200 bg-green-50 text-green-800";
    body = (
      <>
        {order?.trackingNumber && (
          <>
            Tracking: <strong>{order.trackingNumber}</strong>.{" "}
          </>
        )}
        {order?.provider && order?.serviceName && (
          <>
            {order.serviceName} via {order.provider}.{" "}
          </>
        )}
        <Link href="/envios" className="underline font-medium">
          View in My Shipments
        </Link>
        {order?.labelUrl && (
          <>
            {" "}
            ·{" "}
            <a
              href={order.labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              View label PDF
            </a>
          </>
        )}
        .
      </>
    );
  } else if (status === "paid_test_mode") {
    title = "Payment confirmed (test mode).";
    body = getUserFacingLabelOrderMessage(status);
    Icon = CheckCircle2;
    colorClass = "border-purple-200 bg-purple-50 text-purple-800";
  } else if (status !== null) {
    title =
      status === "paid_waiting_label_purchase" || status === "label_purchase_pending"
        ? "We're preparing your label."
        : "Payment received.";
    body = getUserFacingLabelOrderMessage(status);
    Icon = CheckCircle2;
    colorClass = "border-green-200 bg-green-50 text-green-800";
  } else {
    title = "Payment received.";
    body = labelPurchaseEnabled
      ? "Your carrier label will be issued shortly."
      : "Label purchase is in test mode — no carrier label will be issued yet.";
    Icon = CheckCircle2;
    colorClass = "border-green-200 bg-green-50 text-green-800";
  }

  return (
    <div className={`flex items-start gap-3 rounded-3xl border p-4 text-sm ${colorClass}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1">{body}</p>
      </div>
    </div>
  );
}

export function CreateGuideForm() {
  const router = useRouter();
  const { emailVerified, loading: authLoading } = useAuth();

  const [form, setForm] = useState<FormState>(restoreDraftForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  // Server config status — fetched once on mount
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [configFeatures, setConfigFeatures] = useState<ConfigFeatures | null>(null);

  const [apiRates, setApiRates] = useState<RateResult[]>([]);
  const [selectedApiRate, setSelectedApiRate] = useState<RateResult | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Common result state
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Envio | null>(null);
  const [labelData, setLabelData] = useState<string | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Pay-by-card state
  const [payByCardLoading, setPayByCardLoading] = useState(false);
  // Wallet balance (fetched when authenticated; refreshed when confirm modal opens)
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  // Lazy initializers read query params once at mount without triggering an extra render.
  const [labelPaymentStatus] = useState<"success" | "cancelled" | null>(() => {
    if (typeof window === "undefined") return null;
    const status = new URLSearchParams(window.location.search).get("labelPayment");
    return status === "success" || status === "cancelled" ? status : null;
  });
  const [labelOrderId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("order_id");
  });
  const [labelOrderStatus, setLabelOrderStatus] = useState<UserLabelOrderStatus | null>(null);

  // Stable idempotency key per purchase intent
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    window.localStorage.setItem(SHIPMENT_DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    apiGetConfigStatus().then(setConfigStatus);
  }, []);

  useEffect(() => {
    if (authLoading || !emailVerified) return;
    apiGetConfigFeatures()
      .then(setConfigFeatures)
      .catch(() => setConfigFeatures(null));
  }, [authLoading, emailVerified]);

  useEffect(() => {
    if (labelPaymentStatus !== "success" || !labelOrderId || authLoading || !emailVerified) return;
    let cancelled = false;
    let intervalId: number | null = null;

    const fetchOrder = () => {
      apiGetUserLabelOrder(labelOrderId)
        .then((order) => {
          if (cancelled) return;
          setLabelOrderStatus(order);
          if (
            order.status === "label_purchased" ||
            isErrorLabelOrderStatus(order.status) ||
            order.status === "paid_test_mode"
          ) {
            if (intervalId !== null) window.clearInterval(intervalId);
          }
        })
        .catch(() => {
          if (!cancelled) setLabelOrderStatus(null);
        });
    };

    fetchOrder();
    intervalId = window.setInterval(fetchOrder, 4000);

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [labelPaymentStatus, labelOrderId, authLoading, emailVerified]);

  // Fetch wallet balance once user is authenticated
  useEffect(() => {
    if (authLoading || !emailVerified) return;
    getAvailableBalance()
      .then(setWalletBalance)
      .catch(() => setWalletBalance(null));
  }, [authLoading, emailVerified]);

  // Refresh balance every time the confirm modal opens so it is current
  useEffect(() => {
    if (!showConfirm || authLoading || !emailVerified) return;
    getAvailableBalance()
      .then(setWalletBalance)
      .catch(() => {});
  }, [showConfirm, authLoading, emailVerified]);

  function updateOrigin(addr: StructuredAddress) {
    setForm((current) => ({ ...current, origin: addr }));
    resetRateSearchState();
    setDetailsExpanded(true);
  }

  function updateDestination(addr: StructuredAddress) {
    setForm((current) => ({ ...current, destination: addr }));
    resetRateSearchState();
    setDetailsExpanded(true);
  }

  function updateField(name: keyof Omit<FormState, "origin" | "destination">, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (["weight", "weightUnit", "length", "width", "height", "dimensionUnit", "productType", "productDescription"].includes(name)) {
      resetRateSearchState();
      setDetailsExpanded(true);
    }
  }

  function resetRateSearchState() {
    setApiRates([]);
    setSelectedApiRate(null);
    setRatesError(null);
    setErrors({});
    setShowConfirm(false);
    setCheckoutNotice(null);
  }

  function clearDraft() {
    window.localStorage.removeItem(SHIPMENT_DRAFT_KEY);
    setForm(initialState);
    setApiRates([]);
    setSelectedApiRate(null);
    setRatesError(null);
    setDetailsExpanded(true);
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  type ErrorMap = Record<string, string>;

  function validateAddress(addr: StructuredAddress, prefix: string): ErrorMap {
    const next: ErrorMap = {};
    if (!addr.name?.trim()) next[`${prefix}.name`] = "Required field.";
    if (!addr.phone?.trim()) next[`${prefix}.phone`] = "Required field.";
    else if (!isPhone(fullPhone(addr))) next[`${prefix}.phone`] = "Invalid phone number.";
    if (!addr.street1?.trim()) next[`${prefix}.street1`] = "Street address is required.";
    if (!addr.city?.trim()) next[`${prefix}.city`] = "Required field.";
    if (!addr.state?.trim()) next[`${prefix}.state`] = "State / province / region is required.";
    if (!addr.postalCode?.trim()) next[`${prefix}.postalCode`] = "Postal code is required.";
    try {
      validateDomesticShipmentCountries(addr, addr);
    } catch {
      next[`${prefix}.country`] = UNSUPPORTED_COUNTRY_MESSAGE;
    }
    return next;
  }

  function validateQuote(): ErrorMap {
    const next: ErrorMap = {
      ...validateAddress(form.origin, "origin"),
      ...validateAddress(form.destination, "destination"),
      ...(!form.productType ? { productType: "Required field." } : {}),
      ...(form.productType === "Other" && !form.productDescription.trim()
        ? { productDescription: "Describe the product." }
        : {}),
    };
    try {
      validateDomesticShipmentCountries(form.origin, form.destination);
    } catch (error) {
      const message = error instanceof Error ? error.message : INTERNATIONAL_SHIPPING_SOON_MESSAGE;
      next.form = message;
      next["destination.country"] = message;
    }
    const weight = Number(form.weight);
    const length = Number(form.length);
    const width = Number(form.width);
    const height = Number(form.height);

    if (!Number.isFinite(weight) || weight <= 0) next.weight = "Enter a valid weight.";
    if (!Number.isFinite(length) || length <= 0) next.length = "Enter a valid length.";
    if (!Number.isFinite(width) || width <= 0) next.width = "Enter a valid width.";
    if (!Number.isFinite(height) || height <= 0) next.height = "Enter a valid height.";

    return next;
  }

  function validateOnlineLabel(): ErrorMap {
    return {
      ...validateQuote(),
      ...(!selectedApiRate ? { form: "Select a rate before continuing." } : {}),
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
      country: errors["origin.country"],
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
      country: errors["destination.country"],
    };
  }

  function quoteValidationMessage(errs: ErrorMap) {
    const addressFields = Object.keys(errs).filter((key) => key.startsWith("origin.") || key.startsWith("destination."));
    const packageFields = ["weight", "length", "width", "height", "productDescription"].filter((key) => errs[key]);

    if (addressFields.length > 0) {
      if (errs.form === INTERNATIONAL_SHIPPING_SOON_MESSAGE || errs.form === UNSUPPORTED_COUNTRY_MESSAGE) {
        return errs.form;
      }
      return "Complete street address, city, state/province, and postal code for both From and To before getting rates.";
    }
    if (packageFields.length > 0) {
      return errs.productDescription ?? "Complete package weight, length, width, and height.";
    }
    return null;
  }

  function noRatesMessage(result?: { diagnostic?: string; configuredCount?: number }) {
    if (configStatus?.activeRateProviders === 0 || result?.configuredCount === 0) {
      return "No real rate integrations are configured yet.";
    }
    if (result?.diagnostic === "address_incomplete") {
      return "Review street address, city, state/province, and postal code.";
    }
    if (result?.diagnostic === "providers_failed") {
      return "No rates were returned for this route. This market may require carrier setup.";
    }
    return "No rates were returned for this route. This market may require carrier setup.";
  }

  // ── Fetch real rates ────────────────────────────────────────────────────────

  async function handleFetchRates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fetchingRates) return;

    if (configStatus && !configStatus.supabaseConfigured) {
      setRatesError(
        "The server is not ready to get rates. Check the environment configuration.",
      );
      return;
    }

    if (configStatus && !configStatus.ratesConfigured) {
      setRatesError("Configure at least one real rate integration.");
      return;
    }

    const errs = validateQuote();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setRatesError(quoteValidationMessage(errs));
      setDetailsExpanded(true);
      return;
    }

    setDetailsExpanded(false);
    setFetchingRates(true);
    setRatesError(null);
    setCheckoutNotice(null);
    setApiRates([]);
    setSelectedApiRate(null);
    setErrors({});

    try {
      const { countryCode } = validateDomesticShipmentCountries(form.origin, form.destination);
      const result = await apiGetRates({
        mode: "best_available",
        origin: {
          line1: form.origin.street1,
          line2: form.origin.street2 || undefined,
          city: form.origin.city,
          postalCode: form.origin.postalCode,
          state: form.origin.state,
          country: countryCode,
        },
        destination: {
          line1: form.destination.street1,
          line2: form.destination.street2 || undefined,
          city: form.destination.city,
          postalCode: form.destination.postalCode,
          state: form.destination.state,
          country: countryCode,
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
      const visibleRates = result.rates.filter(isCustomerVisibleRate);
      if (!visibleRates.length) {
        setRatesError(noRatesMessage(result));
      } else {
        setApiRates(visibleRates);
        setSelectedApiRate(visibleRates[0]);
        setDetailsExpanded(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "We could not get rates.";
      if (msg === "EMAIL_NOT_VERIFIED") {
        router.push("/verifica-tu-correo");
        return;
      }
      if (msg.toLowerCase().includes("integraciones")) {
        setRatesError("No real rate integrations are configured yet.");
      } else if (msg.toLowerCase().includes("supabase") || msg.toLowerCase().includes("not configured")) {
        setRatesError("The server is not configured correctly for rates.");
      } else if (msg === INTERNATIONAL_SHIPPING_SOON_MESSAGE || msg === UNSUPPORTED_COUNTRY_MESSAGE) {
        setRatesError(msg);
      } else if (msg.toLowerCase().includes("address") || msg.toLowerCase().includes("postal") || msg.toLowerCase().includes("zip")) {
        setRatesError("Review street address, city, state/province, and postal code.");
      } else if (msg.toLowerCase().includes("parcel") || msg.toLowerCase().includes("weight")) {
        setRatesError("Complete package weight, length, width, and height.");
      } else {
        setRatesError("No rates were returned for this route. This market may require carrier setup.");
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
    if (!selectedApiRate || saving) return;

    if (configStatus?.labelPurchaseEnabled !== true) {
      setShowConfirm(false);
      setErrors({
        form: "Label purchase is not enabled yet. You can compare rates, but label generation is currently disabled.",
      });
      return;
    }

    const rateProvider = selectedApiRate.provider;

    // Skeleton providers don't support label creation yet.
    if (
      selectedApiRate.supportsLabels === false ||
      LABELS_NOT_IMPLEMENTED_PROVIDERS.has(rateProvider)
    ) {
      setShowConfirm(false);
      setErrors({ form: "This rate is not available for label generation yet. Select another rate." });
      return;
    }

    setSaving(true);
    setErrors({});
    setInsufficientBalance(false);

    try {
      const { countryCode } = validateDomesticShipmentCountries(form.origin, form.destination);
      const result: CreateLabelResult = await apiCreateLabel({
        provider: rateProvider,
        providerRateId: selectedApiRate.providerRateId,
        origin: {
          line1: form.origin.street1,
          line2: form.origin.street2 || undefined,
          city: form.origin.city,
          postalCode: form.origin.postalCode,
          state: form.origin.state,
          country: countryCode,
        },
        destination: {
          city: form.destination.city,
          postalCode: form.destination.postalCode,
          state: form.destination.state,
          country: countryCode,
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
          originCountry: countryCode,
          destinationCountry: countryCode,
          domesticMarket: countryCode,
        },
        idempotencyKey: idempotencyKeyRef.current,
        senderName: form.origin.name?.trim() || undefined,
        senderPhone: fullPhone(form.origin) || undefined,
        recipientName: form.destination.name?.trim() || undefined,
        recipientPhone: fullPhone(form.destination) || undefined,
        productType: resolvedProductType(form) || undefined,
      });

      setSummary({
        ...result.shipment,
        labelUrl: result.labelUrl ?? result.shipment.labelUrl ?? null,
      });
      setLabelData(result.labelData);
      idempotencyKeyRef.current = crypto.randomUUID();
      setShowConfirm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const lowerMsg = msg.toLowerCase();
      setShowConfirm(false);
      if (lowerMsg.includes("insufficient") || lowerMsg.includes("balance")) {
        setInsufficientBalance(true);
        setErrors({
          form: "Your wallet balance is not enough for this label. Add funds or pay by card if card checkout is available.",
        });
      } else if (lowerMsg.includes("no longer available") || lowerMsg.includes("refresh rates") || lowerMsg.includes("expired")) {
        setErrors({
          form: "Selected rate is no longer available. Please refresh rates and try again.",
        });
      } else if (lowerMsg.includes("already being processed") || lowerMsg.includes("idempotency")) {
        setErrors({
          form: "This purchase is already being processed. Please refresh your shipments before trying again.",
        });
      } else if (lowerMsg.includes("request id") || lowerMsg.includes("could not be saved")) {
        setErrors({
          form: msg || "Label was purchased but could not be saved. Please contact support.",
        });
      } else if (lowerMsg.includes("carrier") || lowerMsg.includes("provider") || lowerMsg.includes("shipengine")) {
        setErrors({
          form: "The carrier could not generate this label. Please try another rate or contact support.",
        });
      } else if (lowerMsg.includes("line1") || lowerMsg.includes("postal") || lowerMsg.includes("city")) {
        setErrors({ form: "Review street address, city, state/province, and postal code before creating the label." });
      } else if (lowerMsg.includes("parcel") || lowerMsg.includes("weight") || lowerMsg.includes("dimensions")) {
        setErrors({ form: "Complete package weight, length, width, and height." });
      } else {
        setErrors({ form: "The carrier could not generate this label. Please try another rate or contact support." });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadLabel() {
    if (summary?.labelUrl) {
      window.open(summary.labelUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!labelData) return;
    const byteChars = atob(labelData);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `label-${summary?.trackingNumber ?? Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Pay by card ─────────────────────────────────────────────────────────────

  async function handlePayByCard() {
    if (!selectedApiRate || authLoading || !emailVerified || payByCardLoading) return;

    setPayByCardLoading(true);
    setErrors({});

    const checkoutWindow = window.open("", "_blank");
    if (checkoutWindow) {
      checkoutWindow.opener = null;
      checkoutWindow.document.title = "Opening SendiFlash Checkout...";
      checkoutWindow.document.body.style.fontFamily = "system-ui, sans-serif";
      checkoutWindow.document.body.style.padding = "24px";
      checkoutWindow.document.body.style.color = "#334155";
      checkoutWindow.document.body.textContent = "Opening secure checkout...";
    }

    try {
      const { countryCode } = validateDomesticShipmentCountries(form.origin, form.destination);
      const result = await apiCreateLabelCheckoutSession({
        provider: selectedApiRate.provider,
        serviceCode: selectedApiRate.serviceCode,
        serviceName: selectedApiRate.serviceName,
        rateSnapshot: {
          provider: selectedApiRate.provider,
          serviceCode: selectedApiRate.serviceCode,
          carrierCode: selectedApiRate.courierId,
          providerRateId: selectedApiRate.providerRateId,
          providerCost: selectedApiRate.pricing.providerCost,
          customerPrice: selectedApiRate.customerPrice,
          currency: selectedApiRate.currency ?? "usd",
          pricingBreakdown: {
            providerCost: selectedApiRate.pricing.providerCost,
            platformMarkup: selectedApiRate.pricing.platformMarkup,
            subtotal: selectedApiRate.pricing.subtotal,
            paymentFee: selectedApiRate.pricing.paymentFee,
            customerPrice: selectedApiRate.pricing.customerPrice,
            originCountry: countryCode,
            destinationCountry: countryCode,
            domesticMarket: countryCode,
            productDescription: resolvedProductType(form),
          },
        },
        origin: { ...form.origin, country: countryCode, phone: fullPhone(form.origin) },
        destination: { ...form.destination, country: countryCode, phone: fullPhone(form.destination) },
        parcel: {
          weight: Number(form.weight),
          weightUnit: form.weightUnit,
          length: Number(form.length),
          width: Number(form.width),
          height: Number(form.height),
          dimensionUnit: form.dimensionUnit,
        },
      });

      if (checkoutWindow) {
        checkoutWindow.location.href = result.checkoutUrl;
        setCheckoutNotice("Checkout opened in a new tab. Keep this page open while we prepare your label.");
        setPayByCardLoading(false);
      } else {
        setCheckoutNotice("Popup blocked. Redirecting this tab to checkout.");
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
      const msg = err instanceof Error ? err.message : "";
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes("not enabled") || lowerMsg.includes("503")) {
        setErrors({ form: "Direct card payment for labels is not enabled yet." });
      } else if (lowerMsg.includes("not available for this account") || lowerMsg.includes("403")) {
        setErrors({ form: "Card payment for labels is not available for your account yet." });
      } else if (lowerMsg.includes("too many")) {
        setErrors({ form: "Too many label checkout attempts. Please try again later." });
      } else if (lowerMsg.includes("email") || lowerMsg.includes("verified")) {
        router.push("/verifica-tu-correo");
        return;
      } else {
        setErrors({ form: "Could not start card payment. Please try again, add funds to your wallet, or contact support if it keeps happening." });
      }
      setPayByCardLoading(false);
    }
  }

  // Triggered from inside the ConfirmModal — close modal first, then start card flow
  function handlePayByCardFromModal() {
    setShowConfirm(false);
    handlePayByCard();
  }

  // ── Config alerts ───────────────────────────────────────────────────────────

  const showConfigWarning = configStatus !== null && !configStatus.supabaseConfigured;
  const showNoRatesWarning =
    configStatus !== null && configStatus.supabaseConfigured && !configStatus.ratesConfigured;
  const compactDetails = (fetchingRates || apiRates.length > 0) && !detailsExpanded;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!authLoading && !emailVerified) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-pink-50 text-pink-500">
          <MailCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Verify your email first</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          You need to confirm your email address before getting rates or creating labels.
        </p>
        <button
          onClick={() => router.push("/verifica-tu-correo")}
          className="mt-6 inline-flex h-11 items-center rounded-2xl bg-[#FF1493] px-6 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3]"
        >
          Verify email
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {labelPaymentStatus === "success" && (
        <LabelPaymentSuccessBanner
          order={labelOrderStatus}
          labelPurchaseEnabled={configStatus?.labelPurchaseEnabled === true}
        />
      )}
      {labelPaymentStatus === "cancelled" && (
        <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <p>Payment was cancelled. No label was purchased and no charge was made.</p>
        </div>
      )}
      {showConfigWarning && (
        <ConfigAlert type="error">
          <strong>The server is not ready to get rates.</strong> Check the environment configuration.
        </ConfigAlert>
      )}
      {showNoRatesWarning && (
        <ConfigAlert type="warning">
          <strong>No active rate integrations.</strong> Configure at least one real
          server-side integration to show rates.
        </ConfigAlert>
      )}
      {checkoutNotice ? (
        <ConfigAlert type="warning">
          {checkoutNotice}
        </ConfigAlert>
      ) : null}

      <FirstShipmentGuide />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          {compactDetails ? (
            <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-[#2563EB]">
                      {fetchingRates ? "Getting rates" : "Shipment details"}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-500">{shipmentSummary(form)}</p>
                    {fetchingRates ? (
                      <p className="mt-1 text-sm text-slate-500">Checking configured providers. This can take a few seconds.</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailsExpanded(true)}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
                  >
                    Edit shipment details
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr_0.9fr]">
                  <CompactSummaryCard
                    label="From"
                    accent="blue"
                    title={addressPersonLabel(form.origin, "Sender")}
                    body={addressCompactLabel(form.origin, "Origin")}
                  />
                  <CompactSummaryCard
                    label="To"
                    accent="orange"
                    title={addressPersonLabel(form.destination, "Recipient")}
                    body={addressCompactLabel(form.destination, "Destination")}
                  />
                  <CompactSummaryCard
                    label="Package"
                    accent="slate"
                    title={packageCompactLabel(form)}
                    body={resolvedProductType(form) || "Package"}
                  />
                </div>
              </div>
            </div>
          ) : (
          <form
            onSubmit={handleFetchRates}
            className="grid min-w-0 gap-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-6"
            noValidate
          >
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#2563EB]">Get rates</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Compare rates with a From address, To address, and package details. We support domestic shipments within selected countries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                >
                  Clear draft
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-blue-100 bg-blue-50/40 p-4">
                <SectionHeader icon={<User className="h-4 w-4" />} title="From" />
                <div className="mt-4">
                  <AddressInput
                    sectionLabel="From"
                    value={form.origin}
                    onChange={updateOrigin}
                    requirePostal
                    errors={originErrors()}
                  />
                  <AddressSummary addr={form.origin} />
                </div>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-orange-50/40 p-4">
                <SectionHeader icon={<MapPin className="h-4 w-4" />} title="To" />
                <div className="mt-4">
                  <AddressInput
                    sectionLabel="To"
                    value={form.destination}
                    onChange={updateDestination}
                    requirePostal
                    errors={destinationErrors()}
                  />
                  <AddressSummary addr={form.destination} />
                </div>
              </div>
            </div>

            <SectionHeader icon={<Package className="h-4 w-4" />} title="Package" />
            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="grid gap-4 md:grid-cols-[1fr_140px_1.4fr]">
                <NumberField label="Weight" value={form.weight} onChange={(v) => updateField("weight", v)} placeholder="1" error={errors.weight} />
                <SelectField label="Unit" value={form.weightUnit} options={["lb", "oz"]} onChange={(v) => updateField("weightUnit", v)} />
                <SelectField label="Product type" value={form.productType} options={productTypes} onChange={(v) => updateField("productType", v)} error={errors.productType} />
              </div>
              {form.productType === "Other" ? (
                <div className="mt-4">
                  <InputField
                    label="Describe the product"
                    value={form.productDescription}
                    onChange={(v) => updateField("productDescription", v)}
                    placeholder="e.g. Handmade ceramic mug"
                    error={errors.productDescription}
                  />
                </div>
              ) : null}
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_1fr_140px]">
                <NumberField label="Length" value={form.length} onChange={(v) => updateField("length", v)} placeholder="1" error={errors.length} />
                <NumberField label="Width" value={form.width} onChange={(v) => updateField("width", v)} placeholder="1" error={errors.width} />
                <NumberField label="Height" value={form.height} onChange={(v) => updateField("height", v)} placeholder="1" error={errors.height} />
                <SelectField label="Unit" value={form.dimensionUnit} options={["in", "cm"]} onChange={(v) => updateField("dimensionUnit", v)} />
              </div>
            </div>

            <button
              type="submit"
              disabled={fetchingRates || showConfigWarning}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#F97316] px-5 text-sm font-bold text-white shadow-xl shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-[#EA580C] disabled:opacity-50 sm:w-fit"
            >
              <Zap className="mr-2 h-4 w-4" />
              {fetchingRates ? "Getting rates..." : "Get rates"}
            </button>

            {ratesError ? (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {ratesError}
              </div>
            ) : null}
          </form>
          )}

          {fetchingRates ? <RateLoadingGrid /> : null}

          {apiRates.length > 0 && (
            <AvailableRatesList
              rates={apiRates}
              selected={selectedApiRate}
              onSelect={setSelectedApiRate}
            />
          )}

          {apiRates.length > 0 && (
            <form
              onSubmit={handleRequestOnlineLabel}
              className="grid gap-4 rounded-3xl border border-cyan-200 bg-cyan-50/40 p-4 shadow-sm sm:p-5"
              noValidate
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm font-semibold text-slate-700">
                  Select a rate to review the price breakdown. Label purchase is disabled unless it is explicitly enabled on the server.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || !selectedApiRate}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:opacity-70 sm:w-fit"
              >
                <Save className="mr-2 h-4 w-4" />
                Continue
              </button>
              {errors.form ? (
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-red-600">{errors.form}</p>
                  {insufficientBalance && (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/saldo"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-slate-700"
                      >
                        Add funds to wallet
                      </Link>
                      {configStatus?.directLabelPaymentEnabled && configFeatures?.directLabelPaymentAvailable ? (
                        <button
                          type="button"
                          disabled={payByCardLoading || !selectedApiRate || authLoading}
                          onClick={handlePayByCard}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {payByCardLoading ? "Redirecting..." : "Pay this label by card"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={
                            configStatus?.directLabelPaymentEnabled
                              ? "Card payment for labels is not available for your account yet."
                              : "Coming soon — label direct payment is not yet enabled."
                          }
                          className="inline-flex h-9 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-400 opacity-60"
                        >
                          Pay this label by card
                          {!configStatus?.directLabelPaymentEnabled ? (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Soon
                            </span>
                          ) : null}
                        </button>
                      )}
                    </div>
                  )}
                  {insufficientBalance && configStatus?.directLabelPaymentEnabled && configFeatures?.directLabelPaymentAvailable === false ? (
                    <p className="text-xs font-semibold text-slate-500">
                      Card payment for labels is not available for your account yet.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </form>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="grid min-w-0 content-start gap-5">
          {summary ? (
            <GuideSummary
              summary={summary}
              labelData={labelData}
              onDownload={handleDownloadLabel}
            />
          ) : null}
        </aside>
      </div>

      {/* Confirmation modal */}
      {showConfirm && selectedApiRate && (
        <ConfirmModal
          rate={selectedApiRate}
          saving={saving}
          labelPurchaseEnabled={configStatus?.labelPurchaseEnabled === true}
          walletBalance={walletBalance}
          directCardAvailable={
            configStatus?.directLabelPaymentEnabled === true &&
            configFeatures?.directLabelPaymentAvailable === true
          }
          payByCardLoading={payByCardLoading}
          onConfirm={handleConfirmed}
          onPayByCard={handlePayByCardFromModal}
          onCancel={() => {
            if (!saving && !payByCardLoading) setShowConfirm(false);
          }}
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

function FirstShipmentGuide() {
  const steps = [
    "Enter origin and destination",
    "Compare available rates",
    "Pay with wallet or card",
    "Get your label automatically",
  ];

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-[#F97316]">First shipment guide</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Four steps from rate to label</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            SendiFlash currently supports domestic shipments within selected countries. International shipping is coming later.
          </p>
        </div>
        <Link
          href="/support"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
        >
          Help and FAQ
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#2563EB] text-sm font-black text-white">
              {index + 1}
            </span>
            <span className="text-sm font-bold text-slate-700">{step}</span>
          </div>
        ))}
      </div>
    </section>
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

function CompactSummaryCard({
  label,
  title,
  body,
  accent,
}: {
  label: string;
  title: string;
  body: string;
  accent: "blue" | "orange" | "slate";
}) {
  const accentClasses = {
    blue: "border-blue-100 bg-blue-50/50 text-[#2563EB]",
    orange: "border-orange-100 bg-orange-50/60 text-[#F97316]",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  }[accent];

  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${accentClasses}`}>
      <p className="text-[11px] font-black uppercase tracking-widest">{label}</p>
      <p className="mt-2 truncate text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-600">{body}</p>
    </div>
  );
}

const CARRIER_DISPLAY: Record<string, string> = {
  stamps_com: "USPS",
  ups: "UPS",
  fedex: "FedEx",
  dhl_express: "DHL Express",
  usps: "USPS",
  dhl: "DHL",
};

function displayCarrier(courierId: string, courierName: string): string {
  const raw = `${courierId} ${courierName}`.toLowerCase();
  if (raw.includes("stamps") || raw.includes("usps")) return "USPS";
  if (raw.includes("fedex")) return "FedEx";
  if (raw.includes("ups")) return "UPS";
  if (raw.includes("dhl")) return "DHL";

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
    return `Delivery in ${n} day${n !== 1 ? "s" : ""}`;
  }
  return estimatedTime;
}

function isCustomerVisibleRate(rate: RateResult): boolean {
  if (rate.provider === "internal" || rate.provider === "mock") return false;

  const haystack = [
    rate.provider,
    rate.courierId,
    rate.courierName,
    rate.serviceCode,
    rate.serviceName,
  ]
    .join(" ")
    .toLowerCase();

  return !/\b(dummy|mock|internal|demo|test carrier)\b/.test(haystack);
}

function RateLoadingGrid() {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-slate-950">Searching for the best rate...</h2>
          <p className="mt-1 text-sm text-slate-500">Comparing available providers for this route.</p>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#F97316] [animation-delay:120ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-slate-300 [animation-delay:240ms]" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-4 h-5 w-3/4 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-5 flex items-end justify-between">
              <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
      <h2 className="font-black text-slate-950">Available rates</h2>
      <p className="mt-1 text-xs text-slate-400">Price includes shipping, service fee, and payment fee</p>
      <div className="mt-1 flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5 shrink-0" />
        Estimated rate based on the address and package details entered.
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
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
              className={`min-h-[188px] rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? "border-[#2563EB] bg-blue-50 ring-1 ring-[#2563EB]/30"
                  : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
              }`}
            >
              {(isRecommended || isCheapest || isFastest) && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {isRecommended && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
                      Recommended
                    </span>
                  )}
                  {isCheapest && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-black text-green-700">
                      Lowest cost
                    </span>
                  )}
                  {isFastest && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700">
                      Fastest
                    </span>
                  )}
                </div>
              )}
              <div className="flex h-full flex-col gap-4">
                <div className="min-w-0">
                  <p className="break-words font-black text-slate-950">{rate.serviceName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{carrierLabel}</p>
                  {deliveryText ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {deliveryText}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400">Delivery time not specified</p>
                  )}
                </div>
                <div className="mt-auto flex items-end justify-between gap-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${
                    isSelected ? "bg-blue-100 text-[#2563EB]" : "bg-slate-100 text-slate-500"
                  }`}>
                    {isSelected ? "Selected" : "Select"}
                  </span>
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
  const labelStatus = summary.labelStatus === "purchased" ? "Purchased" : summary.labelStatus ?? "Not available";
  const paymentStatus = summary.paymentStatus
    ? summary.paymentStatus.charAt(0).toUpperCase() + summary.paymentStatus.slice(1).toLowerCase()
    : "Not available";
  const serviceLabel = summary.providerServiceCode
    ? summary.providerServiceCode
        .split(/[_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : null;

  return (
    <div className="print-guide rounded-3xl border border-green-200 bg-green-50 p-4 shadow-sm shadow-green-950/5 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Badge tone="green">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Label purchased successfully
          </Badge>
          <h2 className="mt-4 break-words text-2xl font-black text-slate-950">{summary.trackingNumber}</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            Carrier label and shipment summary are separate documents.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#06B6D4] shadow-sm"
          aria-label="Print summary"
        >
          <Printer className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-5 grid gap-3 text-sm">
        <SummaryRow label="Carrier" value={summary.courier} />
        {serviceLabel ? <SummaryRow label="Service" value={serviceLabel} /> : null}
        <SummaryRow label="Route" value={`${summary.originCity} → ${summary.destinationCity}`} />
        <SummaryRow label="Label" value={labelStatus} />
        <SummaryRow label="Payment" value={paymentStatus} />
        <SummaryRow label="Total paid" value={formatCurrency(displayPrice)} />
      </div>

      {summary.labelUrl || labelData ? (
        <button
          type="button"
          onClick={onDownload}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20"
        >
          <Download className="mr-2 h-4 w-4" />
          Download carrier label
        </button>
      ) : summary.labelStatus === "purchased" ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          Carrier label is not available yet.
        </p>
      ) : null}

      <Link
        href={`/guia/${summary.trackingNumber}`}
        className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#06B6D4] px-5 text-sm font-bold text-white shadow-xl shadow-cyan-500/20"
      >
        View shipment
      </Link>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        Create another shipment
      </button>
    </div>
  );
}

function ConfirmModal({
  rate,
  saving,
  labelPurchaseEnabled,
  walletBalance,
  directCardAvailable,
  payByCardLoading,
  onConfirm,
  onPayByCard,
  onCancel,
}: {
  rate: RateResult;
  saving: boolean;
  labelPurchaseEnabled: boolean;
  walletBalance: number | null;
  directCardAvailable: boolean;
  payByCardLoading: boolean;
  onConfirm: () => void;
  onPayByCard: () => void;
  onCancel: () => void;
}) {
  const { pricing } = rate;
  const hasFeeBreakdown = pricing.paymentFee > 0;
  const carrierLabel = displayCarrier(rate.courierId, rate.courierName);
  const deliveryText = formatDelivery(rate.estimatedTime);
  const supportsLabelPurchase =
    labelPurchaseEnabled &&
    rate.supportsLabels !== false &&
    !LABELS_NOT_IMPLEMENTED_PROVIDERS.has(rate.provider);

  const labelPrice = rate.customerPrice;
  const hasEnoughBalance = walletBalance !== null && walletBalance >= labelPrice;
  const balanceKnown = walletBalance !== null;
  const shortBy = balanceKnown && !hasEnoughBalance ? labelPrice - walletBalance : 0;
  const busy = saving || payByCardLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">
            {supportsLabelPurchase ? "Review and pay" : "Rate selected"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="grid h-8 w-8 place-items-center rounded-xl hover:bg-slate-100 disabled:opacity-40"
            aria-label="Cancel"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {!supportsLabelPurchase && (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
            Rate comparison is available. Label purchase is currently disabled.
          </p>
        )}

        {/* Rate & pricing breakdown */}
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
          <p className="font-black text-slate-950">{rate.serviceName}</p>
          <p className="text-slate-500">{carrierLabel}</p>
          {deliveryText && <p className="mt-1 text-xs text-slate-400">{deliveryText}</p>}

          {hasFeeBreakdown ? (
            <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Shipping</span>
                <span className="font-bold text-slate-950">{formatCurrency(pricing.providerCost)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Service fee</span>
                <span className="font-bold text-slate-950">{formatCurrency(pricing.platformMarkup)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Payment fee</span>
                <span className="font-bold text-slate-950">{formatCurrency(pricing.paymentFee)}</span>
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-2">
                <span className="font-black text-slate-950">Total</span>
                <span className="text-2xl font-black text-[#2563EB]">{formatCurrency(labelPrice)}</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-2xl font-black text-[#2563EB]">{formatCurrency(labelPrice)}</p>
          )}
        </div>

        {/* Wallet balance indicator */}
        {supportsLabelPurchase && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${hasEnoughBalance ? "bg-blue-50 text-[#2563EB]" : "bg-slate-100 text-slate-500"}`}>
                <Wallet className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-500">Wallet balance</p>
                <p className="font-black text-slate-950">
                  {balanceKnown ? formatCurrency(walletBalance!) : "—"}
                </p>
              </div>
            </div>
            {balanceKnown && (
              hasEnoughBalance ? (
                <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sufficient
                </span>
              ) : (
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                  Short {formatCurrency(shortBy)}
                </span>
              )
            )}
          </div>
        )}

        {/* Payment actions */}
        {supportsLabelPurchase ? (
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={!hasEnoughBalance || busy}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition ${
                hasEnoughBalance
                  ? "bg-[linear-gradient(135deg,#2563EB,#3B82F6)] text-white shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              <Wallet className="h-4 w-4" />
              {saving
                ? "Purchasing label..."
                : hasEnoughBalance
                  ? "Pay with wallet"
                  : `Insufficient balance (need ${formatCurrency(shortBy)} more)`}
            </button>

            <button
              type="button"
              onClick={onPayByCard}
              disabled={busy || !directCardAvailable}
              title={directCardAvailable ? "Open secure card checkout in a new tab." : "Card checkout is not available for this account yet."}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:border-[#F97316]/50 hover:bg-orange-50 hover:text-[#F97316] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              {payByCardLoading ? "Opening checkout..." : "Pay by card"}
            </button>
            </div>
            {!directCardAvailable ? (
              <p className="text-xs font-semibold text-slate-500">
                Card checkout is visible for clarity, but it is not available for this account right now.
              </p>
            ) : null}

            {/* Add funds shortcut when balance is insufficient */}
            {!hasEnoughBalance && !directCardAvailable && balanceKnown && (
              <Link
                href="/saldo"
                className="flex h-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-sm font-bold text-[#2563EB] transition hover:bg-blue-100"
              >
                Add funds to wallet
              </Link>
            )}

            {/* Cancel */}
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-10 w-full rounded-2xl text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-slate-400">
          Estimated rate. Final pricing may change if shipment details are updated.
        </p>
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

function InputField({
  label, value, onChange, placeholder, error,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        value={value}
        type="text"
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
    <div className="flex flex-col gap-1 rounded-2xl bg-white/80 px-4 py-3 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="break-words font-bold text-slate-950 sm:text-right">{value}</span>
    </div>
  );
}

function AddressSummary({ addr }: { addr: StructuredAddress }) {
  if (!addr.city) return null;
  const isComplete = addr.validationStatus === "complete";
  const isNeedsReview = addr.validationStatus === "needs_review";
  const parts = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ");
  const countryPart = ` · ${getDomesticCountryName(normalizeCountryCode(addr.country))}`;

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
      <span className="min-w-0 break-words text-slate-600">{parts}{countryPart}</span>
      <span
        className={`shrink-0 font-bold ${
          isComplete
            ? "text-green-700"
            : isNeedsReview
              ? "text-amber-700"
              : "text-slate-500"
        }`}
      >
        {isComplete ? "Complete ✓" : isNeedsReview ? "Review" : "Incomplete"}
      </span>
    </div>
  );
}

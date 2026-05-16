import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";
import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { aggregateRates } from "@/lib/logistics/rateAggregator";
import { InvalidPayloadError } from "@/lib/logistics/errors";
import type { Address, Parcel, RateInput } from "@/lib/logistics/types";

type ShipStationRateBody = {
  provider: "shipstation";
  origin: Address;
  destination: Address;
  parcel: Parcel;
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

type AggregatedRateBody = {
  mode: "best_available";
  origin: Address;
  destination: Address;
  parcel: Parcel;
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

function isShipStationRequest(body: unknown): body is ShipStationRateBody {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).provider === "shipstation"
  );
}

function isAggregatedRequest(body: unknown): body is AggregatedRateBody {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).mode === "best_available"
  );
}

function parseExternalRateInput(body: ShipStationRateBody | AggregatedRateBody): RateInput {
  const { origin, destination, parcel, courier, cashOnDelivery, cashAmount } = body;

  if (!origin?.line1?.trim() || !origin.city?.trim() || !origin.state?.trim() || !origin.postalCode?.trim()) {
    throw new InvalidPayloadError("Complete origin street, city, state, and ZIP.");
  }
  if (!destination?.line1?.trim() || !destination.city?.trim() || !destination.state?.trim() || !destination.postalCode?.trim()) {
    throw new InvalidPayloadError("Complete destination street, city, state, and ZIP.");
  }
  if ((origin.country ?? "US") !== "US" || (destination.country ?? "US") !== "US") {
    throw new InvalidPayloadError("Only US domestic rates are supported right now.");
  }
  if (!parcel || !Number.isFinite(Number(parcel.weight)) || Number(parcel.weight) <= 0) {
    throw new InvalidPayloadError("parcel.weight must be a positive number.");
  }
  if (
    !Number.isFinite(Number(parcel.length)) || Number(parcel.length) <= 0 ||
    !Number.isFinite(Number(parcel.width)) || Number(parcel.width) <= 0 ||
    !Number.isFinite(Number(parcel.height)) || Number(parcel.height) <= 0
  ) {
    throw new InvalidPayloadError("parcel length, width, and height must be positive numbers.");
  }

  return {
    origin,
    destination,
    parcel: {
      ...parcel,
      weight: Number(parcel.weight),
      length: Number(parcel.length),
      width: Number(parcel.width),
      height: Number(parcel.height),
    },
    courier: typeof courier === "string" ? courier.trim() || undefined : undefined,
    cashOnDelivery: Boolean(cashOnDelivery),
    cashAmount: Number(cashAmount ?? 0),
  };
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    await requireVerifiedUser(request);
    const body = (await request.json()) as unknown;

    // ── Best available: aggregate rates from all configured providers ──────────
    if (isAggregatedRequest(body)) {
      const rateInput = parseExternalRateInput(body);
      const { rates, outcomes, queriedProviders, configuredCount } = await aggregateRates(rateInput);
      const failedCount = outcomes.filter((o) => !o.ok).length;
      const diagnostic =
        configuredCount === 0
          ? "not_configured"
          : rates.length === 0 && failedCount > 0
            ? "providers_failed"
            : rates.length === 0
              ? "no_rates"
              : undefined;

      return apiSuccess({
        mode: "best_available",
        rates,
        configuredCount,
        queriedProvidersCount: queriedProviders.length,
        diagnostic,
        message: rates.length > 0 ? "Rates available." : "No rates available.",
      });
    }

    // ── ShipStation direct (legacy path, kept for backward compatibility) ──────
    if (isShipStationRequest(body)) {
      const rateInput = parseExternalRateInput(body);
      const adapter = getLogisticsAdapter("shipstation");
      const rates = await adapter.getRates(rateInput);

      return apiSuccess({
        mode: "direct",
        rates,
        message: "Rates available.",
      });
    }

    return apiError("Usa el cotizador de tarifas reales para obtener opciones disponibles.", 400);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not calculate rates.");
  }
}

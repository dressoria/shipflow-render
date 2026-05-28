import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";
import { getLogisticsAdapter } from "@/lib/logistics/registry";
import { aggregateRates } from "@/lib/logistics/rateAggregator";
import { InvalidPayloadError } from "@/lib/logistics/errors";
import { validateDomesticShipmentCountries } from "@/lib/domesticMarkets";
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
    throw new InvalidPayloadError("Complete origin street, city, state/province, and postal code.");
  }
  if (!destination?.line1?.trim() || !destination.city?.trim() || !destination.state?.trim() || !destination.postalCode?.trim()) {
    throw new InvalidPayloadError("Complete destination street, city, state/province, and postal code.");
  }
  let countryCode: string;
  try {
    countryCode = validateDomesticShipmentCountries(origin, destination).countryCode;
  } catch (error) {
    throw new InvalidPayloadError(error instanceof Error ? error.message : "This route is not available yet.");
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
    origin: { ...origin, country: countryCode },
    destination: { ...destination, country: countryCode },
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
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    await requireVerifiedUser(request);
    const body = (await request.json()) as unknown;

    // ── Best available: aggregate rates from all configured providers ──────────
    if (isAggregatedRequest(body)) {
      const rateInput = parseExternalRateInput(body);
      const { rates, outcomes, queriedProviders, configuredCount } = await aggregateRates(rateInput);
      const failedCount = outcomes.filter((o) => !o.ok).length;

      if (configuredCount === 0) {
        return apiError("No real rate integrations are configured yet.", 503);
      }

      if (rates.length === 0) {
        return apiSuccess({
          mode: "best_available",
          rates: [],
          configuredCount,
          queriedProvidersCount: queriedProviders.length,
          diagnostic: failedCount > 0 ? "providers_failed" : "no_rates",
          message: "No rates were returned for this route. This market may require carrier setup.",
        });
      }

      return apiSuccess({
        mode: "best_available",
        rates,
        configuredCount,
        queriedProvidersCount: queriedProviders.length,
        message: "Rates available.",
      });
    }

    // ── ShipStation direct (legacy path, kept for backward compatibility) ──────
    if (isShipStationRequest(body)) {
      const rateInput = parseExternalRateInput(body);
      const adapter = getLogisticsAdapter("shipstation");
      const rates = await adapter.getRates(rateInput);

      if (rates.length === 0) {
        return apiSuccess({
          mode: "direct",
          rates: [],
          diagnostic: "no_rates",
          message: "No rates were returned for this route. This market may require carrier setup.",
        });
      }

      return apiSuccess({
        mode: "direct",
        rates,
        message: "Rates available.",
      });
    }

    return apiError("Use the real rate quote flow to get available options.", 400);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not calculate rates.");
  }
}

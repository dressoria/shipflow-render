import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { calculateInternalRates, type RateRequestInput } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";
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

type InternalRateBody = RateRequestInput & {
  provider?: "internal" | "mock";
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

function parseExternalRateInput(
  body: ShipStationRateBody | AggregatedRateBody,
  providerLabel: string,
): RateInput {
  const { origin, destination, parcel, courier, cashOnDelivery, cashAmount } = body;

  if (!origin || typeof origin.city !== "string" || !origin.city.trim()) {
    throw new InvalidPayloadError(`origin.city is required for ${providerLabel} rates.`);
  }
  if (!destination || typeof destination.city !== "string" || !destination.city.trim()) {
    throw new InvalidPayloadError(`destination.city is required for ${providerLabel} rates.`);
  }
  if (!parcel || !Number.isFinite(Number(parcel.weight)) || Number(parcel.weight) <= 0) {
    throw new InvalidPayloadError("parcel.weight must be a positive number.");
  }

  return {
    origin,
    destination,
    parcel: { ...parcel, weight: Number(parcel.weight) },
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
    const { supabase } = await requireSupabaseUser(request);
    const body = (await request.json()) as unknown;

    // ── Best available: aggregate rates from all configured providers ──────────
    if (isAggregatedRequest(body)) {
      const rateInput = parseExternalRateInput(body, "aggregated");
      const { rates, outcomes, queriedProviders, configuredCount } = await aggregateRates(rateInput);

      return apiSuccess({
        mode: "best_available",
        rates,
        queriedProviders,
        configuredCount,
        partialErrors: outcomes.filter((o) => !o.ok).map((o) => (!o.ok ? o.error : "")),
        message: `Aggregated rates from ${configuredCount} configured provider(s).`,
      });
    }

    // ── ShipStation direct (legacy path, kept for backward compatibility) ──────
    if (isShipStationRequest(body)) {
      const rateInput = parseExternalRateInput(body, "ShipStation");
      const adapter = getLogisticsAdapter("shipstation");
      const rates = await adapter.getRates(rateInput);

      return apiSuccess({
        mode: "direct",
        rates,
        message: "Direct provider rates.",
      });
    }

    // ── Default: internal/mock ─────────────────────────────────────────────────
    const rates = await calculateInternalRates(supabase, body as InternalRateBody);

    return apiSuccess({
      mode: "standard",
      rates,
      message: "Standard rates.",
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not calculate rates.");
  }
}

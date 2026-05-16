import {
  InvalidAddressError,
  InvalidPayloadError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "@/lib/logistics/errors";
import { applyMarkup } from "@/lib/logistics/pricing";
import type { LogisticsAdapter } from "@/lib/logistics/adapters/LogisticsAdapter";
import type { LabelResult, RateInput, RateResult, VoidLabelResult } from "@/lib/logistics/types";

// EasyPost API v2 — rates only. Label creation is not yet implemented.
// Auth: Basic Auth with EASYPOST_API_KEY as username and empty password.
// Docs: https://www.easypost.com/docs/api
const EASYPOST_API_URL = "https://api.easypost.com/v2";

type EPAddress = {
  name?: string;
  phone?: string;
  street1?: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;    // EasyPost uses "zip", not "postalCode"
  country: string;
};

type EPParcel = {
  weight: number;   // ounces — EasyPost requires ounces
  length?: number;  // inches
  width?: number;   // inches
  height?: number;  // inches
};

type EPShipmentPayload = {
  shipment: {
    from_address: EPAddress;
    to_address: EPAddress;
    parcel: EPParcel;
  };
};

type EPRate = {
  id: string;
  carrier: string;
  service: string;
  rate: string;               // decimal string, e.g. "5.50"
  currency: string;
  delivery_days: number | null;
  est_delivery_days: number | null;
  delivery_date: string | null;
};

type EPShipmentResponse = {
  id?: string;
  rates?: EPRate[];
  error?: { code: string; message: string };
};

// Converts weight to ounces (EasyPost's required unit).
function toOunces(weight: number, unit?: string): number {
  if (unit === "oz") return Math.round(weight * 100) / 100;
  if (unit === "kg") return Math.round(weight * 35.274 * 100) / 100;
  // Default: pounds → ounces
  return Math.round(weight * 16 * 100) / 100;
}

// Converts a linear dimension to inches (EasyPost's required unit).
function toInches(value: number, unit?: string): number {
  if (unit === "cm") return Math.round((value / 2.54) * 100) / 100;
  return value; // already inches
}

function buildEPAddress(
  city: string,
  state?: string,
  postalCode?: string,
  country?: string,
): EPAddress {
  return {
    city: city.trim(),
    state: state?.trim() ?? "",
    zip: postalCode?.trim() ?? "",
    country: country?.trim() ?? "US",
  };
}

function handleEasyPostHttpError(status: number): never {
  if (status === 401 || status === 403) {
    throw new ProviderAuthError(
      "EasyPost rejected the request: check EASYPOST_API_KEY.",
    );
  }
  if (status === 429) throw new ProviderRateLimitError();
  if (status === 400 || status === 422) {
    throw new InvalidPayloadError(
      "EasyPost rejected the payload. Verify addresses, postal codes, and parcel weight.",
    );
  }
  throw new ProviderUnavailableError(
    `EasyPost returned an unexpected error (HTTP ${status}).`,
  );
}

function mapFromEasyPostRates(rates: EPRate[]): RateResult[] {
  return rates
    .filter((r) => r.carrier && r.service && r.rate)
    .map((rate) => {
      const providerCost = Number(parseFloat(rate.rate).toFixed(2));
      const pricing = applyMarkup(providerCost, 0);
      const days = rate.delivery_days ?? rate.est_delivery_days;
      const estimatedTime = days != null ? `${days} day(s)` : undefined;

      return {
        provider: "easypost" as const,
        providerRateId: rate.id,
        supportsLabels: false,
        serviceCode: rate.service ?? "",
        serviceName: rate.service ?? "",
        courierId: rate.carrier ?? "",
        courierName: rate.carrier ?? "",
        shippingSubtotal: providerCost,
        cashOnDeliveryCommission: 0,
        total: pricing.customerPrice,
        currency: "USD" as const,
        platformMarkup: pricing.platformMarkup,
        customerPrice: pricing.customerPrice,
        estimatedTime,
        deliveryDate: rate.delivery_date ?? undefined,
        pricing,
      };
    });
}

export class EasyPostAdapter implements LogisticsAdapter {
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.EASYPOST_API_KEY?.trim();
  }

  async getRates(input: RateInput): Promise<RateResult[]> {
    if (!this.apiKey) {
      throw new ProviderUnavailableError(
        "EasyPost is not configured: EASYPOST_API_KEY is missing.",
      );
    }

    const fromPostalCode = input.origin.postalCode?.trim() ?? "";
    const toPostalCode = input.destination.postalCode?.trim() ?? "";

    if (!fromPostalCode) {
      throw new InvalidAddressError(
        "origin.postalCode is required for EasyPost rates.",
      );
    }
    if (!toPostalCode) {
      throw new InvalidAddressError(
        "destination.postalCode is required for EasyPost rates.",
      );
    }
    if (!Number.isFinite(input.parcel.weight) || input.parcel.weight <= 0) {
      throw new InvalidPayloadError(
        "parcel.weight must be a positive number for EasyPost rates.",
      );
    }

    const weightOz = toOunces(input.parcel.weight, input.parcel.weightUnit);

    const fromAddress = buildEPAddress(
      input.origin.city ?? "",
      input.origin.state,
      fromPostalCode,
      input.origin.country,
    );
    const toAddress = buildEPAddress(
      input.destination.city ?? "",
      input.destination.state,
      toPostalCode,
      input.destination.country,
    );

    const parcel: EPParcel = { weight: weightOz };
    if (
      input.parcel.length != null && input.parcel.width != null &&
      input.parcel.height != null && input.parcel.length > 0 &&
      input.parcel.width > 0 && input.parcel.height > 0
    ) {
      parcel.length = toInches(input.parcel.length, input.parcel.dimensionUnit);
      parcel.width = toInches(input.parcel.width, input.parcel.dimensionUnit);
      parcel.height = toInches(input.parcel.height, input.parcel.dimensionUnit);
    }

    const body: EPShipmentPayload = {
      shipment: {
        from_address: fromAddress,
        to_address: toAddress,
        parcel,
      },
    };

    // Basic Auth: base64("apiKey:") — empty password per EasyPost docs.
    const credentials = Buffer.from(`${this.apiKey}:`).toString("base64");
    const authHeader = `Basic ${credentials}`;

    let response: Response;
    try {
      response = await fetch(`${EASYPOST_API_URL}/shipments`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderTimeoutError();
      }
      throw new ProviderUnavailableError(
        "Could not reach EasyPost. Check network connectivity.",
      );
    }

    if (!response.ok) {
      handleEasyPostHttpError(response.status);
    }

    let data: EPShipmentResponse;
    try {
      data = (await response.json()) as EPShipmentResponse;
    } catch {
      throw new ProviderUnavailableError("EasyPost returned an unreadable response.");
    }

    if (!Array.isArray(data.rates) || data.rates.length === 0) {
      throw new ProviderUnavailableError(
        "EasyPost returned no rates for the given addresses. " +
          "Verify postal codes, country, and that your EasyPost account has connected carriers.",
      );
    }

    const mapped = mapFromEasyPostRates(data.rates);
    if (mapped.length === 0) {
      throw new ProviderUnavailableError(
        "EasyPost returned rates but none could be parsed. Verify carrier and service data.",
      );
    }

    return mapped;
  }

  async createLabel(): Promise<LabelResult> {
    throw new ProviderUnavailableError(
      "EasyPost label creation is not yet implemented. Only rates are supported in this version.",
    );
  }

  async voidLabel(): Promise<VoidLabelResult> {
    throw new ProviderUnavailableError(
      "EasyPost void is not yet implemented.",
    );
  }
}

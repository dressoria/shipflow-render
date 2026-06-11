import { ProviderUnavailableError } from "@/lib/logistics/errors";
import {
  MEDIA_MAIL_ACTION_REQUIRED_MESSAGE,
  shouldBlockMediaMailRate,
} from "@/lib/logistics/mediaMail";
import type { CreateLabelInput, LabelResult, VoidLabelInput, VoidLabelResult } from "@/lib/logistics/types";

type ShipEngineLabelMoney = {
  amount?: string | number;
  currency?: string;
};

type ShipEngineLabelResponse = {
  label_id?: string;
  shipment_id?: string;
  tracking_number?: string;
  label_download?: {
    pdf?: string;
    href?: string;
    png?: string;
    zpl?: string;
  };
  carrier_code?: string;
  service_code?: string;
  shipment_cost?: ShipEngineLabelMoney;
  insurance_cost?: ShipEngineLabelMoney;
  status?: string;
  errors?: Array<{ message?: string; error_source?: string; error_type?: string }>;
  error_source?: string;
  error_type?: string;
  message?: string;
};

type ShipEngineVoidResponse = {
  approved?: boolean;
  message?: string;
  label_id?: string;
  status?: string;
};

type ShipEngineCarrier = {
  carrier_id?: string;
  carrier_code?: string;
  friendly_name?: string;
  disabled_by_billing_plan?: boolean;
};

type ShipEngineCarriersResponse = {
  carriers?: ShipEngineCarrier[];
};

type ShipEngineErrorResponse = {
  errors?: Array<{ message?: string; error_source?: string; error_type?: string }>;
  message?: string;
  error_source?: string;
  error_type?: string;
};

const FALLBACK_CARRIER_IDS: Record<string, string> = {
  usps: "se-5512692",
  ups: "se-5512693",
  globalpost: "se-5512694",
  fedex_walleted: "se-5512695",
};

let cachedCarrierIdByCode: Map<string, string> | null = null;

function readShipEngineConfig() {
  const mode = process.env.SHIPSTATION_API_MODE?.trim().toLowerCase();
  const apiKey = process.env.SHIPSTATION_API_KEY?.trim() ?? "";
  const baseUrl = (
    process.env.SHIPSTATION_BASE_URL?.trim() || "https://api.shipengine.com/v1"
  ).replace(/\/$/, "");

  if (mode !== "shipengine") {
    throw new ProviderUnavailableError(
      "ShipEngine label purchase requires SHIPSTATION_API_MODE=shipengine.",
    );
  }
  if (!apiKey) {
    throw new ProviderUnavailableError(
      "ShipEngine label purchase requires SHIPSTATION_API_KEY on the server.",
    );
  }
  if (!baseUrl.startsWith("https://")) {
    throw new ProviderUnavailableError("ShipEngine base URL must be an https:// URL.");
  }

  return { apiKey, baseUrl };
}

function moneyAmount(value?: ShipEngineLabelMoney): number {
  const amount = Number(value?.amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function labelUrlForFormat(data: ShipEngineLabelResponse, format: CreateLabelInput["labelFormat"]) {
  const downloads = data.label_download;
  if (!downloads) return null;
  if (format === "png") return downloads.png ?? downloads.href ?? null;
  if (format === "zpl") return downloads.zpl ?? downloads.href ?? null;
  return downloads.pdf ?? downloads.href ?? null;
}

function logIncompleteLabelResponse(data: ShipEngineLabelResponse) {
  console.error("[ShipEngineLabelIncompleteResponse]", {
    timestamp: new Date().toISOString(),
    providerLabelId: data.label_id ?? null,
    providerShipmentId: data.shipment_id ?? null,
    trackingNumber: data.tracking_number ?? null,
    status: data.status ?? null,
    hasLabelDownload: Boolean(data.label_download),
  });
}

function buildHeaders(apiKey: string, idempotencyKey?: string) {
  return {
    "API-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(idempotencyKey?.trim() ? { "Idempotency-Key": idempotencyKey.trim() } : {}),
  };
}

function parseShipEngineErrorMessage(
  body: ShipEngineErrorResponse | ShipEngineLabelResponse | null,
  fallback: string,
): string {
  const nested = body?.errors?.find((error) => error.message?.trim())?.message?.trim();
  if (nested) return nested;
  if (body?.message?.trim()) return body.message.trim();
  return fallback;
}

function isExpiredOrUnavailableRateMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("selected rate is no longer available") ||
    normalized.includes("rate is no longer available") ||
    normalized.includes("rate no longer available") ||
    normalized.includes("rate expired") ||
    normalized.includes("selected rate") && normalized.includes("not available")
  );
}

function buildDirectLabelPayload(input: CreateLabelInput, carrierId: string) {
  return {
    label_format: input.labelFormat ?? "pdf",
    label_layout: "4x6",
    label_download_type: "url",
    display_scheme: "label",
    shipment: {
      carrier_id: carrierId,
      service_code: input.serviceCode,
      validate_address: "no_validation",
      ship_to: {
        name: input.recipientName?.trim() || input.destination.name?.trim() || "Recipient",
        phone: input.recipientPhone?.trim() || input.destination.phone?.trim() || "5555555555",
        address_line1: input.destination.line1?.trim(),
        address_line2: input.destination.line2?.trim() || undefined,
        city_locality: input.destination.city.trim(),
        state_province: input.destination.state?.trim(),
        postal_code: input.destination.postalCode?.trim(),
        country_code: input.destination.country?.trim() || "US",
        address_residential_indicator: "yes",
      },
      ship_from: {
        name: input.senderName?.trim() || input.origin.name?.trim() || "Sender",
        phone: input.senderPhone?.trim() || input.origin.phone?.trim() || "5555555555",
        address_line1: input.origin.line1?.trim(),
        address_line2: input.origin.line2?.trim() || undefined,
        city_locality: input.origin.city.trim(),
        state_province: input.origin.state?.trim(),
        postal_code: input.origin.postalCode?.trim(),
        country_code: input.origin.country?.trim() || "US",
        address_residential_indicator: "no",
      },
      packages: [
        {
          weight: {
            value: input.parcel.weight,
            unit: input.parcel.weightUnit === "oz"
              ? "ounce"
              : input.parcel.weightUnit === "kg"
                ? "gram"
                : "pound",
          },
          dimensions: {
            length: input.parcel.length,
            width: input.parcel.width,
            height: input.parcel.height,
            unit: input.parcel.dimensionUnit === "cm" ? "centimeter" : "inch",
          },
        },
      ],
    },
  };
}

async function parseErrorBody(response: Response): Promise<ShipEngineErrorResponse | null> {
  try {
    return (await response.json()) as ShipEngineErrorResponse;
  } catch {
    return null;
  }
}

async function fetchCarrierId(config: ReturnType<typeof readShipEngineConfig>, carrierCode: string) {
  const normalizedCode = carrierCode.trim().toLowerCase();
  if (!normalizedCode) {
    throw new ProviderUnavailableError("ShipEngine direct label fallback requires a carrier code.");
  }

  if (cachedCarrierIdByCode?.has(normalizedCode)) {
    return cachedCarrierIdByCode.get(normalizedCode)!;
  }

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/carriers`, {
      method: "GET",
      headers: {
        "API-Key": config.apiKey,
        Accept: "application/json",
      },
    });
  } catch {
    const fallbackId = FALLBACK_CARRIER_IDS[normalizedCode];
    if (fallbackId) return fallbackId;
    throw new ProviderUnavailableError("Could not reach ShipEngine carriers endpoint.");
  }

  if (!response.ok) {
    const fallbackId = FALLBACK_CARRIER_IDS[normalizedCode];
    if (fallbackId) return fallbackId;
    throw new ProviderUnavailableError("ShipEngine could not resolve the requested carrier.");
  }

  let data: ShipEngineCarriersResponse;
  try {
    data = (await response.json()) as ShipEngineCarriersResponse;
  } catch {
    const fallbackId = FALLBACK_CARRIER_IDS[normalizedCode];
    if (fallbackId) return fallbackId;
    throw new ProviderUnavailableError("ShipEngine returned an unreadable carriers response.");
  }

  const nextCache = new Map<string, string>();
  for (const carrier of data.carriers ?? []) {
    const code = carrier.carrier_code?.trim().toLowerCase();
    const id = carrier.carrier_id?.trim();
    if (!code || !id || carrier.disabled_by_billing_plan === true) continue;
    nextCache.set(code, id);
  }
  cachedCarrierIdByCode = nextCache;

  return (
    nextCache.get(normalizedCode) ??
    FALLBACK_CARRIER_IDS[normalizedCode] ??
    (() => {
      throw new ProviderUnavailableError(`ShipEngine could not resolve carrier '${carrierCode}'.`);
    })()
  );
}

export class ShipEngineLabelAdapter {
  async createLabel(input: CreateLabelInput): Promise<LabelResult> {
    const config = readShipEngineConfig();
    if (!input.revalidatedRate) {
      throw new ProviderUnavailableError("ShipEngine label purchase requires a server-side revalidated rate.");
    }
    if (shouldBlockMediaMailRate(input.serviceCode, input.productType)) {
      throw new ProviderUnavailableError(MEDIA_MAIL_ACTION_REQUIRED_MESSAGE);
    }

    const providerRateId = input.providerRateId?.trim() || input.revalidatedRate.providerRateId?.trim();
    const canTryDirectFallback = Boolean(
      input.serviceCode?.trim() &&
      input.carrierCode?.trim() &&
      input.origin.line1?.trim() &&
      input.origin.postalCode?.trim() &&
      input.destination.line1?.trim() &&
      input.destination.postalCode?.trim(),
    );

    const attemptDirectFallback = async () => {
      if (!canTryDirectFallback) {
        throw new ProviderUnavailableError(
          "Selected rate is no longer available. Please refresh rates and try again.",
        );
      }

      const carrierId = await fetchCarrierId(config, input.carrierCode!);
      let directResponse: Response;
      try {
        directResponse = await fetch(`${config.baseUrl}/labels`, {
          method: "POST",
          headers: buildHeaders(config.apiKey, input.idempotencyKey),
          body: JSON.stringify(buildDirectLabelPayload(input, carrierId)),
        });
      } catch {
        throw new ProviderUnavailableError("Could not reach ShipEngine to purchase the label.");
      }

      if (!directResponse.ok) {
        const directError = await parseErrorBody(directResponse);
        throw new ProviderUnavailableError(
          parseShipEngineErrorMessage(
            directError,
            "The carrier could not generate this label. Please try another rate or contact support.",
          ),
        );
      }

      let data: ShipEngineLabelResponse;
      try {
        data = (await directResponse.json()) as ShipEngineLabelResponse;
      } catch {
        throw new ProviderUnavailableError("ShipEngine returned an unreadable label response.");
      }

      return data;
    };

    let data: ShipEngineLabelResponse;
    let purchaseMethod: "rate_id" | "direct_fallback" = "rate_id";
    if (!providerRateId) {
      purchaseMethod = "direct_fallback";
      data = await attemptDirectFallback();
    } else {
      let response: Response;
      try {
        response = await fetch(`${config.baseUrl}/labels/rates/${encodeURIComponent(providerRateId)}`, {
          method: "POST",
          headers: buildHeaders(config.apiKey, input.idempotencyKey),
          body: JSON.stringify({
            label_format: input.labelFormat ?? "pdf",
            label_layout: "4x6",
            display_scheme: "label",
          }),
        });
      } catch {
        throw new ProviderUnavailableError("Could not reach ShipEngine to purchase the label.");
      }

      if (!response.ok) {
        const errorBody = await parseErrorBody(response);
        const errorMessage = parseShipEngineErrorMessage(
          errorBody,
          "The carrier could not generate this label. Please try another rate or contact support.",
        );
        if (
          (response.status === 400 || response.status === 404 || response.status === 409) &&
          isExpiredOrUnavailableRateMessage(errorMessage)
        ) {
          purchaseMethod = "direct_fallback";
          data = await attemptDirectFallback();
        } else if (response.status === 400 || response.status === 404 || response.status === 409) {
          throw new ProviderUnavailableError(
            "Selected rate is no longer available. Please refresh rates and try again.",
          );
        } else if (response.status === 401 || response.status === 403) {
          throw new ProviderUnavailableError(
            "The carrier could not generate this label. Please try another rate or contact support.",
          );
        } else if (response.status === 429) {
          throw new ProviderUnavailableError(
            "The carrier is temporarily busy. Please try again later or choose another rate.",
          );
        } else {
          throw new ProviderUnavailableError(
            "The carrier could not generate this label. Please try another rate or contact support.",
          );
        }
      } else {
        try {
          data = (await response.json()) as ShipEngineLabelResponse;
        } catch {
          throw new ProviderUnavailableError("ShipEngine returned an unreadable label response.");
        }
      }
    }

    if (!data.label_id || !data.tracking_number) {
      logIncompleteLabelResponse(data);
      throw new ProviderUnavailableError(
        "The carrier returned an incomplete label response. Please contact support before trying again.",
      );
    }

    const providerCost = Number(
      (moneyAmount(data.shipment_cost) + moneyAmount(data.insurance_cost)).toFixed(2),
    );
    const rate = {
      ...input.revalidatedRate,
      shippingSubtotal: providerCost > 0 ? providerCost : input.revalidatedRate.shippingSubtotal,
      pricing: {
        ...input.revalidatedRate.pricing,
        providerCost: providerCost > 0 ? providerCost : input.revalidatedRate.pricing.providerCost,
      },
    };

    return {
      provider: "shipstation",
      trackingNumber: data.tracking_number,
      labelStatus: "purchased",
      labelUrl: labelUrlForFormat(data, input.labelFormat),
      labelData: null,
      rate,
      message: "ShipEngine sandbox label purchased successfully.",
      providerShipmentId: data.shipment_id ?? null,
      providerLabelId: data.label_id,
      providerServiceCode: data.service_code ?? input.serviceCode ?? null,
      purchaseMethod,
    };
  }

  async voidLabel(input: VoidLabelInput): Promise<VoidLabelResult> {
    const config = readShipEngineConfig();
    const providerLabelId = input.providerLabelId?.trim();
    if (!providerLabelId) {
      throw new ProviderUnavailableError("ShipEngine label void requires a provider label ID.");
    }

    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/labels/${encodeURIComponent(providerLabelId)}/void`, {
        method: "PUT",
        headers: {
          "API-Key": config.apiKey,
          Accept: "application/json",
        },
      });
    } catch {
      throw new ProviderUnavailableError("Could not reach ShipEngine to void the label.");
    }

    if (!response.ok) {
      if (response.status === 400 || response.status === 404 || response.status === 409) {
        throw new ProviderUnavailableError("The carrier could not void this label. Please contact support.");
      }
      if (response.status === 401 || response.status === 403) {
        throw new ProviderUnavailableError("The carrier could not void this label. Please contact support.");
      }
      if (response.status === 429) {
        throw new ProviderUnavailableError("The carrier is temporarily busy. Please try again later.");
      }
      throw new ProviderUnavailableError("The carrier could not void this label. Please contact support.");
    }

    let data: ShipEngineVoidResponse;
    try {
      data = (await response.json()) as ShipEngineVoidResponse;
    } catch {
      throw new ProviderUnavailableError("ShipEngine returned an unreadable void response.");
    }

    if (!data.approved) {
      throw new ProviderUnavailableError("The carrier could not void this label. Please contact support.");
    }

    return {
      provider: "shipstation",
      labelStatus: "voided",
      refunded: true,
      message: data.message ?? "Label voided successfully.",
      providerLabelId: data.label_id ?? providerLabelId,
      providerStatus: data.status ?? "voided",
    };
  }
}

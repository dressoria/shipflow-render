import { ProviderUnavailableError } from "@/lib/logistics/errors";
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
};

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

export class ShipEngineLabelAdapter {
  async createLabel(input: CreateLabelInput): Promise<LabelResult> {
    const config = readShipEngineConfig();
    const providerRateId = input.providerRateId?.trim() || input.revalidatedRate?.providerRateId?.trim();
    if (!providerRateId) {
      throw new ProviderUnavailableError("ShipEngine label purchase requires a revalidated rate ID.");
    }
    if (!input.revalidatedRate) {
      throw new ProviderUnavailableError("ShipEngine label purchase requires a server-side revalidated rate.");
    }

    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/labels/rates/${encodeURIComponent(providerRateId)}`, {
        method: "POST",
        headers: {
          "API-Key": config.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
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
      if (response.status === 400 || response.status === 404 || response.status === 409) {
        throw new ProviderUnavailableError(
          "Selected rate is no longer available. Please refresh rates and try again.",
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new ProviderUnavailableError(
          "The carrier could not generate this label. Please try another rate or contact support.",
        );
      }
      if (response.status === 429) {
        throw new ProviderUnavailableError(
          "The carrier is temporarily busy. Please try again later or choose another rate.",
        );
      }
      throw new ProviderUnavailableError(
        "The carrier could not generate this label. Please try another rate or contact support.",
      );
    }

    let data: ShipEngineLabelResponse;
    try {
      data = (await response.json()) as ShipEngineLabelResponse;
    } catch {
      throw new ProviderUnavailableError("ShipEngine returned an unreadable label response.");
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
    };
  }

  async voidLabel(input: VoidLabelInput): Promise<VoidLabelResult> {
    void input;
    throw new ProviderUnavailableError(
      "ShipEngine label void is not implemented yet.",
    );
  }
}

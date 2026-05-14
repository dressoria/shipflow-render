import { ProviderUnavailableError } from "@/lib/logistics/errors";
import type { LogisticsAdapter } from "@/lib/logistics/adapters/LogisticsAdapter";
import type {
  CreateLabelInput,
  LabelResult,
  RateInput,
  RateResult,
  TrackingInput,
  TrackingResult,
  VoidLabelInput,
  VoidLabelResult,
} from "@/lib/logistics/types";

function readShipStationConfig() {
  return {
    apiKey: process.env.SHIPSTATION_API_KEY?.trim(),
    apiSecret: process.env.SHIPSTATION_API_SECRET?.trim(),
    baseUrl: process.env.SHIPSTATION_BASE_URL?.trim(),
    webhookSecret: process.env.SHIPSTATION_WEBHOOK_SECRET?.trim(),
  };
}

export class ShipStationAdapter implements LogisticsAdapter {
  private assertConfigured(): never {
    const config = readShipStationConfig();
    if (!config.apiKey || !config.apiSecret || !config.baseUrl) {
      throw new ProviderUnavailableError("ShipStation is not configured on the server.");
    }

    throw new ProviderUnavailableError("ShipStation adapter is not implemented yet.");
  }

  async getRates(_input: RateInput): Promise<RateResult[]> {
    this.assertConfigured();
  }

  async createLabel(_input: CreateLabelInput): Promise<LabelResult> {
    this.assertConfigured();
  }

  async voidLabel(_input: VoidLabelInput): Promise<VoidLabelResult> {
    this.assertConfigured();
  }

  async trackShipment(_input: TrackingInput): Promise<TrackingResult> {
    this.assertConfigured();
  }
}

import { ProviderUnavailableError } from "@/lib/logistics/errors";
import type { LogisticsAdapter } from "@/lib/logistics/adapters/LogisticsAdapter";
import type {
  CreateLabelInput,
  LabelResult,
  RateInput,
  RateResult,
  VoidLabelInput,
  VoidLabelResult,
} from "@/lib/logistics/types";

// Shippo adapter — skeleton for future integration.
// Reads SHIPPO_API_KEY from environment; no real API calls yet.
// Activate by setting SHIPPO_API_KEY in .env.local and implementing methods.
export class ShippoAdapter implements LogisticsAdapter {
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.SHIPPO_API_KEY?.trim();
  }

  async getRates(_input: RateInput): Promise<RateResult[]> {
    throw new ProviderUnavailableError(
      "Shippo rates are not yet implemented. Set SHIPPO_API_KEY and implement ShippoAdapter.getRates().",
    );
  }

  async createLabel(_input: CreateLabelInput): Promise<LabelResult> {
    throw new ProviderUnavailableError(
      "Shippo labels are not yet implemented. Implement ShippoAdapter.createLabel().",
    );
  }

  async voidLabel(_input: VoidLabelInput): Promise<VoidLabelResult> {
    throw new ProviderUnavailableError(
      "Shippo void is not yet implemented. Implement ShippoAdapter.voidLabel().",
    );
  }
}

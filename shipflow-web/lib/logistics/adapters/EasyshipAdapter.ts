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

// Easyship adapter — skeleton for future integration.
// Reads EASYSHIP_API_KEY and EASYSHIP_BASE_URL from environment; no real API calls yet.
// Activate by setting env vars in .env.local and implementing methods.
export class EasyshipAdapter implements LogisticsAdapter {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.EASYSHIP_API_KEY?.trim();
    this.baseUrl = process.env.EASYSHIP_BASE_URL?.trim() ?? "https://api.easyship.com";
  }

  async getRates(_: RateInput): Promise<RateResult[]> {
    throw new ProviderUnavailableError(
      "Easyship rates are not yet implemented. Set EASYSHIP_API_KEY and implement EasyshipAdapter.getRates().",
    );
  }

  async createLabel(_: CreateLabelInput): Promise<LabelResult> {
    throw new ProviderUnavailableError(
      "Easyship labels are not yet implemented. Implement EasyshipAdapter.createLabel().",
    );
  }

  async voidLabel(_: VoidLabelInput): Promise<VoidLabelResult> {
    throw new ProviderUnavailableError(
      "Easyship void is not yet implemented. Implement EasyshipAdapter.voidLabel().",
    );
  }
}

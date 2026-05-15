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

// EasyPost adapter — skeleton for future integration.
// Reads EASYPOST_API_KEY from environment; no real API calls yet.
// Activate by setting EASYPOST_API_KEY in .env.local and implementing methods.
export class EasyPostAdapter implements LogisticsAdapter {
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.EASYPOST_API_KEY?.trim();
  }

  async getRates(_: RateInput): Promise<RateResult[]> {
    throw new ProviderUnavailableError(
      "EasyPost rates are not yet implemented. Set EASYPOST_API_KEY and implement EasyPostAdapter.getRates().",
    );
  }

  async createLabel(_: CreateLabelInput): Promise<LabelResult> {
    throw new ProviderUnavailableError(
      "EasyPost labels are not yet implemented. Implement EasyPostAdapter.createLabel().",
    );
  }

  async voidLabel(_: VoidLabelInput): Promise<VoidLabelResult> {
    throw new ProviderUnavailableError(
      "EasyPost void is not yet implemented. Implement EasyPostAdapter.voidLabel().",
    );
  }
}

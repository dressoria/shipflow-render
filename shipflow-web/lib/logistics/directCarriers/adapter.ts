import type { LogisticsAdapter } from "@/lib/logistics/adapters/LogisticsAdapter";
import type { CreateLabelInput, LabelResult, RateInput, RateResult, VoidLabelInput, VoidLabelResult } from "@/lib/logistics/types";
import { getDirectCarrierRates } from "@/lib/logistics/directCarriers/rates";
import type { DirectCarrier } from "@/lib/logistics/directCarriers/auth";

/** Read-only direct carrier quotes. Label payments remain explicitly disabled. */
export class DirectCarrierAdapter implements LogisticsAdapter {
  constructor(private readonly carrier: DirectCarrier) {}
  async getRates(input: RateInput): Promise<RateResult[]> {
    return getDirectCarrierRates(this.carrier, input);
  }
  async createLabel(_input: CreateLabelInput): Promise<LabelResult> {
    throw new Error(`${this.carrier.toUpperCase()} direct label purchase awaits carrier approval and sandbox certification.`);
  }
  async voidLabel(_input: VoidLabelInput): Promise<VoidLabelResult> {
    throw new Error(`${this.carrier.toUpperCase()} direct label void is not enabled.`);
  }
}

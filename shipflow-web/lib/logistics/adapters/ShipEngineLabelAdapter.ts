import { ProviderUnavailableError } from "@/lib/logistics/errors";
import type { CreateLabelInput, LabelResult, VoidLabelInput, VoidLabelResult } from "@/lib/logistics/types";

export function assertShipEngineLabelPurchaseNotImplemented(): never {
  throw new ProviderUnavailableError(
    "ShipEngine label purchase is not implemented yet. Rate comparison is available.",
  );
}

export class ShipEngineLabelAdapter {
  async createLabel(input: CreateLabelInput): Promise<LabelResult> {
    void input;
    assertShipEngineLabelPurchaseNotImplemented();
  }

  async voidLabel(input: VoidLabelInput): Promise<VoidLabelResult> {
    void input;
    throw new ProviderUnavailableError(
      "ShipEngine label void is not implemented yet.",
    );
  }
}

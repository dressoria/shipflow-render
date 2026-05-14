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

export interface LogisticsAdapter {
  getRates(input: RateInput): Promise<RateResult[]>;
  createLabel(input: CreateLabelInput): Promise<LabelResult>;
  voidLabel(input: VoidLabelInput): Promise<VoidLabelResult>;
  trackShipment?(input: TrackingInput): Promise<TrackingResult>;
}

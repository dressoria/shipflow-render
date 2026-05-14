import type { TrackingResult as AppTrackingResult } from "@/lib/types";

export type LogisticsProvider = "internal" | "mock" | "shipstation";

export type LogisticsServiceCode = string;

export type Address = {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type Parcel = {
  weight: number;
  weightUnit?: "lb" | "oz" | "kg";
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: "in" | "cm";
};

export type PricingBreakdown = {
  providerCost: number;
  platformMarkup: number;
  customerPrice: number;
  currency: "USD";
};

export type RateInput = {
  origin: Address;
  destination: Address;
  parcel: Parcel;
  courier?: string;
  cashOnDelivery?: boolean;
  cashAmount?: number;
};

export type RateResult = {
  provider: LogisticsProvider;
  serviceCode: LogisticsServiceCode;
  serviceName: string;
  courierId: string;
  courierName: string;
  shippingSubtotal: number;
  cashOnDeliveryCommission: number;
  total: number;
  currency: "USD";
  platformMarkup: number;
  customerPrice: number;
  estimatedTime?: string;
  pricing: PricingBreakdown;
};

export type CreateLabelInput = RateInput & {
  idempotencyKey: string;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  destinationAddress?: string;
  productType?: string;
};

export type LabelResult = {
  provider: LogisticsProvider;
  trackingNumber: string;
  labelStatus: "internal" | "pending" | "processing" | "purchased" | "failed" | "voided" | "refunded";
  labelUrl: string | null;
  rate: RateResult;
  message: string;
};

export type VoidLabelInput = {
  shipmentId: string;
  trackingNumber?: string;
  provider?: LogisticsProvider;
};

export type VoidLabelResult = {
  provider: LogisticsProvider;
  labelStatus: "voided";
  refunded: boolean;
  message: string;
};

export type TrackingInput = {
  trackingNumber: string;
  courier?: string;
  provider?: LogisticsProvider;
};

export type TrackingResult = AppTrackingResult;

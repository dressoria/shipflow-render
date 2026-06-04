import type { EcuadorQuoteInput } from "@/lib/ecuador/types";
import type {
  EcuadorProviderId,
  EcuadorProviderQuoteResult,
  EcuadorQuoteProvider,
  EcuadorQuoteProviderStatus,
} from "@/lib/ecuador/providers/types";

type PlaceholderReason = "integration_pending" | "contact_required";

export class PlaceholderEcuadorQuoteProvider implements EcuadorQuoteProvider {
  id: EcuadorProviderId;
  name: string;
  logoPath: string;
  status: EcuadorQuoteProviderStatus;
  supportsQuote: boolean;
  supportsBooking: boolean;
  reason: PlaceholderReason;

  constructor(args: {
    id: EcuadorProviderId;
    name: string;
    logoPath: string;
    status: EcuadorQuoteProviderStatus;
    supportsQuote?: boolean;
    supportsBooking?: boolean;
    reason: PlaceholderReason;
  }) {
    this.id = args.id;
    this.name = args.name;
    this.logoPath = args.logoPath;
    this.status = args.status;
    this.supportsQuote = args.supportsQuote ?? false;
    this.supportsBooking = args.supportsBooking ?? false;
    this.reason = args.reason;
  }

  async getQuote(input: EcuadorQuoteInput): Promise<EcuadorProviderQuoteResult> {
    void input;
    return {
      ok: false,
      providerId: this.id,
      providerName: this.name,
      reason: this.reason,
      userMessage: this.reason === "contact_required" ? "Pendiente de contacto" : "Integración en preparación",
      debugMessage: this.reason === "contact_required"
        ? `${this.name} requiere contacto comercial/técnico antes de habilitar cotización.`
        : `${this.name} todavía no tiene integración de cotización activa.`,
      source: "system",
    };
  }
}

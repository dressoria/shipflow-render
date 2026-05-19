import type { SupabaseClient } from "@supabase/supabase-js";
import { fromShipmentRow, type ShipmentRow } from "@/lib/server/shipments/createInternalShipment";
import type { AdminBalanceMovement, AdminShipment, AdminTotals } from "@/lib/services/apiClient";
import type { Usuario } from "@/lib/types";

type ProfileRow = {
  id: string;
  email: string;
  business_name?: string | null;
  role?: "user" | "admin" | string | null;
  created_at: string;
};

type BalanceMovementRow = {
  id: string;
  user_id?: string | null;
  concept: string;
  amount: number;
  type?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  shipment_id?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at: string;
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function parseAdminLimit(value: string | null, fallback = 100) {
  const limit = Number(value ?? fallback);
  if (!Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), 250);
}

export function maskProviderId(value?: string | null) {
  if (!value) return null;
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function profileToUser(row: ProfileRow): Usuario {
  return {
    id: row.id,
    email: row.email,
    businessName: row.business_name ?? undefined,
    role: row.role === "admin" ? "admin" : "user",
    createdAt: row.created_at,
  };
}

export async function loadProfiles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,business_name,role,created_at")
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<ProfileRow[]>();

  if (error) throw error;

  const profiles = data ?? [];
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  return { profiles, byId, users: profiles.map(profileToUser) };
}

export function mapAdminShipment(row: ShipmentRow, profilesById: Map<string, ProfileRow>): AdminShipment {
  const shipment = fromShipmentRow(row);
  const profile = row.user_id ? profilesById.get(row.user_id) : null;

  return {
    ...shipment,
    userEmail: profile?.email ?? null,
    userName: profile?.business_name ?? null,
    providerLabelId: maskProviderId(shipment.providerLabelId),
    providerShipmentId: maskProviderId(shipment.providerShipmentId),
  };
}

function movementConcept(row: BalanceMovementRow) {
  const amount = Number(row.amount);
  const concept = row.concept.toLowerCase();
  const type =
    row.type ??
    (amount > 0 && /refund|void/.test(concept)
      ? "refund"
      : amount >= 0
        ? "recharge"
        : "debit");

  if (type === "debit") return "Carrier label purchase";
  if (type === "refund") return "Carrier label void refund";
  if (type === "recharge") return /test|manual/i.test(row.concept) ? "Test balance top-up" : "Payment recharge";
  if (type === "adjustment") return "Manual adjustment";
  if (type === "fee") return "Service fee";
  return row.concept;
}

export function mapAdminMovement(
  row: BalanceMovementRow,
  profilesById: Map<string, ProfileRow>,
  shipmentsById: Map<string, ShipmentRow>,
): AdminBalanceMovement {
  const profile = row.user_id ? profilesById.get(row.user_id) : null;
  const shipment = row.shipment_id ? shipmentsById.get(row.shipment_id) : null;
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    userEmail: profile?.email ?? null,
    concept: movementConcept(row),
    amount: Number(row.amount),
    date: row.created_at,
    type: row.type ?? null,
    referenceType: row.reference_type ?? null,
    referenceId: row.reference_id ?? null,
    shipmentId: row.shipment_id ?? null,
    trackingNumber: shipment?.tracking_number ?? null,
    reason: typeof metadata.reason === "string" ? metadata.reason : null,
    note: typeof metadata.note === "string" ? metadata.note : null,
    adminEmail: typeof metadata.adminEmail === "string" ? metadata.adminEmail : null,
  };
}

export function calculateAdminTotals(shipments: ShipmentRow[], movements: BalanceMovementRow[]): AdminTotals {
  const totals: AdminTotals = {
    totalUsers: 0,
    totalShipments: shipments.length,
    labelsPurchased: shipments.filter((shipment) => shipment.label_status === "purchased").length,
    labelsVoided: shipments.filter((shipment) => shipment.label_status === "voided").length,
    totalRecharged: 0,
    totalLabelSpend: 0,
    totalRefunded: 0,
  };

  for (const movement of movements) {
    const amount = Number(movement.amount);
    const type = movement.type ?? (amount >= 0 ? "recharge" : "debit");

    if (type === "recharge") totals.totalRecharged += Math.max(amount, 0);
    if (type === "debit") totals.totalLabelSpend += Math.abs(Math.min(amount, 0));
    if (type === "refund") totals.totalRefunded += Math.max(amount, 0);
  }

  return {
    ...totals,
    totalRecharged: roundMoney(totals.totalRecharged),
    totalLabelSpend: roundMoney(totals.totalLabelSpend),
    totalRefunded: roundMoney(totals.totalRefunded),
  };
}

export type { BalanceMovementRow, ProfileRow };

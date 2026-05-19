import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { getAvailableBalance } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

type BalanceMovementRow = {
  id: string;
  user_id?: string;
  concept: string;
  amount: number;
  type?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  shipment_id?: string | null;
  created_at: string;
};

type BalanceTotals = {
  totalRecharged: number;
  totalSpent: number;
  totalRefunded: number;
  totalAdjustments: number;
  totalFees: number;
};

function parseLimit(value: string | null) {
  const limit = Number(value ?? 10);
  if (!Number.isFinite(limit)) return 10;
  return Math.min(Math.max(Math.trunc(limit), 1), 50);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function calculateTotals(movements: BalanceMovementRow[]): BalanceTotals {
  const totals: BalanceTotals = {
    totalRecharged: 0,
    totalSpent: 0,
    totalRefunded: 0,
    totalAdjustments: 0,
    totalFees: 0,
  };

  for (const movement of movements) {
    const amount = Number(movement.amount);
    const concept = movement.concept.toLowerCase();
    const type =
      movement.type ??
      (amount > 0 && /refund|void/.test(concept)
        ? "refund"
        : amount >= 0
          ? "recharge"
          : "debit");

    if (type === "recharge") {
      totals.totalRecharged += Math.max(amount, 0);
    } else if (type === "debit") {
      totals.totalSpent += Math.abs(Math.min(amount, 0));
    } else if (type === "refund") {
      totals.totalRefunded += Math.max(amount, 0);
    } else if (type === "adjustment") {
      totals.totalAdjustments += amount;
    } else if (type === "fee") {
      totals.totalFees += Math.abs(amount);
    }
  }

  return {
    totalRecharged: roundMoney(totals.totalRecharged),
    totalSpent: roundMoney(totals.totalSpent),
    totalRefunded: roundMoney(totals.totalRefunded),
    totalAdjustments: roundMoney(totals.totalAdjustments),
    totalFees: roundMoney(totals.totalFees),
  };
}

function mapMovement(movement: BalanceMovementRow) {
  return {
    id: movement.id,
    userId: movement.user_id,
    concept: movement.concept,
    amount: Number(movement.amount),
    type: movement.type ?? null,
    referenceType: movement.reference_type ?? null,
    referenceId: movement.reference_id ?? null,
    shipmentId: movement.shipment_id ?? null,
    date: movement.created_at,
  };
}

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    const { supabase, user } = await requireVerifiedUser(request);
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const balance = await getAvailableBalance(supabase, user.id);

    const { data: recentMovements, error: recentMovementsError } = await supabase
      .from("balance_movements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<BalanceMovementRow[]>();

    if (recentMovementsError) throw recentMovementsError;

    const { data: allMovements, error: allMovementsError } = await supabase
      .from("balance_movements")
      .select("id,user_id,concept,amount,type,reference_type,reference_id,shipment_id,created_at")
      .eq("user_id", user.id)
      .returns<BalanceMovementRow[]>();

    if (allMovementsError) throw allMovementsError;

    const mappedMovements = (recentMovements ?? []).map(mapMovement);

    return apiSuccess({
      balance,
      availableBalance: balance,
      currency: "USD",
      totals: calculateTotals(allMovements ?? []),
      movements: mappedMovements,
      recentMovements: mappedMovements,
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load balance.");
  }
}

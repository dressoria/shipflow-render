import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { getAvailableBalance } from "@/lib/server/shipments/createInternalShipment";
import { isServerSupabaseConfigured, requireSupabaseUser } from "@/lib/server/supabaseServer";

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

function parseLimit(value: string | null) {
  const limit = Number(value ?? 10);
  if (!Number.isFinite(limit)) return 10;
  return Math.min(Math.max(Math.trunc(limit), 1), 50);
}

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Supabase is not configured on the server.", 503);
  }

  try {
    const { supabase, user } = await requireSupabaseUser(request);
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const balance = await getAvailableBalance(supabase, user.id);

    const { data: movements, error } = await supabase
      .from("balance_movements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<BalanceMovementRow[]>();

    if (error) throw error;

    return apiSuccess({
      balance,
      currency: "USD",
      recentMovements: (movements ?? []).map((movement) => ({
        id: movement.id,
        userId: movement.user_id,
        concept: movement.concept,
        amount: Number(movement.amount),
        type: movement.type ?? null,
        referenceType: movement.reference_type ?? null,
        referenceId: movement.reference_id ?? null,
        shipmentId: movement.shipment_id ?? null,
        date: movement.created_at,
      })),
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not load balance.");
  }
}

import { apiError, apiErrorFromUnknown, apiSuccess } from "@/lib/server/apiResponse";
import { requireAdminUser } from "@/lib/server/adminAuth";
import {
  loadProfiles,
  mapAdminMovement,
  type BalanceMovementRow,
  type ProfileRow,
} from "@/lib/server/adminSupport";
import { isServerSupabaseConfigured, isServiceRoleConfigured } from "@/lib/server/supabaseServer";

const MAX_ADJUSTMENT_ABS = 500;
const MAX_REASON_LENGTH = 160;
const MAX_NOTE_LENGTH = 500;

type AdjustmentBody = {
  userId?: unknown;
  userEmail?: unknown;
  amount?: unknown;
  reason?: unknown;
  note?: unknown;
  idempotencyKey?: unknown;
};

type ExistingBalanceRow = {
  amount: number;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeIdempotencyKey(value: unknown) {
  const raw = cleanText(value, 120);
  const key = raw || crypto.randomUUID();
  return `admin-adjustment:${key}`;
}

function parseAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return null;
  return Number(amount.toFixed(2));
}

function findTargetProfile(profiles: ProfileRow[], body: AdjustmentBody) {
  const userId = cleanText(body.userId, 120);
  const userEmail = cleanText(body.userEmail, 254).toLowerCase();

  if (userId) return profiles.find((profile) => profile.id === userId) ?? null;
  if (userEmail) return profiles.find((profile) => profile.email.toLowerCase() === userEmail) ?? null;
  return null;
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured || !isServiceRoleConfigured) {
    return apiError("Admin support is not configured correctly.", 503);
  }

  try {
    const { serviceSupabase, user: adminUser } = await requireAdminUser(request);
    const body = (await request.json().catch(() => null)) as AdjustmentBody | null;
    if (!body) return apiError("Invalid request body.", 400);

    const amount = parseAmount(body.amount);
    const reason = cleanText(body.reason, MAX_REASON_LENGTH);
    const note = cleanText(body.note, MAX_NOTE_LENGTH);
    const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey);

    if (amount == null) return apiError("Amount must be a valid number.", 400);
    if (amount === 0) return apiError("Amount cannot be zero.", 400);
    if (Math.abs(amount) > MAX_ADJUSTMENT_ABS) {
      return apiError(`Manual adjustment cannot exceed $${MAX_ADJUSTMENT_ABS.toFixed(2)} during beta.`, 400);
    }
    if (!reason) return apiError("Reason is required.", 400);

    const { profiles, byId: profilesById } = await loadProfiles(serviceSupabase);
    const targetProfile = findTargetProfile(profiles, body);
    if (!targetProfile) return apiError("Target user was not found.", 404);

    const { data: existing, error: existingError } = await serviceSupabase
      .from("balance_movements")
      .select("id,user_id,concept,amount,type,reference_type,reference_id,shipment_id,idempotency_key,metadata,created_by,created_at")
      .eq("user_id", targetProfile.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle<BalanceMovementRow>();

    if (existingError) throw existingError;
    if (existing) {
      return apiSuccess({
        movement: mapAdminMovement(existing, profilesById, new Map()),
        existing: true,
      });
    }

    const { data: balanceRows, error: balanceError } = await serviceSupabase
      .from("balance_movements")
      .select("amount")
      .eq("user_id", targetProfile.id)
      .returns<ExistingBalanceRow[]>();

    if (balanceError) throw balanceError;

    const currentBalance = (balanceRows ?? []).reduce((sum, movement) => sum + Number(movement.amount), 0);
    const nextBalance = Number((currentBalance + amount).toFixed(2));
    if (nextBalance < 0) {
      return apiError("This adjustment would make the user's balance negative.", 400);
    }

    const now = new Date().toISOString();
    const metadata = {
      adminUserId: adminUser.id,
      adminEmail: adminUser.email ?? null,
      reason,
      note: note || null,
      createdFrom: "admin_panel",
      timestamp: now,
      balanceBefore: Number(currentBalance.toFixed(2)),
      balanceAfter: nextBalance,
    };

    const { data: inserted, error: insertError } = await serviceSupabase
      .from("balance_movements")
      .insert({
        user_id: targetProfile.id,
        concept: "Manual adjustment",
        amount,
        type: "adjustment",
        reference_type: "admin_manual_adjustment",
        reference_id: idempotencyKey,
        idempotency_key: idempotencyKey,
        created_by: adminUser.id,
        metadata,
      })
      .select("id,user_id,concept,amount,type,reference_type,reference_id,shipment_id,idempotency_key,metadata,created_by,created_at")
      .single<BalanceMovementRow>();

    if (insertError) throw insertError;

    return apiSuccess({
      movement: mapAdminMovement(inserted, profilesById, new Map()),
      existing: false,
    }, 201);
  } catch (error) {
    return apiErrorFromUnknown(error, "We could not create this balance adjustment.");
  }
}

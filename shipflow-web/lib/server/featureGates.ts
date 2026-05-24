// FASE 5.40C — Feature gates for label payment and purchase features.
//
// Gate logic:
//   1. If global flag false  → denied for all users (feature_disabled, 503).
//   2. If global flag true + allowlist empty:
//       - production: denied (no_allowlist_in_production, 403). Safe default —
//         prevents accidental global activation when no allowlist is configured.
//       - development/test: allowed. Local QA without having to configure allowlists.
//   3. If global flag true + user is in allowlist → allowed.
//
// Allowlists are comma-separated emails or user IDs in env vars (server-only).
// Never expose allowlist contents in API responses.
//
// Env vars per feature:
//   ENABLE_DIRECT_LABEL_PAYMENT          / DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS   / DIRECT_LABEL_PAYMENT_ALLOWED_USER_IDS
//   ENABLE_REAL_LABEL_PURCHASE           / REAL_LABEL_PURCHASE_ALLOWED_EMAILS    / REAL_LABEL_PURCHASE_ALLOWED_USER_IDS
//   ENABLE_REAL_LABEL_VOID               / REAL_LABEL_VOID_ALLOWED_EMAILS        / REAL_LABEL_VOID_ALLOWED_USER_IDS
//   ENABLE_PROCESS_LABEL_IN_WEBHOOK      / PROCESS_LABEL_IN_WEBHOOK_ALLOWED_EMAILS / PROCESS_LABEL_IN_WEBHOOK_ALLOWED_USER_IDS
//   ENABLE_LABEL_PAYMENT_REFUNDS         / LABEL_PAYMENT_REFUND_ALLOWED_EMAILS   / LABEL_PAYMENT_REFUND_ALLOWED_USER_IDS

type UserRef = { email?: string | null; id?: string | null };

export type GateResult = {
  allowed: boolean;
  reason: "allowed" | "feature_disabled" | "not_in_allowlist" | "no_allowlist_in_production";
  httpStatus: 200 | 403 | 503;
  message: string;
};

export function parseAllowlistEnv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function isAllowlistEmpty(emailEnv: string | undefined, userIdEnv: string | undefined): boolean {
  return (
    parseAllowlistEnv(emailEnv).length === 0 &&
    parseAllowlistEnv(userIdEnv).length === 0
  );
}

export function isUserAllowedByEnv(
  user: UserRef,
  emailEnv: string | undefined,
  userIdEnv: string | undefined,
): boolean {
  const emailList = parseAllowlistEnv(emailEnv);
  const idList = parseAllowlistEnv(userIdEnv);
  const emailMatch = user.email != null &&
    emailList.includes(user.email.trim().toLowerCase());
  const idMatch = user.id != null &&
    idList.includes(user.id.trim().toLowerCase());
  return emailMatch || idMatch;
}

function evaluateGate(
  flagEnabled: boolean,
  user: UserRef,
  emailEnv: string | undefined,
  userIdEnv: string | undefined,
  featureName: string,
): GateResult {
  if (!flagEnabled) {
    return {
      allowed: false,
      reason: "feature_disabled",
      httpStatus: 503,
      message: `${featureName} is not enabled yet.`,
    };
  }

  if (isAllowlistEmpty(emailEnv, userIdEnv)) {
    if (isProduction()) {
      return {
        allowed: false,
        reason: "no_allowlist_in_production",
        httpStatus: 403,
        message: `${featureName} is not available for this account yet.`,
      };
    }
    // Development/test: no allowlist configured → allow all (for local QA).
    return { allowed: true, reason: "allowed", httpStatus: 200, message: "" };
  }

  if (!isUserAllowedByEnv(user, emailEnv, userIdEnv)) {
    return {
      allowed: false,
      reason: "not_in_allowlist",
      httpStatus: 403,
      message: `${featureName} is not available for this account yet.`,
    };
  }

  return { allowed: true, reason: "allowed", httpStatus: 200, message: "" };
}

export function canUseDirectLabelPayment(user: UserRef): GateResult {
  return evaluateGate(
    process.env.ENABLE_DIRECT_LABEL_PAYMENT === "true",
    user,
    process.env.DIRECT_LABEL_PAYMENT_ALLOWED_EMAILS,
    process.env.DIRECT_LABEL_PAYMENT_ALLOWED_USER_IDS,
    "Direct label payment",
  );
}

export function canPurchaseRealLabel(user: UserRef): GateResult {
  return evaluateGate(
    process.env.ENABLE_REAL_LABEL_PURCHASE === "true",
    user,
    process.env.REAL_LABEL_PURCHASE_ALLOWED_EMAILS,
    process.env.REAL_LABEL_PURCHASE_ALLOWED_USER_IDS,
    "Real label purchase",
  );
}

export function canVoidRealLabel(user: UserRef): GateResult {
  return evaluateGate(
    process.env.ENABLE_REAL_LABEL_VOID === "true",
    user,
    process.env.REAL_LABEL_VOID_ALLOWED_EMAILS,
    process.env.REAL_LABEL_VOID_ALLOWED_USER_IDS,
    "Label void",
  );
}

// For the webhook, user context may not be available directly. Use
// canProcessLabelInWebhookForUserId when the pending order owner must be resolved.
export function canProcessLabelInWebhook(user?: UserRef): GateResult {
  return evaluateGate(
    process.env.ENABLE_PROCESS_LABEL_IN_WEBHOOK === "true",
    user ?? {},
    process.env.PROCESS_LABEL_IN_WEBHOOK_ALLOWED_EMAILS,
    process.env.PROCESS_LABEL_IN_WEBHOOK_ALLOWED_USER_IDS,
    "Inline label purchase in webhook",
  );
}

export function canRefundLabelPayment(user: UserRef): GateResult {
  return evaluateGate(
    process.env.ENABLE_LABEL_PAYMENT_REFUNDS === "true",
    user,
    process.env.LABEL_PAYMENT_REFUND_ALLOWED_EMAILS,
    process.env.LABEL_PAYMENT_REFUND_ALLOWED_USER_IDS,
    "Label payment refunds",
  );
}

export function assertDirectLabelPaymentAllowed(user: UserRef): void {
  const gate = canUseDirectLabelPayment(user);
  if (!gate.allowed) {
    const error = new Error(gate.message);
    (error as Error & { httpStatus?: number; gateReason?: string }).httpStatus = gate.httpStatus;
    (error as Error & { httpStatus?: number; gateReason?: string }).gateReason = gate.reason;
    throw error;
  }
}

export function assertRealLabelPurchaseAllowed(user: UserRef): void {
  const gate = canPurchaseRealLabel(user);
  if (!gate.allowed) {
    const error = new Error(gate.message);
    (error as Error & { httpStatus?: number; gateReason?: string }).httpStatus = gate.httpStatus;
    (error as Error & { httpStatus?: number; gateReason?: string }).gateReason = gate.reason;
    throw error;
  }
}

export function assertLabelPaymentRefundAllowed(user: UserRef): void {
  const gate = canRefundLabelPayment(user);
  if (!gate.allowed) {
    const error = new Error(gate.message);
    (error as Error & { httpStatus?: number; gateReason?: string }).httpStatus = gate.httpStatus;
    (error as Error & { httpStatus?: number; gateReason?: string }).gateReason = gate.reason;
    throw error;
  }
}

export async function resolveUserEmailById(userId: string): Promise<string | null> {
  const { createServiceSupabaseClient } = await import("@/lib/server/supabaseServer");
  const client = createServiceSupabaseClient();
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error) {
    console.error("[FeatureGateUserLookupFailed]", {
      userId,
      message: error.message,
    });
    return null;
  }
  return data.user?.email ?? null;
}

export async function canPurchaseRealLabelForUserId(userId: string): Promise<GateResult> {
  const email = await resolveUserEmailById(userId);
  return canPurchaseRealLabel({ id: userId, email });
}

export async function canProcessLabelInWebhookForUserId(userId: string): Promise<GateResult> {
  const email = await resolveUserEmailById(userId);
  return canProcessLabelInWebhook({ id: userId, email });
}

// FASE 5.40C — Rate limiting for label checkout.
//
// Strategy:
//   1. When the label_checkout_attempts table exists (migration applied), use DB-backed limits
//      so they work across multiple server instances.
//   2. When the table is missing:
//      - Development/test: fall back to in-memory map (single-instance only, documented limitation).
//      - Production: log a warning and allow. Do NOT block production traffic due to a missing
//        optional rate-limit table. Apply the migration to enable DB-based limits.
//
// Limits (initial):
//   - 5 attempts per user per 10 minutes.
//   - 20 attempts per IP hash per 10 minutes.
//
// IP address is stored only as a SHA-256 hash (never in plain text).
// Hash is keyed with INTERNAL_API_SECRET if available (recommended in production).

import crypto from "crypto";

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_USER = 5;
const MAX_PER_IP = 20;

// In-memory fallback store. Only effective for single-instance dev servers.
const inMemoryAttempts = new Map<string, number[]>();

function now(): number {
  return Date.now();
}

function inMemoryBucket(key: string): number[] {
  const existing = inMemoryAttempts.get(key) ?? [];
  const cutoff = now() - WINDOW_MS;
  const valid = existing.filter((t) => t > cutoff);
  inMemoryAttempts.set(key, valid);
  return valid;
}

export function hashIp(ip: string): string {
  const secret = process.env.INTERNAL_API_SECRET?.trim() ?? "";
  return crypto
    .createHash("sha256")
    .update(ip + secret)
    .digest("hex");
}

function extractIp(request?: Request): string | null {
  if (!request) return null;
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export class RateLimitError extends Error {
  readonly httpStatus = 429 as const;
  constructor(message = "Too many label checkout attempts. Please try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

// DB-backed check using label_checkout_attempts table.
// Returns false if the table doesn't exist (missing migration).
async function checkDbRateLimit(opts: {
  userId: string;
  email: string | null;
  ipHash: string | null;
  supabase: import("@supabase/supabase-js").SupabaseClient;
}): Promise<{ rateLimited: boolean; tableExists: boolean }> {
  const cutoff = new Date(now() - WINDOW_MS).toISOString();

  try {
    // Count recent attempts by user.
    const { count: userCount, error: userError } = await opts.supabase
      .from("label_checkout_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", opts.userId)
      .gte("created_at", cutoff);

    if (userError) {
      // 42P01 = relation does not exist.
      if (userError.code === "42P01" || userError.message?.includes("label_checkout_attempts")) {
        return { rateLimited: false, tableExists: false };
      }
      throw userError;
    }

    if ((userCount ?? 0) >= MAX_PER_USER) {
      return { rateLimited: true, tableExists: true };
    }

    // Count recent attempts by IP hash.
    if (opts.ipHash) {
      const { count: ipCount, error: ipError } = await opts.supabase
        .from("label_checkout_attempts")
        .select("*", { count: "exact", head: true })
        .eq("ip_hash", opts.ipHash)
        .gte("created_at", cutoff);

      if (ipError && ipError.code !== "42P01") throw ipError;

      if ((ipCount ?? 0) >= MAX_PER_IP) {
        return { rateLimited: true, tableExists: true };
      }
    }

    // Record this attempt.
    await opts.supabase.from("label_checkout_attempts").insert({
      user_id: opts.userId,
      email: opts.email ?? null,
      ip_hash: opts.ipHash ?? null,
      purpose: "label_checkout",
    });

    return { rateLimited: false, tableExists: true };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("42P01") || err.message.includes("label_checkout_attempts"))
    ) {
      return { rateLimited: false, tableExists: false };
    }
    throw err;
  }
}

// In-memory fallback for development when the DB table doesn't exist.
function checkInMemoryRateLimit(userId: string, ipHash: string | null): boolean {
  const userBucket = inMemoryBucket(`user:${userId}`);
  if (userBucket.length >= MAX_PER_USER) return true;

  if (ipHash) {
    const ipBucket = inMemoryBucket(`ip:${ipHash}`);
    if (ipBucket.length >= MAX_PER_IP) return true;
    ipBucket.push(now());
    inMemoryAttempts.set(`ip:${ipHash}`, ipBucket);
  }

  userBucket.push(now());
  inMemoryAttempts.set(`user:${userId}`, userBucket);
  return false;
}

// Call this before creating a Stripe Checkout Session.
// Throws RateLimitError if the limit is exceeded.
// Requires the Supabase service_role client to write to label_checkout_attempts.
export async function assertLabelCheckoutRateLimit(opts: {
  userId: string;
  email: string | null;
  request?: Request;
  supabase: import("@supabase/supabase-js").SupabaseClient;
}): Promise<void> {
  const rawIp = extractIp(opts.request);
  const ipHash = rawIp ? hashIp(rawIp) : null;

  let dbResult: { rateLimited: boolean; tableExists: boolean };
  try {
    dbResult = await checkDbRateLimit({
      userId: opts.userId,
      email: opts.email ?? null,
      ipHash,
      supabase: opts.supabase,
    });
  } catch (err) {
    // Unexpected DB error — log and allow (do not block checkout due to rate-limit infra failure).
    console.error("[RateLimitCheckFailed]", {
      userId: opts.userId,
      error: err instanceof Error ? err.message : String(err ?? "unknown"),
    });
    return;
  }

  if (dbResult.tableExists) {
    if (dbResult.rateLimited) {
      throw new RateLimitError();
    }
    return;
  }

  // Table doesn't exist — fall back to in-memory in dev, log + allow in production.
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[RateLimitMissingTable] label_checkout_attempts table not found. " +
        "Apply supabase/migrations/20260524_add_label_checkout_rate_limits.sql to enable DB-based rate limiting.",
    );
    return;
  }

  // Development in-memory fallback (single-instance only).
  if (checkInMemoryRateLimit(opts.userId, ipHash)) {
    throw new RateLimitError();
  }
}

/**
 * Direct-carrier OAuth bootstrap for SendiFlash.
 * Server-only: never import into a client component or expose credentials via NEXT_PUBLIC_.
 * Authentication alone does NOT authorize resale of postage or label purchases.
 */
import "server-only";

export type DirectCarrier = "ups" | "fedex" | "usps";
type CachedToken = { token: string; expiresAt: number };
const cache = new Map<string, CachedToken>();

function configured(carrier: DirectCarrier): { id: string; secret: string } {
  const prefix = carrier.toUpperCase();
  const id = process.env[`${prefix}_CLIENT_ID`]?.trim();
  const secret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
  if (!id || !secret) throw new Error(`${prefix} credentials are not configured.`);
  return { id, secret };
}

export function directCarrierConfigured(carrier: DirectCarrier): boolean {
  const prefix = carrier.toUpperCase();
  return Boolean(process.env[`${prefix}_CLIENT_ID`]?.trim() && process.env[`${prefix}_CLIENT_SECRET`]?.trim());
}

function environment(): "sandbox" | "production" {
  // Default to sandbox so absence of configuration cannot enable production traffic.
  return process.env.DIRECT_CARRIER_ENV === "production" ? "production" : "sandbox";
}

export function carrierApiBase(carrier: DirectCarrier): string {
  const live = environment() === "production";
  if (carrier === "ups") return live ? "https://onlinetools.ups.com" : "https://wwwcie.ups.com";
  if (carrier === "fedex") return live ? "https://apis.fedex.com" : "https://apis-sandbox.fedex.com";
  return live ? "https://apis.usps.com" : "https://apis-tem.usps.com";
}

export async function getDirectCarrierToken(carrier: DirectCarrier): Promise<string> {
  if (process.env.ENABLE_DIRECT_CARRIER_API !== "true") {
    throw new Error("Direct carrier API is disabled.");
  }
  const { id, secret } = configured(carrier);
  const key = `${carrier}:${environment()}:${id}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now + 60000) return cached.token;

  let url: string;
  let headers: HeadersInit;
  let body: string;

  if (carrier === "ups") {
    url = `${carrierApiBase(carrier)}/security/v1/oauth/token`;
    headers = {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };
    body = new URLSearchParams({ grant_type: "client_credentials" }).toString();
  } else if (carrier === "fedex") {
    url = `${carrierApiBase(carrier)}/oauth/token`;
    headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const form = new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret });
    // Integrator/child-account flows are distinct; obtain provider approval before enabling those.
    body = form.toString();
  } else {
    url = `${carrierApiBase(carrier)}/oauth2/v3/token`;
    headers = { "Content-Type": "application/json" };
    body = JSON.stringify({ grant_type: "client_credentials", client_id: id, client_secret: secret });
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    // Never include raw provider responses: they may contain private account metadata.
    throw new Error(`${carrier.toUpperCase()} OAuth failed (HTTP ${response.status}).`);
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("access_token" in data) ||
      typeof data.access_token !== "string" || data.access_token.length < 10) {
    throw new Error(`${carrier.toUpperCase()} returned an invalid OAuth token.`);
  }
  const expires = "expires_in" in data ? Number(data.expires_in) : 3600;
  cache.set(key, {
    token: data.access_token,
    expiresAt: now + Math.max(60, Number.isFinite(expires) ? expires : 3600) * 1000,
  });
  return data.access_token;
}

import { isSupabaseConfigured } from "@/lib/supabase";

// Legacy localStorage keys used by the pre-Supabase demo/local auth system.
const LEGACY_KEYS = [
  "shipflow-user",
  "shipflow-users",
  "shipflow-balance",
  "shipflow-balance-movements",
  "shipflow-shipments",
];

// Remove all legacy localStorage auth/data keys.
// Never touches Supabase-owned sb-* keys.
// Safe to call during SSR (no-op when window is undefined).
export function clearLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) {
    window.localStorage.removeItem(key);
  }
}

// Demo/local auth is only allowed in local development with an explicit opt-in env var
// and only when Supabase is not configured.
// In production builds (NODE_ENV === "production") this always returns false — the
// bundler inlines the constant and dead-strips the demo code paths entirely.
export function isDemoAuthEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH !== "true") return false;
  return !isSupabaseConfigured;
}

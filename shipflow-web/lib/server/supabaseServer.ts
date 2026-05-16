import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("https://") &&
    supabaseAnonKey.length > 20,
);

export const isServiceRoleConfigured = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()?.length,
);

export function createServiceSupabaseClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!isServerSupabaseConfigured || !supabaseUrl || !serviceRoleKey) {
    const base = !isServerSupabaseConfigured ? `${getSupabaseConfigDiagnostic()}` : "Missing: SUPABASE_SERVICE_ROLE_KEY";
    throw new Error(`Supabase service role is not configured on the server. ${base}`);
  }
  // Service role client: bypasses RLS. Only for server-side atomic RPC calls.
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function getSupabaseConfigDiagnostic(): string {
  const missing: string[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  else if (!url.startsWith("https://")) missing.push("NEXT_PUBLIC_SUPABASE_URL (must start with https://)");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  else if (key.length <= 20) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (value too short)");
  return missing.length > 0 ? `Missing or invalid: ${missing.join(", ")}` : "Check .env.local";
}

export function createUserSupabaseClient(token: string): SupabaseClient {
  if (!isServerSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    throw new Error(`Supabase is not configured on the server. ${getSupabaseConfigDiagnostic()}`);
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function requireSupabaseUser(request: Request): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const token = readBearerToken(request);
  if (!token) {
    throw new Response("Missing authorization token.", { status: 401 });
  }

  const supabase = createUserSupabaseClient(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Response("Invalid authorization token.", { status: 401 });
  }

  return { supabase, user: data.user };
}

export async function requireVerifiedUser(request: Request): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const result = await requireSupabaseUser(request);
  if (!result.user.email_confirmed_at) {
    throw new Response("EMAIL_NOT_VERIFIED", { status: 403 });
  }
  return result;
}

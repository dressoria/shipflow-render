import type { SupabaseClient, User } from "@supabase/supabase-js";
import { canUsePrepBetaEmail, normalizePrepAccessEmail, PREP_UNAVAILABLE_MESSAGE } from "@/lib/prepAccess";

type ProfileRoleRow = {
  role?: string | null;
};

function isAdminEmailAllowlisted(email?: string | null) {
  const normalizedEmail = normalizePrepAccessEmail(email);
  if (!normalizedEmail) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((candidate) => normalizePrepAccessEmail(candidate))
    .filter(Boolean)
    .includes(normalizedEmail);
}

export async function canUsePrepBetaServer(supabase: SupabaseClient, user: User) {
  if (canUsePrepBetaEmail(user.email) || isAdminEmailAllowlisted(user.email)) return true;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<ProfileRoleRow>();

  if (error) throw error;
  return data?.role === "admin";
}

export async function requirePrepBetaAccess(supabase: SupabaseClient, user: User) {
  if (await canUsePrepBetaServer(supabase, user)) return;
  throw new Response(PREP_UNAVAILABLE_MESSAGE, { status: 403 });
}

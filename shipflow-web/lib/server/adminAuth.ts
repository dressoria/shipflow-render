import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  createServiceSupabaseClient,
  requireVerifiedUser,
} from "@/lib/server/supabaseServer";
import { createAuditLog } from "@/lib/server/auditLog";

type ProfileRoleRow = {
  role?: string | null;
};

function getAdminEmailAllowlist() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdminUser(request: Request): Promise<{
  serviceSupabase: SupabaseClient;
  user: User;
}> {
  const { supabase, user } = await requireVerifiedUser(request);
  const email = user.email?.trim().toLowerCase() ?? "";
  const allowedEmails = getAdminEmailAllowlist();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<ProfileRoleRow>();

  if (error) throw error;

  const isProfileAdmin = profile?.role === "admin";
  const isAllowlisted = Boolean(email && allowedEmails.includes(email));

  if (!isProfileAdmin && !isAllowlisted) {
    await createAuditLog({
      actorUserId: user.id,
      actorEmail: user.email ?? null,
      userId: user.id,
      eventType: "admin_access_denied",
      severity: "warning",
      entityType: "auth",
      entityId: user.id,
      message: "Non-admin user attempted to access admin support.",
      metadata: {
        profileRole: profile?.role ?? null,
      },
    });
    throw new Response("Admin access required.", { status: 403 });
  }

  return {
    serviceSupabase: createServiceSupabaseClient(),
    user,
  };
}

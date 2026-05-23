import { apiSuccess, apiErrorFromUnknown } from "@/lib/server/apiResponse";
import { isServerSupabaseConfigured, readBearerToken, createUserSupabaseClient } from "@/lib/server/supabaseServer";

// GET /api/auth/me
// Returns who is actually authenticated server-side for the current Bearer token.
// Safe for debugging production sessions without exposing tokens or secrets.
// Returns only: authenticated, id, email, emailVerified.
export async function GET(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiSuccess({ authenticated: false });
  }

  const token = readBearerToken(request);
  if (!token) {
    return apiSuccess({ authenticated: false });
  }

  try {
    const supabase = createUserSupabaseClient(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return apiSuccess({ authenticated: false });
    }
    return apiSuccess({
      authenticated: true,
      id: data.user.id,
      email: data.user.email ?? null,
      emailVerified: Boolean(data.user.email_confirmed_at),
    });
  } catch (error) {
    return apiErrorFromUnknown(error, "Could not verify session.");
  }
}

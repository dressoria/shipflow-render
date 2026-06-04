import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { getEcuadorQuotes } from "@/lib/server/ecuadorQuotes";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    await requireVerifiedUser(request);
    const body = await request.json();
    const quotes = await getEcuadorQuotes(body);
    return apiSuccess(quotes);
  } catch (error) {
    return apiError(
      "No pudimos consultar operadores disponibles.",
      400,
      error instanceof Error ? error.message : "Error al consultar cotizaciones Ecuador.",
    );
  }
}

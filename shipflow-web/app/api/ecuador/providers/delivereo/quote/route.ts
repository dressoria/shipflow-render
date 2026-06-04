import { apiError, apiSuccess } from "@/lib/server/apiResponse";
import { getDelivereoQuoteForEcuador } from "@/lib/server/ecuadorQuotes";
import { isServerSupabaseConfigured, requireVerifiedUser } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured) {
    return apiError("Server is not configured correctly.", 503);
  }

  try {
    await requireVerifiedUser(request);
    const body = await request.json();
    const quote = await getDelivereoQuoteForEcuador(body);
    if (!quote) {
      return apiError("No pudimos consultar Delivereo.", 404, "Delivereo no devolvió resultado en el engine multicourier.");
    }
    return apiSuccess({
      result: quote,
      beta: true,
      message: "Resultado Delivereo obtenido desde el engine multicourier.",
    });
  } catch (error) {
    return apiError(
      "No pudimos consultar Delivereo.",
      400,
      error instanceof Error ? error.message : "Error en wrapper Delivereo.",
    );
  }
}

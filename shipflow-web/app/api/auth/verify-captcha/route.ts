import { apiError, apiSuccess } from "@/lib/server/apiResponse";

export const runtime = "nodejs";

type CaptchaVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
};

export async function POST(request: Request) {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim() || process.env.RECAPTCHA_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProduction) {
      return apiError("Signup protection is not configured.", 503);
    }
    console.warn("[Captcha] reCAPTCHA secret not configured; allowing signup in non-production.");
    return apiSuccess({ verified: true, skipped: true });
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    return apiError("Invalid captcha request.", 400);
  }

  if (!token) {
    return apiError("Captcha verification is required.", 400);
  }

  const formData = new URLSearchParams();
  formData.set("secret", secret);
  formData.set("response", token);

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });

  if (!response.ok) {
    return apiError("Captcha verification provider is unavailable.", 503);
  }

  const result = (await response.json()) as CaptchaVerifyResponse;
  const score = typeof result.score === "number" ? result.score : 1;
  const actionOk = !result.action || result.action === "signup";
  if (!result.success || score < 0.5 || !actionOk) {
    return apiError("Captcha verification failed. Please try again.", 400);
  }

  return apiSuccess({ verified: true, score });
}

"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type EmailVerificationStatus = "no_session" | "verified" | "unverified";

export async function getEmailVerificationStatus(): Promise<EmailVerificationStatus> {
  if (!isSupabaseConfigured || !supabase) return "no_session";
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return "no_session";
  return data.user.email_confirmed_at ? "verified" : "unverified";
}

export async function resendVerificationEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("The service is not available right now.");
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const emailRedirectTo = `${base}/verifica-tu-correo`;
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });
  if (error) throw error;
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("The service is not available right now.");
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const redirectTo = `${base}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

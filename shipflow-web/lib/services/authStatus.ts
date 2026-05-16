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
    throw new Error("El servicio no está disponible en este momento.");
  }
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw error;
}

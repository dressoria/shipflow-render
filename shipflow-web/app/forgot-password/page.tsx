"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, PackageCheck } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { isEmail, required } from "@/lib/forms";
import { isSupabaseConfigured } from "@/lib/supabase";
import { sendPasswordResetEmail } from "@/lib/services/authStatus";

type Phase = "form" | "sent" | "error";

export default function ForgotPasswordPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setGeneralError(null);

    const form = new FormData(event.currentTarget);
    const email = required(form.get("email"));

    if (!email) { setFieldError("Enter your email address."); return; }
    if (!isEmail(email)) { setFieldError("Enter a valid email address."); return; }

    if (!isSupabaseConfigured) {
      setGeneralError("This service is not available right now. Please try again later.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      setPhase("sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const isRateLimit =
        msg.toLowerCase().includes("rate") ||
        msg.toLowerCase().includes("limit") ||
        msg.toLowerCase().includes("429");
      setGeneralError(
        isRateLimit
          ? "Please wait a few minutes before requesting another reset email."
          : "We could not send the reset email right now. Try again shortly.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="premium-grid grid min-h-screen place-items-center bg-[#12182B] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/90 p-8 shadow-2xl shadow-pink-500/10 backdrop-blur">
        <Link href="/" className="flex items-center gap-3 font-black text-slate-950">
          <span className="brand-glow grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF1493,#FF4FB3_58%,#FF73C6)] text-white">
            <PackageCheck className="h-5 w-5" />
          </span>
          <BrandName />
        </Link>

        {phase === "sent" ? (
          <div className="mt-8 flex flex-col items-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-green-50 text-green-500">
              <KeyRound className="h-8 w-8" />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Check your inbox</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If an account exists for that email address, we sent password reset instructions.
              Check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3]"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-col items-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-pink-50 text-pink-500">
                <KeyRound className="h-8 w-8" />
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Reset your password</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Enter your email and we will send you a link to set a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-4" noValidate>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="hello@store.com"
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-500/10"
                />
                {fieldError ? (
                  <span className="text-xs font-semibold text-red-600">{fieldError}</span>
                ) : null}
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Sending…" : "Send reset link"}
                {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </button>

              {generalError ? (
                <span className="text-sm font-semibold text-red-600">{generalError}</span>
              ) : null}
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Remember your password?{" "}
              <Link href="/login" className="font-bold text-[#FF1493]">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

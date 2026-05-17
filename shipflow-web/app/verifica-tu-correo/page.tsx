"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck, PackageCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { BrandName } from "@/components/BrandName";
import { supabase } from "@/lib/supabase";
import { getEmailVerificationStatus, resendVerificationEmail } from "@/lib/services/authStatus";

export default function VerificaTuCorreoPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email ?? null);
      // Already verified — go straight to dashboard
      if (user.email_confirmed_at) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  async function handleAlreadyVerified() {
    setCheckLoading(true);
    try {
      const status = await getEmailVerificationStatus();
      if (status === "verified") {
        router.replace("/crear-guia");
      } else if (status === "no_session") {
        router.replace("/login");
      } else {
        setResendError("Your email has not been verified yet. Check your inbox and spam folder.");
        setCheckLoading(false);
      }
    } catch {
      setResendError("We could not verify your status. Try again.");
      setCheckLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setResendState("loading");
    setResendError(null);
    try {
      await resendVerificationEmail(email);
      setResendState("sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "We could not resend the email.";
      const isRateLimit =
        msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("429");
      setResendError(
        isRateLimit
          ? "Wait a few minutes before requesting another email."
          : "If your email exists, we will send a new link.",
      );
      setResendState("error");
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

        <div className="mt-8 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-pink-50 text-pink-500">
            <MailCheck className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
            Verify your email
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We sent you a confirmation link. Check your inbox and spam folder.
          </p>
          {email ? (
            <p className="mt-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {email}
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid gap-3">
          <button
            onClick={handleAlreadyVerified}
            disabled={checkLoading}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {checkLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              "I already verified my email"
            )}
          </button>

          <button
            onClick={handleResend}
            disabled={resendState === "loading" || resendState === "sent"}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendState === "loading"
              ? "Sending..."
              : resendState === "sent"
                ? "Email sent"
                : "Resend verification email"}
          </button>
        </div>

        {resendState === "sent" ? (
          <p className="mt-4 text-center text-sm text-green-600 font-semibold">
            If your email exists, you will receive a new link shortly.
          </p>
        ) : null}

        {resendError ? (
          <p className="mt-4 text-center text-sm text-red-600 font-semibold">{resendError}</p>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-500">
          Have another account?{" "}
          <Link href="/login" className="font-bold text-[#FF1493]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

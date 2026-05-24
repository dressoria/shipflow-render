"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LogOut, MailCheck, PackageCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { BrandName } from "@/components/BrandName";
import { isEmail, required } from "@/lib/forms";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getEmailVerificationStatus, resendVerificationEmail } from "@/lib/services/authStatus";
import { logoutUser } from "@/lib/services/authService";

function VerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive from URL params at render time — no effect needed for static URL data
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");
  // ?resend=true → show email-input resend form even without an active session
  const resendMode = searchParams.get("resend") === "true";
  const urlError = errorParam
    ? errorDesc
      ? decodeURIComponent(errorDesc.replace(/\+/g, " "))
      : "The verification link is invalid or has expired. Request a new one."
    : null;

  const [email, setEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  // Start in "exchanging" state only when a ?code= is present and no error
  const [exchanging, setExchanging] = useState(!!code && !errorParam);
  // Resend-by-email form state (used when no session and ?resend=true)
  const [resendEmailInput, setResendEmailInput] = useState("");
  const [resendEmailError, setResendEmailError] = useState<string | null>(null);

  useEffect(() => {
    // Nothing to do if there is an error in the URL or Supabase is not configured
    if (errorParam || !isSupabaseConfigured || !supabase) return;

    // onAuthStateChange covers INITIAL_SESSION (current state) and SIGNED_IN (after PKCE exchange).
    // When ?code= is present, Supabase auto-exchanges it; SIGNED_IN fires with the verified user.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setExchanging(false);
      if (session?.user) {
        setEmail(session.user.email ?? null);
        if (session.user.email_confirmed_at) {
          router.replace("/dashboard");
        }
        return;
      }
      // No session — redirect to login unless a code is being exchanged or user explicitly
      // requested the resend form (?resend=true).
      if (!code && !resendMode) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [code, errorParam, resendMode, router]);

  async function handleAlreadyVerified() {
    setCheckLoading(true);
    setResendError(null);
    try {
      const status = await getEmailVerificationStatus();
      if (status === "verified") {
        router.replace("/dashboard");
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
        msg.toLowerCase().includes("rate") ||
        msg.toLowerCase().includes("limit") ||
        msg.toLowerCase().includes("429");
      setResendError(
        isRateLimit
          ? "Wait a few minutes before requesting another email."
          : "If your email exists, we will send a new link.",
      );
      setResendState("error");
    }
  }

  async function handleResendByEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendEmailError(null);
    const trimmed = required(resendEmailInput);
    if (!trimmed) { setResendEmailError("Enter your email address."); return; }
    if (!isEmail(trimmed)) { setResendEmailError("Enter a valid email address."); return; }
    setResendState("loading");
    try {
      await resendVerificationEmail(trimmed);
      setResendState("sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const isRateLimit =
        msg.toLowerCase().includes("rate") ||
        msg.toLowerCase().includes("limit") ||
        msg.toLowerCase().includes("429");
      setResendEmailError(
        isRateLimit
          ? "Wait a few minutes before requesting another email."
          : "If your email is registered and unverified, we will send a new link.",
      );
      setResendState("error");
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    try {
      await logoutUser();
    } finally {
      router.push("/login");
    }
  }

  if (exchanging) {
    return (
      <main className="premium-grid grid min-h-screen place-items-center bg-[#12182B] px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/90 p-8 text-center shadow-2xl shadow-pink-500/10 backdrop-blur">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-pink-500" />
          <p className="mt-4 font-black text-slate-950">Verifying your email…</p>
          <p className="mt-2 text-sm text-slate-500">Please wait a moment.</p>
        </div>
      </main>
    );
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
          {urlError ? (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {urlError}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              We sent you a confirmation link. Check your inbox and spam folder.
            </p>
          )}
          {email ? (
            <p className="mt-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {email}
            </p>
          ) : null}
        </div>

        {!urlError && (
          <>
            {/* No session + ?resend=true: show email input to request resend without logging in */}
            {!email && resendMode ? (
              <div className="mt-8">
                {resendState === "sent" ? (
                  <p className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-600">
                    If your email is registered and unverified, we sent a new verification link.
                  </p>
                ) : (
                  <form onSubmit={handleResendByEmail} className="grid gap-4" noValidate>
                    <label className="grid gap-2 text-sm font-bold text-slate-700">
                      Your email address
                      <input
                        type="email"
                        value={resendEmailInput}
                        onChange={(e) => setResendEmailInput(e.target.value)}
                        placeholder="hello@store.com"
                        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-500/10"
                      />
                      {resendEmailError ? (
                        <span className="text-xs font-semibold text-red-600">{resendEmailError}</span>
                      ) : null}
                    </label>
                    <button
                      type="submit"
                      disabled={resendState === "loading"}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {resendState === "loading" ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          Send verification link
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="mt-8 grid gap-3">
                <button
                  onClick={handleAlreadyVerified}
                  disabled={checkLoading}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {checkLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    "I already verified my email"
                  )}
                </button>

                <button
                  onClick={handleResend}
                  disabled={!email || resendState === "loading" || resendState === "sent"}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendState === "loading"
                    ? "Sending…"
                    : resendState === "sent"
                      ? "Email sent"
                      : "Resend verification email"}
                </button>
              </div>
            )}

            {resendState === "sent" && email ? (
              <p className="mt-4 text-center text-sm font-semibold text-green-600">
                If your email exists, you will receive a new link shortly.
              </p>
            ) : null}

            {resendError ? (
              <p className="mt-4 text-center text-sm font-semibold text-red-600">{resendError}</p>
            ) : null}
          </>
        )}

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-center text-sm text-slate-500">
            Have another account?{" "}
            <Link href="/login" className="font-bold text-[#FF1493]">
              Sign in
            </Link>
          </p>
          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-700 disabled:opacity-60"
          >
            <LogOut className="h-3.5 w-3.5" />
            {signOutLoading ? "Signing out…" : "Sign out and use another account"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function VerificaTuCorreoPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#12182B]">
          <RefreshCw className="h-8 w-8 animate-spin text-pink-500" />
        </main>
      }
    >
      <VerificationContent />
    </Suspense>
  );
}

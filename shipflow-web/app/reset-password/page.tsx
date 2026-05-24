"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, PackageCheck, RefreshCw } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Phase = "loading" | "ready" | "updating" | "success" | "error";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  const urlError = errorParam
    ? errorDesc
      ? decodeURIComponent(errorDesc.replace(/\+/g, " "))
      : "The reset link is invalid or has expired. Request a new one."
    : null;

  const [phase, setPhase] = useState<Phase>(code && !errorParam ? "loading" : errorParam ? "error" : "loading");
  const [formError, setFormError] = useState<string | null>(urlError);

  useEffect(() => {
    if (errorParam || !isSupabaseConfigured || !supabase) {
      void Promise.resolve("error" as Phase).then(setPhase);
      return;
    }

    // Supabase auto-exchanges the ?code= and fires PASSWORD_RECOVERY or SIGNED_IN.
    // INITIAL_SESSION fires first with whatever the current session state is.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setPhase("ready");
        return;
      }
      // Some Supabase versions fire SIGNED_IN instead of PASSWORD_RECOVERY for resets.
      if (event === "SIGNED_IN" && session?.user) {
        setPhase("ready");
        return;
      }
      // INITIAL_SESSION with no session and no code → nothing to do, show error
      if (event === "INITIAL_SESSION" && !session && !code) {
        setFormError("No reset session found. Request a new password reset link.");
        setPhase("error");
      }
    });

    return () => subscription.unsubscribe();
  }, [code, errorParam]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!supabase) return;

    const form = new FormData(event.currentTarget);
    const password = (form.get("password") as string | null)?.trim() ?? "";
    const confirm = (form.get("confirm") as string | null)?.trim() ?? "";

    if (!password) { setFormError("Enter a new password."); return; }
    if (password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setFormError("Passwords do not match."); return; }

    setPhase("updating");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError(error.message || "We could not update your password. Try again.");
      setPhase("ready");
      return;
    }
    setPhase("success");
    setTimeout(() => router.replace("/dashboard"), 2500);
  }

  if (phase === "loading") {
    return (
      <main className="premium-grid grid min-h-screen place-items-center bg-[#12182B] px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/90 p-8 text-center shadow-2xl shadow-pink-500/10 backdrop-blur">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-pink-500" />
          <p className="mt-4 font-black text-slate-950">Verifying reset link…</p>
          <p className="mt-2 text-sm text-slate-500">Please wait a moment.</p>
        </div>
      </main>
    );
  }

  if (phase === "success") {
    return (
      <main className="premium-grid grid min-h-screen place-items-center bg-[#12182B] px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/90 p-8 text-center shadow-2xl shadow-pink-500/10 backdrop-blur">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-green-50 text-green-500">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Password updated</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your password has been changed. Redirecting you to the dashboard…
          </p>
        </div>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="premium-grid grid min-h-screen place-items-center bg-[#12182B] px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/90 p-8 shadow-2xl shadow-pink-500/10 backdrop-blur">
          <Link href="/" className="flex items-center gap-3 font-black text-slate-950">
            <span className="brand-glow grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF1493,#FF4FB3_58%,#FF73C6)] text-white">
              <PackageCheck className="h-5 w-5" />
            </span>
            <BrandName />
          </Link>
          <div className="mt-8">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Reset link invalid</h1>
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {formError ?? "This reset link has expired or already been used."}
            </p>
            <div className="mt-6 grid gap-3">
              <Link
                href="/forgot-password"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3]"
              >
                Request a new reset link
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Back to sign in
              </Link>
            </div>
          </div>
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
            <KeyRound className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Set a new password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Choose a strong password you have not used before.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4" noValidate>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            New password
            <input
              name="password"
              type="password"
              placeholder="At least 8 characters"
              minLength={8}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-500/10"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Confirm password
            <input
              name="confirm"
              type="password"
              placeholder="Repeat your new password"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-500/10"
            />
          </label>

          {formError ? (
            <span className="text-sm font-semibold text-red-600">{formError}</span>
          ) : null}

          <button
            type="submit"
            disabled={phase === "updating"}
            className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {phase === "updating" ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#12182B]">
          <RefreshCw className="h-8 w-8 animate-spin text-pink-500" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

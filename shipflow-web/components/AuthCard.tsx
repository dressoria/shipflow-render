"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LogOut, PackageCheck, RefreshCw } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { isEmail, required } from "@/lib/forms";
import { useAuth } from "@/hooks/useAuth";
import { isAccountMayExistError, logoutUser } from "@/lib/services/authService";

function AuthFormError({ message }: { message: string }) {
  const isCredentialError =
    message.toLowerCase().includes("invalid") ||
    message.toLowerCase().includes("credentials") ||
    message.toLowerCase().includes("password");
  const isAccountError =
    message.toLowerCase().includes("sign in") ||
    message.toLowerCase().includes("already have") ||
    message.toLowerCase().includes("could not create");
  const showReset = isCredentialError || isAccountError;

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-semibold text-red-600">{message}</span>
      {showReset && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link href="/login" className="font-bold text-[#FF1493] hover:underline">
            Sign in
          </Link>
          <span className="text-slate-400">·</span>
          <Link href="/forgot-password" className="font-bold text-[#FF1493] hover:underline">
            Forgot password?
          </Link>
          <span className="text-slate-400">·</span>
          <Link href="/verifica-tu-correo?resend=true" className="font-bold text-[#FF1493] hover:underline">
            Resend verification
          </Link>
        </div>
      )}
    </div>
  );
}

type AuthCardProps = {
  mode: "login" | "registro";
};

function sanitizeNextUrl(value: string | null): string {
  if (!value?.startsWith("/")) return "/dashboard";
  if (
    value.startsWith("/login") ||
    value.startsWith("/registro") ||
    value.startsWith("/verifica-tu-correo") ||
    value.startsWith("/forgot-password") ||
    value.startsWith("/reset-password")
  ) {
    return "/dashboard";
  }
  return value;
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const { user, loading: authLoading, login, register } = useAuth();
  const isLogin = mode === "login";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [existingAccountEmail, setExistingAccountEmail] = useState<string | null>(null);

  // Login mode only: redirect to dashboard if already authenticated.
  // Registro mode shows an explicit "already signed in" UI instead of redirecting.
  useEffect(() => {
    if (!isLogin || authLoading || !user) return;
    if (!user.emailVerified) {
      router.replace("/verifica-tu-correo");
    } else {
      router.replace("/dashboard");
    }
  }, [authLoading, isLogin, router, user]);

  async function handleSignOutForRegistration() {
    setSignOutLoading(true);
    try {
      await logoutUser();
      // onAuthStateChange will clear AuthContext — stays on /registro
    } catch {
      setSignOutLoading(false);
    }
  }

  // Hide auth forms while session state is resolving to prevent redirects/submits
  // racing against an existing Supabase session.
  if (authLoading) {
    return (
      <main className="premium-grid grid min-h-screen place-items-center bg-[#12182B] px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/90 p-8 text-center shadow-2xl shadow-pink-500/10 backdrop-blur">
          <span className="brand-glow mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF1493,#FF4FB3_58%,#FF73C6)] text-white">
            <PackageCheck className="h-5 w-5" />
          </span>
          <RefreshCw className="mx-auto mt-4 h-6 w-6 animate-spin text-pink-500" />
          <p className="mt-3 text-sm text-slate-500">Checking session…</p>
        </div>
      </main>
    );
  }

  if (!isLogin && existingAccountEmail) {
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
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Account may already exist</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              That email may already have an account or may still need verification.
            </p>
            <p className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {existingAccountEmail}
            </p>
            <div className="mt-6 grid gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3]"
              >
                Go to login
              </Link>
              <Link
                href={`/verifica-tu-correo?resend=true&email=${encodeURIComponent(existingAccountEmail)}`}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Resend verification email
              </Link>
              <Link
                href="/forgot-password"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Forgot password
              </Link>
              <button
                type="button"
                onClick={() => {
                  setExistingAccountEmail(null);
                  setErrors({});
                }}
                className="text-sm font-semibold text-slate-400 transition hover:text-slate-700"
              >
                Try a different email
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Registro mode: user is already signed in — block registration and offer sign-out.
  if (!isLogin && user) {
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
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Already signed in</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              You are signed in as{" "}
              <span className="font-semibold text-slate-800">{user.email}</span>.
              Sign out before creating another account.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                onClick={handleSignOutForRegistration}
                disabled={signOutLoading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {signOutLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {signOutLoading ? "Signing out…" : "Sign out"}
              </button>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Go to my dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = required(form.get("name"));
    const email = required(form.get("email"));
    const password = required(form.get("password"));
    const nextErrors: Record<string, string> = {};

    if (!isLogin && !name) nextErrors.name = "Enter your business name.";
    if (!email) nextErrors.email = "Enter your email.";
    if (email && !isEmail(email)) nextErrors.email = "Enter a valid email.";
    if (!password) nextErrors.password = "Enter your password.";
    if (password && password.length < 6) nextErrors.password = "Use at least 6 characters.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      if (isLogin) {
        const nextUser = await login(email, password);
        if (!nextUser.emailVerified) {
          router.push("/verifica-tu-correo");
          return;
        }
        const nextUrl = sanitizeNextUrl(new URLSearchParams(window.location.search).get("next"));
        router.push(nextUrl);
      } else {
        // Safety net: if a session appeared between render and submit, abort.
        if (user) {
          setErrors({ form: "You are already signed in. Sign out before creating another account." });
          setLoading(false);
          return;
        }
        await register({ email, password, businessName: name });
        router.push("/verifica-tu-correo");
      }
    } catch (error) {
      if (!isLogin && isAccountMayExistError(error)) {
        setExistingAccountEmail(email);
        setErrors({});
        setLoading(false);
        return;
      }
      setErrors({
        form: error instanceof Error ? error.message : "We could not complete this action.",
      });
      setLoading(false);
    }
  }

  return (
    <main className="premium-grid grid min-h-screen place-items-center bg-[#12182B] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/90 p-6 shadow-2xl shadow-pink-500/10 backdrop-blur">
        <Link href="/" className="flex items-center gap-3 font-black text-slate-950">
          <span className="brand-glow grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF1493,#FF4FB3_58%,#FF73C6)] text-white">
            <PackageCheck className="h-5 w-5" />
          </span>
          <BrandName />
        </Link>
        <h1 className="mt-8 text-3xl font-black tracking-tight text-slate-950">
          {isLogin ? "Sign in to your account" : "Create your free account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isLogin
            ? "Access the dashboard to review your shipments."
            : "Create access and get your shipping operation ready."}
        </p>
        <form onSubmit={handleSubmit} className="mt-7 grid gap-4" noValidate>
          {!isLogin ? (
            <Field
              name="name"
              label="Business name"
              placeholder="My online store"
              error={errors.name}
            />
          ) : null}
          <Field
            name="email"
            label="Email"
            type="email"
            placeholder="hello@store.com"
            error={errors.email}
          />
          <div className="grid gap-2">
            <Field
              name="password"
              label="Password"
              type="password"
              placeholder="********"
              error={errors.password}
            />
            {isLogin && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-slate-500 hover:text-[#FF1493]"
                >
                  Forgot your password?
                </Link>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Checking..." : isLogin ? "Enter dashboard" : "Create free account"}
            {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </button>
          {errors.form ? <AuthFormError message={errors.form} /> : null}
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          {isLogin ? "No account yet?" : "Already have an account?"}{" "}
          <Link href={isLogin ? "/registro" : "/login"} className="font-bold text-[#FF1493]">
            {isLogin ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  error,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-500/10"
        placeholder={placeholder}
      />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

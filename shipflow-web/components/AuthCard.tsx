"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, PackageCheck } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { isEmail, required } from "@/lib/forms";
import { useAuth } from "@/hooks/useAuth";

type AuthCardProps = {
  mode: "login" | "registro";
};

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const { user, loading: authLoading, login, register } = useAuth();
  const isLogin = mode === "login";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, router, user]);

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
        const nextUrl = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
        router.push(nextUrl);
      } else {
        await register({ email, password, businessName: name });
        router.push("/verifica-tu-correo");
      }
    } catch (error) {
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
          <Field
            name="password"
            label="Password"
            type="password"
            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            error={errors.password}
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF1493] px-5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-0.5 hover:bg-[#FF4FB3] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Checking..." : isLogin ? "Enter dashboard" : "Create free account"}
            {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </button>
          {errors.form ? <span className="text-sm font-semibold text-red-600">{errors.form}</span> : null}
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

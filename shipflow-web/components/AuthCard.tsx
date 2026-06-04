"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  LogOut,
  PackageCheck,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { useRegionMode } from "@/contexts/RegionModeContext";
import { isEmail, isPhone, required } from "@/lib/forms";
import { useAuth } from "@/hooks/useAuth";
import { isAccountMayExistError, logoutUser } from "@/lib/services/authService";

type AuthCardProps = {
  mode: "login" | "registro";
};

type GoogleRecaptcha = {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: GoogleRecaptcha;
  }
}

const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const businessTypes = [
  "Online store",
  "Marketplace seller",
  "Small business",
  "Warehouse / fulfillment",
  "Agency",
  "Other",
];

const markets = [
  { code: "EC", label: "Ecuador" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "ES", label: "Spain" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "GB", label: "United Kingdom" },
];

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

function loadRecaptcha(siteKey: string) {
  if (!siteKey || typeof window === "undefined") return;
  if (window.grecaptcha || document.querySelector("script[data-sendiflash-recaptcha]")) return;
  const script = document.createElement("script");
  script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
  script.async = true;
  script.defer = true;
  script.dataset.sendiflashRecaptcha = "true";
  document.head.appendChild(script);
}

async function getCaptchaToken(): Promise<string | null> {
  if (!CAPTCHA_SITE_KEY) return null;
  return new Promise((resolve, reject) => {
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) {
      reject(new Error("Captcha is still loading. Please try again."));
      return;
    }
    grecaptcha.ready(() => {
      grecaptcha
        .execute(CAPTCHA_SITE_KEY, { action: "signup" })
        .then(resolve)
        .catch(() => reject(new Error("Captcha could not run. Please try again.")));
    });
  });
}

async function verifyCaptchaToken(token: string | null) {
  if (!CAPTCHA_SITE_KEY) {
    if (IS_PRODUCTION) {
      throw new Error("Signup protection is not configured yet. Please contact support.");
    }
    return;
  }

  const response = await fetch("/api/auth/verify-captcha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Captcha verification failed. Please try again.");
  }
}

function AuthFormError({ message, isEcuadorMode }: { message: string; isEcuadorMode: boolean }) {
  const lower = message.toLowerCase();
  const showHelp =
    lower.includes("invalid") ||
    lower.includes("credentials") ||
    lower.includes("password") ||
    lower.includes("already") ||
    lower.includes("verification");

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
      <p className="text-sm font-semibold text-red-700">{message}</p>
      {showHelp ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link href="/login" className="font-bold text-[#2563EB] hover:underline">
            {isEcuadorMode ? "Iniciar sesión" : "Sign in"}
          </Link>
          <Link href="/forgot-password" className="font-bold text-[#2563EB] hover:underline">
            {isEcuadorMode ? "¿Olvidaste tu contraseña?" : "Forgot password?"}
          </Link>
          <Link href="/verifica-tu-correo?resend=true" className="font-bold text-[#2563EB] hover:underline">
            {isEcuadorMode ? "Reenviar verificación" : "Resend verification"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const { user, loading: authLoading, login, register } = useAuth();
  const { mode: regionMode, setMode } = useRegionMode();
  const isLogin = mode === "login";
  const isEcuadorMode = regionMode === "ec";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [existingAccountEmail, setExistingAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isLogin) loadRecaptcha(CAPTCHA_SITE_KEY);
  }, [isLogin]);

  useEffect(() => {
    if (!isLogin || authLoading || !user) return;
    router.replace(user.emailVerified ? "/dashboard" : "/verifica-tu-correo");
  }, [authLoading, isLogin, router, user]);

  async function handleSignOutForRegistration() {
    setSignOutLoading(true);
    try {
      await logoutUser();
    } catch {
      setSignOutLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = required(form.get("firstName"));
    const lastName = required(form.get("lastName"));
    const businessName = required(form.get("businessName"));
    const email = required(form.get("email"));
    const phone = required(form.get("phone"));
    const country = required(form.get("country")) || (isEcuadorMode ? "EC" : "US");
    const businessType = required(form.get("businessType"));
    const password = required(form.get("password"));
    const confirmPassword = required(form.get("confirmPassword"));
    const acceptedTerms = form.get("acceptedTerms") === "on";
    const nextErrors: Record<string, string> = {};

    if (!isLogin && !firstName) nextErrors.firstName = isEcuadorMode ? "Ingresa tu nombre." : "Enter your first name.";
    if (!isLogin && !lastName) nextErrors.lastName = isEcuadorMode ? "Ingresa tu apellido." : "Enter your last name.";
    if (!isLogin && !businessName) nextErrors.businessName = isEcuadorMode ? "Ingresa el nombre de tu negocio o empresa." : "Enter your business or company name.";
    if (!isLogin && phone && !isPhone(phone)) nextErrors.phone = isEcuadorMode ? "Ingresa un teléfono válido." : "Enter a valid phone number.";
    if (!isLogin && !businessType) nextErrors.businessType = isEcuadorMode ? "Selecciona un tipo de negocio." : "Select a business type.";
    if (!isLogin && !acceptedTerms) nextErrors.acceptedTerms = isEcuadorMode ? "Debes aceptar los términos para crear tu cuenta." : "Accept the terms to create an account.";
    if (!email) nextErrors.email = isEcuadorMode ? "Ingresa tu email." : "Enter your email.";
    if (email && !isEmail(email)) nextErrors.email = isEcuadorMode ? "Ingresa un email válido." : "Enter a valid email.";
    if (!password) nextErrors.password = isEcuadorMode ? "Ingresa tu contraseña." : "Enter your password.";
    if (password && password.length < 6) nextErrors.password = isEcuadorMode ? "Usa al menos 6 caracteres." : "Use at least 6 characters.";
    if (!isLogin && password !== confirmPassword) nextErrors.confirmPassword = isEcuadorMode ? "Las contraseñas no coinciden." : "Passwords do not match.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      if (isLogin) {
        const nextUser = await login(email, password);
        router.push(nextUser.emailVerified ? sanitizeNextUrl(new URLSearchParams(window.location.search).get("next")) : "/verifica-tu-correo");
        return;
      }

      if (user) {
        setErrors({ form: isEcuadorMode ? "Ya tienes una sesión activa. Cierra sesión antes de crear otra cuenta." : "You are already signed in. Sign out before creating another account." });
        setLoading(false);
        return;
      }

      const captchaToken = await getCaptchaToken();
      await verifyCaptchaToken(captchaToken);
      await register({
        email,
        password,
        businessName,
        firstName,
        lastName,
        phone,
        country,
        businessType,
        acceptedTerms,
      });
      router.push("/verifica-tu-correo");
    } catch (error) {
      if (!isLogin && isAccountMayExistError(error)) {
        setExistingAccountEmail(email);
        setErrors({});
      } else {
      setErrors({
          form: error instanceof Error ? error.message : isEcuadorMode ? "No pudimos completar esta acción." : "We could not complete this action.",
        });
      }
      setLoading(false);
    }
  }

  if (authLoading) {
    return <AuthLoadingState isEcuadorMode={isEcuadorMode} />;
  }

  if (!isLogin && existingAccountEmail) {
    return (
      <AuthFrame mode={mode}>
        <StatusCard
          title={isEcuadorMode ? "La cuenta ya podría existir" : "Account may already exist"}
          body={isEcuadorMode ? "Ese email puede tener una cuenta creada o puede seguir pendiente de verificación." : "That email may already have an account or may still need verification."}
          email={existingAccountEmail}
          primaryHref="/login"
          primaryLabel={isEcuadorMode ? "Ir al inicio de sesión" : "Go to login"}
          secondaryHref={`/verifica-tu-correo?resend=true&email=${encodeURIComponent(existingAccountEmail)}`}
          secondaryLabel={isEcuadorMode ? "Reenviar email de verificación" : "Resend verification email"}
          tertiaryAction={() => {
            setExistingAccountEmail(null);
            setErrors({});
          }}
          tertiaryLabel={isEcuadorMode ? "Probar con otro email" : "Try a different email"}
        />
      </AuthFrame>
    );
  }

  if (!isLogin && user) {
    return (
      <AuthFrame mode={mode}>
        <StatusCard
          title={isEcuadorMode ? "Ya tienes una sesión activa" : "Already signed in"}
          body={isEcuadorMode ? "Tu cuenta ya está autenticada. Cierra sesión antes de crear otra cuenta." : "You are currently authenticated. Sign out before creating another account."}
          email={user.email}
          primaryHref="/dashboard"
          primaryLabel={isEcuadorMode ? "Ir al panel" : "Go to dashboard"}
          secondaryAction={handleSignOutForRegistration}
          secondaryLabel={isEcuadorMode ? (signOutLoading ? "Cerrando sesión..." : "Cerrar sesión") : signOutLoading ? "Signing out..." : "Sign out"}
        />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame mode={mode}>
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/10 sm:p-7">
        {isEcuadorMode ? (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setMode("us")}
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-[#2563EB]"
            >
              Ir a modo USA
            </button>
          </div>
        ) : null}
        <Link href="/" className="flex items-center gap-3 font-black text-slate-950">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#2563EB] text-white">
            <PackageCheck className="h-5 w-5" />
          </span>
          <BrandName />
        </Link>

        <div className="mt-6">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${
              isEcuadorMode
                ? "border-sky-100 bg-sky-50 text-sky-700"
                : "border-orange-100 bg-orange-50 text-[#F97316]"
            }`}
          >
            {isEcuadorMode ? "Modo Ecuador · Sin cobro" : "Shipping Labels USA · Disponible"}
          </span>
        </div>

        <div className="mt-5">
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${isEcuadorMode ? "text-sky-700" : "text-[#F97316]"}`}>
            {isEcuadorMode ? "Acceso Ecuador" : isLogin ? "Welcome back" : "Beta access"}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {isEcuadorMode
              ? isLogin
                ? "Accede a SendiFlash Ecuador"
                : "Crea tu cuenta SendiFlash Ecuador"
              : isLogin
                ? "Welcome back"
                : "Create your free account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isEcuadorMode
              ? isLogin
                ? "Cotiza, organiza solicitudes y prepara tus envíos nacionales. Una sola cuenta para Ecuador y USA, sin cobro ni orden real hasta confirmar disponibilidad."
                : "Una sola cuenta para cotizar, organizar solicitudes y preparar tus envíos nacionales en Ecuador. Sin cobro ni orden real hasta confirmar disponibilidad."
              : isLogin
                ? "Create labels, compare rates, and manage shipments from one workspace."
                : "Start comparing rates and generating labels in minutes. Domestic shipping in selected markets; international shipping is coming later."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
          {!isLogin ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="firstName" label={isEcuadorMode ? "Nombre" : "First name"} placeholder="Andrea" error={errors.firstName} />
                <Field name="lastName" label={isEcuadorMode ? "Apellido" : "Last name"} placeholder="Martinez" error={errors.lastName} />
              </div>
              <Field name="businessName" label={isEcuadorMode ? "Negocio / empresa" : "Business / company name"} placeholder={isEcuadorMode ? "Bodega Norte" : "Northstar Market"} error={errors.businessName} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="phone" label={isEcuadorMode ? "Teléfono" : "Phone"} placeholder={isEcuadorMode ? "+593 99 123 4567" : "+1 555 000 0000"} error={errors.phone} />
                <SelectField name="country" label={isEcuadorMode ? "Mercado predeterminado" : "Default market"} options={markets} error={errors.country} defaultValue={isEcuadorMode ? "EC" : undefined} />
              </div>
              <SelectField
                name="businessType"
                label={isEcuadorMode ? "Tipo de negocio" : "Business type"}
                options={businessTypes.map((value) => ({
                  code: value,
                  label: isEcuadorMode
                    ? ({
                        "Online store": "Tienda online",
                        "Marketplace seller": "Seller de marketplace",
                        "Small business": "Pequeño negocio",
                        "Warehouse / fulfillment": "Bodega / fulfillment",
                        Agency: "Agencia",
                        Other: "Otro",
                      }[value] ?? value)
                    : value,
                }))}
                error={errors.businessType}
              />
            </>
          ) : null}

          <Field name="email" label={isEcuadorMode ? "Email" : "Email"} type="email" placeholder={isEcuadorMode ? "operaciones@negocio.com" : "hello@store.com"} error={errors.email} />
          <Field name="password" label={isEcuadorMode ? "Contraseña" : "Password"} type="password" placeholder="••••••••" error={errors.password} />
          {!isLogin ? (
            <>
              <Field name="confirmPassword" label={isEcuadorMode ? "Confirmar contraseña" : "Confirm password"} type="password" placeholder="••••••••" error={errors.confirmPassword} />
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <input name="acceptedTerms" type="checkbox" className="mt-1" />
                <span>
                  {isEcuadorMode ? "Acepto los " : "I agree to the "}
                  <Link href="/terms" className="font-bold text-[#2563EB] hover:underline">
                    {isEcuadorMode ? "Términos" : "Terms"}
                  </Link>{" "}
                  {isEcuadorMode ? "y la " : "and "}
                  <Link href="/privacy" className="font-bold text-[#2563EB] hover:underline">
                    {isEcuadorMode ? "Política de Privacidad" : "Privacy Policy"}
                  </Link>
                  .
                  {errors.acceptedTerms ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.acceptedTerms}</span> : null}
                </span>
              </label>
              {!CAPTCHA_SITE_KEY ? (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                  {isEcuadorMode ? "La protección anti-bot no está configurada en este entorno." : "Anti-bot protection is not configured in this environment."}
                </p>
              ) : (
                <p className="text-xs font-semibold text-slate-400">{isEcuadorMode ? "Protegido por reCAPTCHA." : "Protected by reCAPTCHA."}</p>
              )}
            </>
          ) : (
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs font-semibold text-slate-500 hover:text-[#2563EB]">
                {isEcuadorMode ? "¿Olvidaste tu contraseña?" : "Forgot your password?"}
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F97316] px-5 text-sm font-black text-white shadow-xl shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (isEcuadorMode ? "Validando acceso..." : "Checking...") : isEcuadorMode ? (isLogin ? "Entrar al panel" : "Crear cuenta") : isLogin ? "Enter dashboard" : "Create account"}
            {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </button>
          {errors.form ? <AuthFormError message={errors.form} isEcuadorMode={isEcuadorMode} /> : null}
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {isEcuadorMode ? (isLogin ? "¿Todavía no tienes cuenta?" : "¿Ya tienes cuenta?") : isLogin ? "No account yet?" : "Already have an account?"}{" "}
          <Link href={isLogin ? "/registro" : "/login"} className="font-bold text-[#2563EB] hover:underline">
            {isEcuadorMode ? (isLogin ? "Crear cuenta" : "Iniciar sesión") : isLogin ? "Create account" : "Sign in"}
          </Link>
        </p>
      </section>
    </AuthFrame>
  );
}

function AuthFrame({ mode, children }: { mode: "login" | "registro"; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0F172A] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <AuthPreview mode={mode} />
        <div className="flex justify-center lg:justify-end">{children}</div>
      </div>
    </main>
  );
}

function AuthPreview({ mode }: { mode: "login" | "registro" }) {
  const { mode: regionMode } = useRegionMode();
  const isEcuadorMode = regionMode === "ec";
  return (
    <section className="hidden min-w-0 text-white lg:block">
      <div className="max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-blue-100">
          <ShieldCheck className="h-3.5 w-3.5 text-[#FB923C]" />
          {isEcuadorMode ? "SendiFlash Ecuador" : "Secure beta shipping workspace"}
        </div>
        <h2 className="mt-6 text-5xl font-black tracking-tight">
          {isEcuadorMode
            ? mode === "login"
              ? "Accede a una experiencia logística pensada para Ecuador."
              : "Una sola cuenta para Ecuador y USA."
            : mode === "login"
              ? "Everything after checkout, handled."
              : "A cleaner way to ship from day one."}
        </h2>
        <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">
          {isEcuadorMode
            ? "Cotiza, organiza solicitudes y prepara envíos nacionales con una vista multicourier en español. Sin cobro ni orden real hasta confirmar disponibilidad."
            : "Compare domestic rates, pay securely, and let SendiFlash prepare the label automatically after payment."}
        </p>
      </div>

      <div className="mt-8 max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur">
        {isEcuadorMode ? (
          <>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white text-slate-950 shadow-xl">
              <div className="relative aspect-[16/10]">
                <Image
                  src="/images/ecuador/maps/ecuador-map-coverage.webp"
                  alt="Visual Ecuador con rutas, cobertura y cotización sin cobro"
                  fill
                  sizes="640px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(15,23,42,0.14)_100%)]" />
                <div className="absolute left-4 top-4 rounded-2xl border border-white/70 bg-white/92 px-4 py-3 shadow-lg backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-widest text-sky-700">SendiFlash Ecuador</p>
                  <p className="mt-1 text-sm font-bold text-slate-600">Quito · Guayaquil · Cuenca · Manta · Loja</p>
                </div>
                <div className="absolute bottom-4 right-4 rounded-2xl border border-sky-100 bg-white/92 px-4 py-3 shadow-lg backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-black text-sky-700">
                    <Route className="h-4 w-4" />
                    Cotización de envío
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Sin cobro ni orden real hasta confirmar disponibilidad</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-3xl bg-white p-4 text-slate-950">
              {[
                ["Cotiza y organiza", "Solicitudes, tarifas y seguimiento en preparación"],
                ["Operadores disponibles", "Servientrega, LaarCourier, Tramaco, Delivereo y más"],
                ["Una sola cuenta", "Ecuador primero con acceso sutil a Shipping Labels USA"],
              ].map(([name, badge]) => (
                <div key={name} className="flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{badge}</p>
                  </div>
                  <p className="text-xs font-black text-sky-700">Ecuador</p>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">
                <CheckCircle2 className="h-4 w-4" />
                Sin cobro y sin orden real hasta confirmar disponibilidad
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                [Truck, "Cotización de envío"],
                [CreditCard, "Sin cobro"],
                [LockKeyhole, "Una cuenta USA + Ecuador"],
              ].map(([Icon, label]) => {
                const TypedIcon = Icon as typeof Truck;
                return (
                  <div key={label as string} className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <TypedIcon className="h-4 w-4 text-sky-300" />
                    <p className="mt-2 text-xs font-bold text-slate-200">{label as string}</p>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 rounded-3xl bg-white p-4 text-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#2563EB]">Rate comparison</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">New York, NY → Miami, FL · 1 lb</p>
                </div>
                <Route className="h-5 w-5 text-[#F97316]" />
              </div>
              {[
                ["USPS Ground Advantage", "$8.42", "Best value"],
                ["UPS Ground", "$10.18", "Ground"],
                ["FedEx 2Day", "$15.90", "Fastest"],
              ].map(([name, price, badge]) => (
                <div key={name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{badge}</p>
                  </div>
                  <p className="text-lg font-black text-[#2563EB]">{price}</p>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Label ready automatically
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                [Truck, "Shipments"],
                [CreditCard, "Wallet + card"],
                [LockKeyhole, "Protected signup"],
              ].map(([Icon, label]) => {
                const TypedIcon = Icon as typeof Truck;
                return (
                  <div key={label as string} className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <TypedIcon className="h-4 w-4 text-[#FB923C]" />
                    <p className="mt-2 text-xs font-bold text-slate-200">{label as string}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StatusCard({
  title,
  body,
  email,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  secondaryAction,
  tertiaryAction,
  tertiaryLabel,
}: {
  title: string;
  body: string;
  email: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  secondaryAction?: () => void;
  tertiaryAction?: () => void;
  tertiaryLabel?: string;
}) {
  return (
    <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-950/10">
      <Link href="/" className="flex items-center gap-3 font-black text-slate-950">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#2563EB] text-white">
          <PackageCheck className="h-5 w-5" />
        </span>
        <BrandName />
      </Link>
      <h1 className="mt-8 text-2xl font-black text-slate-950">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
      <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{email}</p>
      <div className="mt-6 grid gap-3">
        <Link href={primaryHref} className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F97316] px-5 text-sm font-black text-white">
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700">
            {secondaryLabel}
          </Link>
        ) : null}
        {secondaryAction && secondaryLabel ? (
          <button type="button" onClick={secondaryAction} className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700">
            <LogOut className="mr-2 h-4 w-4" />
            {secondaryLabel}
          </button>
        ) : null}
        {tertiaryAction && tertiaryLabel ? (
          <button type="button" onClick={tertiaryAction} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            {tertiaryLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AuthLoadingState({ isEcuadorMode }: { isEcuadorMode: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0F172A] px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-[#2563EB] text-white">
          <PackageCheck className="h-5 w-5" />
        </span>
        <RefreshCw className="mx-auto mt-4 h-6 w-6 animate-spin text-[#F97316]" />
        <p className="mt-3 text-sm text-slate-500">{isEcuadorMode ? "Validando sesión..." : "Checking session..."}</p>
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
        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        placeholder={placeholder}
      />
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  error,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Array<{ code: string; label: string }>;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]?.code}
        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

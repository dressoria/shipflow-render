"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isPhone } from "@/lib/forms";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  country: string;
  businessType: string;
  preferredPaymentMethod: "no_preference" | "wallet" | "card";
  defaultProductType: string;
  supportEmail: string;
};

const markets = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "ES", label: "Spain" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "GB", label: "United Kingdom" },
];

const businessTypes = [
  "Online store",
  "Marketplace seller",
  "Small business",
  "Warehouse / fulfillment",
  "Agency",
  "Other",
];

const productTypes = [
  "Apparel and accessories",
  "Electronics",
  "Cosmetics",
  "Documents",
  "Home goods",
  "Other",
];

const initialForm: ProfileForm = {
  firstName: "",
  lastName: "",
  phone: "",
  businessName: "",
  country: "US",
  businessType: "Online store",
  preferredPaymentMethod: "no_preference",
  defaultProductType: "Apparel and accessories",
  supportEmail: "",
};

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function normalizePaymentMethod(value: string): ProfileForm["preferredPaymentMethod"] {
  if (value === "wallet" || value === "card") return value;
  return "no_preference";
}

export function ProfileSettings() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [createdAt, setCreatedAt] = useState(user?.createdAt ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) return;
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured || !supabase) {
        setForm({
          ...initialForm,
          businessName: user.businessName ?? "",
          supportEmail: user.email,
        });
        setCreatedAt(user.createdAt);
        setLoading(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !data.user) {
        setError("We could not load your profile. Please refresh and try again.");
        setLoading(false);
        return;
      }

      const metadata = data.user.user_metadata ?? {};
      setForm({
        firstName: metadataString(metadata, "first_name"),
        lastName: metadataString(metadata, "last_name"),
        phone: metadataString(metadata, "phone"),
        businessName: metadataString(metadata, "business_name") || user.businessName || "",
        country: metadataString(metadata, "country") || "US",
        businessType: metadataString(metadata, "business_type") || "Online store",
        preferredPaymentMethod: normalizePaymentMethod(metadataString(metadata, "preferred_payment_method")),
        defaultProductType: metadataString(metadata, "default_product_type") || "Apparel and accessories",
        supportEmail: metadataString(metadata, "support_email") || data.user.email || user.email,
      });
      setCreatedAt(data.user.created_at ?? user.createdAt);
      setLoading(false);
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  }

  function validate() {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim()) return "Last name is required.";
    if (!form.businessName.trim()) return "Business / company name is required.";
    if (form.phone.trim() && !isPhone(form.phone.trim())) return "Enter a valid phone number.";
    if (form.supportEmail.trim() && !form.supportEmail.includes("@")) return "Enter a valid support email.";
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!user) {
      setError("You must be signed in to update your profile.");
      return;
    }

    setSaving(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        setMessage("Profile saved locally for this demo session.");
        setSaving(false);
        return;
      }

      const metadata = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone: form.phone.trim(),
        business_name: form.businessName.trim(),
        country: form.country,
        business_type: form.businessType,
        preferred_payment_method: form.preferredPaymentMethod,
        default_product_type: form.defaultProductType,
        support_email: form.supportEmail.trim(),
      };

      const { error: authError } = await supabase.auth.updateUser({ data: metadata });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ business_name: form.businessName.trim() })
        .eq("id", user.id);
      if (profileError) throw profileError;

      setMessage("Profile updated successfully.");
    } catch {
      setError("We could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#2563EB]" />
        <p className="mt-3 text-sm font-semibold text-slate-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F97316]">Account settings</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{form.businessName || "Your SendiFlash account"}</h2>
            <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-black text-slate-950">Created</p>
            <p className="text-slate-500">{createdAt ? new Date(createdAt).toLocaleDateString() : "Not available"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <SectionCard icon={<UserRound className="h-5 w-5" />} title="Profile overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First name" value={form.firstName} onChange={(value) => update("firstName", value)} />
              <Field label="Last name" value={form.lastName} onChange={(value) => update("lastName", value)} />
              <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} placeholder="+1 555 000 0000" />
              <ReadOnlyField label="Email" value={user?.email ?? ""} />
              <div className="md:col-span-2">
                <Field label="Business / company name" value={form.businessName} onChange={(value) => update("businessName", value)} />
              </div>
              <SelectField label="Default market" value={form.country} options={markets} onChange={(value) => update("country", value)} />
              <SelectField
                label="Business type"
                value={form.businessType}
                options={businessTypes.map((value) => ({ code: value, label: value }))}
                onChange={(value) => update("businessType", value)}
              />
            </div>
          </SectionCard>

          <SectionCard icon={<CreditCard className="h-5 w-5" />} title="Business preferences">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Preferred payment method"
                value={form.preferredPaymentMethod}
                options={[
                  { code: "no_preference", label: "No preference" },
                  { code: "wallet", label: "Wallet" },
                  { code: "card", label: "Card" },
                ]}
                onChange={(value) => update("preferredPaymentMethod", normalizePaymentMethod(value))}
              />
              <SelectField
                label="Default package/product type"
                value={form.defaultProductType}
                options={productTypes.map((value) => ({ code: value, label: value }))}
                onChange={(value) => update("defaultProductType", value)}
              />
              <div className="md:col-span-2">
                <Field
                  label="Support/contact email"
                  value={form.supportEmail}
                  onChange={(value) => update("supportEmail", value)}
                  placeholder="support@yourcompany.com"
                />
              </div>
            </div>
          </SectionCard>

          {message ? (
            <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#F97316] px-5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#EA580C] disabled:opacity-70 sm:w-fit"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>

        <aside className="grid content-start gap-5">
          <SectionCard icon={<ShieldCheck className="h-5 w-5" />} title="Security">
            <div className="grid gap-3 text-sm">
              <ReadOnlyField label="Email" value={user?.email ?? ""} />
              <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
                Password changes are handled through secure email reset.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Reset password
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </button>
            </div>
          </SectionCard>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            <p className="font-black text-slate-950">Data storage</p>
            <p className="mt-2">
              Name, phone, market, business type, and preferences are stored in Auth metadata. Company name is also synced to the profile record used across the app.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">{icon}</span>
        <h3 className="font-black text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        value={value}
        readOnly
        className="h-11 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-slate-500 outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ code: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

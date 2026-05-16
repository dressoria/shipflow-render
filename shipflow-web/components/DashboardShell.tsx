"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Home,
  MapPinned,
  PackageCheck,
  PlusCircle,
  Search,
  Truck,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/Button";
import { BrandName } from "@/components/BrandName";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";

const menu = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Cotizar envío", href: "/crear-guia", icon: PlusCircle },
  { label: "Envíos", href: "/envios", icon: Truck },
  { label: "Tracking", href: "/tracking", icon: MapPinned },
  { label: "Saldo", href: "/saldo", icon: CreditCard },
];

type DashboardShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function DashboardShell({ title, description, children }: DashboardShellProps) {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-[#F8F9FC]">
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-black text-slate-950">
            <span className="brand-glow grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF1493,#FF4FB3_58%,#FF73C6)] text-white">
              <PackageCheck className="h-5 w-5" />
            </span>
            <BrandName />
          </Link>
          <div className="hidden h-11 min-w-72 items-center gap-3 rounded-2xl border border-pink-100 bg-white/80 px-4 text-sm text-slate-500 shadow-sm md:flex">
            <Search className="h-4 w-4" />
            Buscar guía, cliente o ciudad
          </div>
          <Button href="/crear-guia" icon={<PlusCircle className="h-4 w-4" />} className="rounded-2xl">
            Cotizar envío
          </Button>
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-xl shadow-pink-950/20 transition hover:-translate-y-0.5 hover:bg-slate-900"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-pink-100 bg-white/85 px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="h-fit rounded-3xl border border-white/10 bg-[#12182B] p-3 shadow-2xl shadow-[#12182B]/15">
          <div className="dark-glass rounded-2xl p-4 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10">
                <BarChart3 className="h-5 w-5 text-[#22C55E]" />
              </span>
              <div>
              <p className="text-sm font-bold">
                {isSupabaseConfigured ? "Supabase activo" : "Modo fallback"}
              </p>
                <p className="text-xs text-slate-300">{user?.businessName ?? user?.email ?? "Saldo por envío"}</p>
              </div>
            </div>
          </div>
          <nav className="mt-3 grid gap-1">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                    pathname === item.href
                      ? "bg-[#FF1493] text-white shadow-lg shadow-[#FF1493]/30"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {isAdmin ? (
              <Link
                href="/admin"
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                  pathname.startsWith("/admin")
                    ? "bg-[#FF1493] text-white shadow-lg shadow-[#FF1493]/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
            ) : null}
          </nav>
        </aside>
        <main>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#FF1493]">
                Panel
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-slate-600">{description}</p>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}

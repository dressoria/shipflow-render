"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  FileSearch,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { AdminRoute } from "@/components/AdminRoute";
import { BrandName } from "@/components/BrandName";
import { useAuth } from "@/hooks/useAuth";

const menu = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/usuarios", icon: Users },
  { label: "Shipments", href: "/admin/envios", icon: Truck },
  { label: "Couriers", href: "/admin/couriers", icon: Warehouse },
  { label: "Balance", href: "/admin/saldo", icon: CreditCard },
  { label: "Audit", href: "/admin/audit", icon: FileSearch },
];

export function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <AdminRoute>
      <div className="min-h-screen bg-[#F8F9FC]">
        <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 lg:px-8">
            <Link href="/admin" className="flex min-w-0 items-center gap-3 font-black text-slate-950">
              <span className="brand-glow grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF1493,#FF4FB3_58%,#FF73C6)] text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              Admin <BrandName />
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="hidden h-11 items-center rounded-2xl border border-pink-100 bg-white/85 px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-pink-50 sm:inline-flex"
              >
                User dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-pink-100 bg-white/85 px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-pink-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </header>
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
          <aside className="h-fit min-w-0 rounded-3xl border border-white/10 bg-[#12182B] p-3 shadow-2xl shadow-[#12182B]/15">
            <div className="dark-glass rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10">
                  <PackageCheck className="h-5 w-5 text-[#22C55E]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Administrator</p>
                  <p className="truncate text-xs text-slate-300">{user?.email}</p>
                </div>
              </div>
            </div>
            <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
              {menu.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex shrink-0 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition lg:shrink ${
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
            </nav>
          </aside>
          <main className="min-w-0">
            <div className="mb-6 min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FF1493]">
                Admin
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-slate-600">{description}</p>
            </div>
            {children}
          </main>
        </div>
      </div>
    </AdminRoute>
  );
}

"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandName } from "@/components/BrandName";
import { Button } from "@/components/Button";
import { RegionModeSwitcher } from "@/components/RegionModeSwitcher";
import { useRegionMode } from "@/contexts/RegionModeContext";

const nav = [
  { label: "Services", href: "/#services" },
  { label: "Shipping Labels", href: "/shipping-labels" },
  { label: "Ecuador", href: "/ecuador" },
  { label: "Support", href: "/support" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { mode } = useRegionMode();
  const ctaLabel = mode === "ec" ? "Acceso temprano" : "Start shipping";
  const loginLabel = mode === "ec" ? "Iniciar sesión" : "Sign in";
  const ctaHref = mode === "ec" ? "/support" : "/registro";

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-[2rem] border border-white/80 bg-white/88 px-4 shadow-xl shadow-slate-950/8 backdrop-blur-2xl sm:px-5 lg:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-2xl px-1 py-1">
          <span className="h-8 w-1.5 rounded-full bg-[#F97316]" aria-hidden="true" />
          <BrandName className="text-base" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#64748B] md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-[#2563EB]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="w-[228px]">
            <RegionModeSwitcher compact />
          </div>
          <Button href="/login" variant="ghost">
            {loginLabel}
          </Button>
          <Button href={ctaHref} variant="action" className="rounded-2xl">
            {ctaLabel}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 bg-white text-slate-700 md:hidden"
          aria-label="Open menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="mx-auto mt-2 max-w-7xl rounded-3xl border border-white/80 bg-white/95 px-4 py-4 shadow-xl shadow-slate-950/8 backdrop-blur-2xl md:hidden">
          <div className="mb-4">
            <RegionModeSwitcher />
          </div>
          <nav className="grid gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#2563EB]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid gap-3">
            <Button href={ctaHref} variant="action" className="w-full">
              {ctaLabel}
            </Button>
            <Button href="/login" variant="secondary" className="w-full">
              {loginLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

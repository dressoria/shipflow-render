"use client";

import Link from "next/link";
import { Menu, PackageCheck, X } from "lucide-react";
import { useState } from "react";
import { BrandName } from "@/components/BrandName";
import { Button } from "@/components/Button";

const nav = [
  { label: "Features", href: "#beneficios" },
  { label: "Carriers", href: "#couriers" },
  { label: "How it works", href: "#como-funciona" },
  { label: "Pricing", href: "#pagos" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-[2rem] border border-white/70 bg-white/82 px-4 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl sm:px-5 lg:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-2xl bg-[#0F172A]/82 px-2.5 py-2 shadow-lg shadow-slate-950/20 backdrop-blur-md ring-1 ring-white/15">
          <span className="brand-glow grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#06B6D4,#22C55E)] text-white">
            <PackageCheck className="h-5 w-5" />
          </span>
          <BrandName className="text-base text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.38)]" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-bold text-[#64748B] md:flex">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-[#06B6D4]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button href="/login" variant="ghost">
            Sign in
          </Button>
          <Button href="/registro" className="rounded-2xl">Create account</Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200 bg-white/80 text-slate-700 md:hidden"
          aria-label="Open menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="mx-auto mt-2 max-w-7xl rounded-3xl border border-white/70 bg-white/92 px-4 py-4 shadow-xl shadow-slate-950/10 backdrop-blur-2xl md:hidden">
          <nav className="grid gap-2">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-cyan-50 hover:text-[#06B6D4]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 grid gap-3">
            <Button href="/registro" className="w-full">
              Create account
            </Button>
            <Button href="/login" variant="secondary" className="w-full">
              Sign in
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

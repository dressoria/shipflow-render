"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandName } from "@/components/BrandName";
import { Button } from "@/components/Button";

const nav = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-[2rem] border border-white/80 bg-white/88 px-4 shadow-xl shadow-slate-950/8 backdrop-blur-2xl sm:px-5 lg:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-2xl px-1 py-1">
          <span className="h-8 w-1.5 rounded-full bg-[#F97316]" aria-hidden="true" />
          <BrandName className="text-base" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#64748B] md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition hover:text-[#2563EB]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button href="/login" variant="ghost">
            Sign in
          </Button>
          <Button href="/registro" variant="action" className="rounded-2xl">
            Start shipping
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
          <nav className="grid gap-1">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#2563EB]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 grid gap-3">
            <Button href="/registro" variant="action" className="w-full">
              Start shipping
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

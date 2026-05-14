"use client";

import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/Badge";

type CourierCardProps = {
  name: string;
  coverage: string;
  status: string;
  initials?: string;
  logoUrl?: string;
};

export function CourierCard({ name, coverage, status, initials, logoUrl }: CourierCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showLogo = logoUrl && !imageFailed;

  return (
    <div className="h-full rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm shadow-slate-950/5 transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-500/10">
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex h-24 items-center justify-center rounded-2xl border border-slate-100 bg-white p-3">
          {showLogo ? (
            <Image
              src={logoUrl}
              alt={`${name} logo`}
              width={220}
              height={90}
              onError={() => setImageFailed(true)}
              className="max-h-[4.5rem] max-w-[92%] w-auto object-contain opacity-100"
            />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#0F172A,#06B6D4_58%,#22C55E)] text-sm font-black text-white">
              {initials ?? name.slice(0, 2)}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-950">{name}</h3>
            <p className="mt-1 text-sm text-slate-500">{coverage}</p>
          </div>
          <Badge tone={status === "Connected" ? "green" : "blue"}>{status}</Badge>
        </div>
      </div>
    </div>
  );
}

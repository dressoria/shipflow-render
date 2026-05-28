"use client";

import { CheckCircle2, MapPinned, Truck } from "lucide-react";

const routeStops = ["Miami", "Atlanta", "Dallas", "Phoenix", "Los Angeles"];

export function NationwideRoute() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10 transition hover:-translate-y-1 hover:border-blue-200">
      <div className="relative min-h-[360px] bg-[#F8FAFC] p-5 sm:min-h-[430px] sm:p-8">
        <div className="absolute inset-x-5 top-8 flex items-center justify-between text-[0.68rem] font-black text-slate-400 sm:inset-x-12 sm:text-xs">
          {routeStops.map((city, index) => (
            <span key={city} className={`route-city route-city-${index + 1} rounded-full bg-white/80 px-2 py-1 shadow-sm`}>
              {city}
            </span>
          ))}
        </div>

        <div className="absolute left-8 right-8 top-1/2 h-1 rounded-full bg-slate-200 sm:left-12 sm:right-12">
          <div className="route-progress h-1 rounded-full bg-[#2563EB]" />
          {routeStops.map((city, index) => (
            <span
              key={city}
              className={`route-dot route-dot-${index + 1} absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-4 border-white bg-slate-300 shadow-md`}
              style={{ left: `${(index / (routeStops.length - 1)) * 100}%` }}
            />
          ))}
        </div>

        <div className="route-truck absolute top-[calc(50%-38px)] z-20">
          <div className="relative h-16 w-28 rounded-[1.25rem] bg-white shadow-xl shadow-slate-950/20 ring-1 ring-slate-200">
            <div className="absolute bottom-4 left-4 h-8 w-14 rounded-lg bg-[#2563EB]" />
            <div className="absolute bottom-4 right-4 h-7 w-8 rounded-r-lg bg-[#F97316]" />
            <span className="absolute bottom-1 left-7 h-4 w-4 rounded-full bg-[#0F172A]" />
            <span className="absolute bottom-1 right-6 h-4 w-4 rounded-full bg-[#0F172A]" />
          </div>
        </div>

        <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:bottom-8 sm:left-8 sm:right-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
                <MapPinned className="h-4 w-4 text-[#2563EB]" />
                Built for fast nationwide shipping
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                A simple route view connects labels, pickups, transit updates, and delivery status.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-[#F97316]">
              <Truck className="h-4 w-4" />
              In transit
            </div>
          </div>
        </div>

        <div className="absolute left-5 top-20 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:left-8 sm:top-24">
          <p className="flex items-center gap-2 text-xs font-black text-[#2563EB]">
            <CheckCircle2 className="h-4 w-4" />
            Label created
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Ready for handoff</p>
        </div>
      </div>
    </div>
  );
}

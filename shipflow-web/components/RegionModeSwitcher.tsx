"use client";

import { MapPinned, Truck } from "lucide-react";
import { useRegionMode } from "@/contexts/RegionModeContext";
import type { RegionMode } from "@/lib/regionMode";

type RegionModeSwitcherProps = {
  compact?: boolean;
  variant?: "panel" | "pill";
};

export function RegionModeSwitcher({ compact = false, variant = "panel" }: RegionModeSwitcherProps) {
  const { mode, setMode } = useRegionMode();
  const isPill = variant === "pill";

  return (
    <div
      className={
        isPill
          ? "rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm"
          : `rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm ${compact ? "" : "w-full max-w-md"}`
      }
    >
      <div
        className={`grid gap-1 ${compact || isPill ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}
        role="tablist"
        aria-label="Select shipping mode"
      >
        <RegionModeOption
          selected={mode === "us"}
          mode="us"
          compact={compact}
          pill={isPill}
          icon={<Truck className="h-4 w-4" />}
          title="USA Shipping Labels"
          status="Available now"
          onSelect={setMode}
        />
        <RegionModeOption
          selected={mode === "ec"}
          mode="ec"
          compact={compact}
          pill={isPill}
          icon={<MapPinned className="h-4 w-4" />}
          title="Ecuador Shipping"
          status="Coming soon"
          onSelect={setMode}
        />
      </div>
    </div>
  );
}

function RegionModeOption({
  selected,
  mode,
  compact,
  pill,
  icon,
  title,
  status,
  onSelect,
}: {
  selected: boolean;
  mode: RegionMode;
  compact: boolean;
  pill: boolean;
  icon: React.ReactNode;
  title: string;
  status: string;
  onSelect: (mode: RegionMode) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(mode)}
      className={`rounded-[1rem] px-3 py-2 text-left transition ${
        selected
          ? pill
            ? mode === "ec"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
              : "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
            : "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
          : "bg-transparent text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-black">
        {icon}
        <span className="truncate">{compact || pill ? (mode === "us" ? "USA" : "Ecuador") : title}</span>
      </span>
      <span className={`mt-1 block text-xs font-semibold ${selected ? "text-slate-300" : "text-slate-500"} ${pill ? "hidden sm:block" : ""}`}>
        {status}
      </span>
    </button>
  );
}

"use client";

import { MapPinned, Truck } from "lucide-react";
import { useRegionMode } from "@/contexts/RegionModeContext";
import type { RegionMode } from "@/lib/regionMode";

type RegionModeSwitcherProps = {
  compact?: boolean;
};

export function RegionModeSwitcher({ compact = false }: RegionModeSwitcherProps) {
  const { mode, setMode } = useRegionMode();

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm ${compact ? "" : "w-full max-w-md"}`}>
      <div className={`grid gap-1 ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`} role="tablist" aria-label="Select shipping mode">
        <RegionModeOption
          selected={mode === "us"}
          mode="us"
          compact={compact}
          icon={<Truck className="h-4 w-4" />}
          title="USA Shipping Labels"
          status="Available now"
          onSelect={setMode}
        />
        <RegionModeOption
          selected={mode === "ec"}
          mode="ec"
          compact={compact}
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
  icon,
  title,
  status,
  onSelect,
}: {
  selected: boolean;
  mode: RegionMode;
  compact: boolean;
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
          ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
          : "bg-transparent text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-black">
        {icon}
        <span className="truncate">{compact ? (mode === "us" ? "USA" : "Ecuador") : title}</span>
      </span>
      <span className={`mt-1 block text-xs font-semibold ${selected ? "text-slate-300" : "text-slate-500"}`}>
        {status}
      </span>
    </button>
  );
}

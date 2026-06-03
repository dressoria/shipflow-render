"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  DEFAULT_REGION_MODE,
  getRegionModeMeta,
  isRegionMode,
  REGION_MODE_STORAGE_KEY,
  type RegionMode,
} from "@/lib/regionMode";

type RegionModeContextValue = {
  mode: RegionMode;
  setMode: (mode: RegionMode) => void;
  meta: ReturnType<typeof getRegionModeMeta>;
};

const RegionModeContext = createContext<RegionModeContextValue | null>(null);

export function RegionModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<RegionMode>(() => {
    if (typeof window === "undefined") return DEFAULT_REGION_MODE;
    const stored = window.localStorage.getItem(REGION_MODE_STORAGE_KEY);
    return isRegionMode(stored) ? stored : DEFAULT_REGION_MODE;
  });

  function setMode(nextMode: RegionMode) {
    setModeState(nextMode);
    window.localStorage.setItem(REGION_MODE_STORAGE_KEY, nextMode);
  }

  const value = useMemo(
    () => ({
      mode,
      setMode,
      meta: getRegionModeMeta(mode),
    }),
    [mode],
  );

  return <RegionModeContext.Provider value={value}>{children}</RegionModeContext.Provider>;
}

export function useRegionMode() {
  const context = useContext(RegionModeContext);
  if (!context) {
    throw new Error("useRegionMode must be used inside RegionModeProvider.");
  }
  return context;
}

"use client";

import type { ReactNode } from "react";
import { LoadingState } from "@/components/LoadingState";
import { PrepComingSoon } from "@/components/PrepComingSoon";
import { useAuth } from "@/hooks/useAuth";
import { getPrepAccessState } from "@/lib/prepAccess";

export function PrepGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;

  const prepAccess = getPrepAccessState(user);
  if (!prepAccess.canUsePrep) return <PrepComingSoon />;

  return <>{children}</>;
}

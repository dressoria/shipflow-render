"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUser,
  getCurrentUser,
  loginUser,
  logoutUser,
} from "@/lib/services/authService";
import { clearLegacyAuthStorage, isDemoAuthEnabled } from "@/lib/services/legacyAuthCleanup";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";

type AuthContextValue = {
  user: Usuario | null;
  loading: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
  login: (email: string, password: string) => Promise<Usuario>;
  register: (input: {
    email: string;
    password: string;
    businessName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    country?: string;
    businessType?: string;
    acceptedTerms?: boolean;
  }) => Promise<Usuario>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Demo/local mode: only allowed in local dev with explicit opt-in.
      // In production this always results in user=null (no localStorage fallback).
      // Promise.resolve keeps setState out of the synchronous effect body to satisfy
      // the react-hooks/set-state-in-effect lint rule.
      if (!isDemoAuthEnabled()) {
        void Promise.resolve(null).then(setUser).finally(() => setLoading(false));
        return;
      }
      getCurrentUser()
        .then(setUser)
        .finally(() => setLoading(false));
      return;
    }

    // Supabase mode: purge any legacy localStorage auth data that may linger
    // from a previous demo session or a misconfigured build.
    clearLegacyAuthStorage();

    // onAuthStateChange fires INITIAL_SESSION with the current state,
    // then SIGNED_IN / SIGNED_OUT as state changes. No setTimeout needed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      getCurrentUser().then((u) => {
        setUser(u);
        setLoading(false);
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "admin",
      emailVerified: user?.emailVerified ?? false,
      login: async (email, password) => {
        const nextUser = await loginUser({ email, password });
        setUser(nextUser);
        return nextUser;
      },
      register: async (input) => {
        const nextUser = await createUser(input);
        setUser(nextUser);
        return nextUser;
      },
      logout: async () => {
        await logoutUser();
        setUser(null);
        router.push("/login");
      },
    }),
    [loading, router, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUser,
  getCurrentUser,
  loginUser,
  logoutUser,
} from "@/lib/services/authService";
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
      // Demo/local mode: load from localStorage, no auth events to wait for
      getCurrentUser()
        .then(setUser)
        .finally(() => setLoading(false));
      return;
    }

    // Supabase mode: onAuthStateChange fires INITIAL_SESSION with the current state,
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
      register: async ({ email, password, businessName }) => {
        const nextUser = await createUser({ email, password, businessName });
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

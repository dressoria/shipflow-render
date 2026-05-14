import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Profile } from "../types";
import { supabase } from "./supabase";

type AuthContextValue = {
  user: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, businessName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileRow = {
  id: string;
  email: string;
  business_name?: string | null;
  role?: Profile["role"] | null;
  created_at: string;
};

function fromProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    businessName: row.business_name ?? undefined,
    role: row.role ?? "user",
    createdAt: row.created_at,
  };
}

async function fetchProfile(userId: string, email: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  if (data) return fromProfile(data);

  const fallback = {
    id: userId,
    email,
    role: "user" as const,
    createdAt: new Date().toISOString(),
  };
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setUser(null);
      return;
    }
    setUser(await fetchProfile(data.user.id, data.user.email ?? ""));
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      fetchProfile(session.user.id, session.user.email ?? "").then(setUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "admin",
      refreshUser,
      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await refreshUser();
      },
      register: async (email, password, businessName) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { business_name: businessName } },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
            business_name: businessName,
            role: "user",
          });
        }
        await refreshUser();
      },
      logout: async () => {
        await supabase.auth.signOut();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return value;
}

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";
import { getDemoUsers, getUser, saveUser } from "@/lib/storage";

type AuthInput = {
  email: string;
  password: string;
  businessName?: string;
};

type ProfileRow = {
  id: string;
  email: string;
  business_name?: string;
  role?: Usuario["role"];
  created_at: string;
};

function profileToUser(row: ProfileRow): Usuario {
  return {
    id: row.id,
    email: row.email,
    businessName: row.business_name,
    role: row.role ?? "user",
    createdAt: row.created_at,
  };
}

async function getProfile(userId: string, fallbackEmail: string): Promise<Usuario> {
  if (!supabase) {
    return {
      id: userId,
      email: fallbackEmail,
      role: "user",
      createdAt: new Date().toISOString(),
    };
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (data) return profileToUser(data);

  return {
    id: userId,
    email: fallbackEmail,
    role: "user",
    createdAt: new Date().toISOString(),
  };
}

export async function createUser(input: AuthInput): Promise<Usuario> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          business_name: input.businessName,
        },
      },
    });

    if (error) throw error;

    const userId = data.user?.id ?? crypto.randomUUID();
    const user: Usuario = {
      id: userId,
      email: input.email,
      businessName: input.businessName,
      role: "user",
      createdAt: new Date().toISOString(),
    };

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      business_name: user.businessName,
      role: user.role,
    });

    return user;
  }

  const user: Usuario = {
    id: crypto.randomUUID(),
    email: input.email,
    businessName: input.businessName,
    role: "user",
    createdAt: new Date().toISOString(),
  };
  saveUser({ name: input.businessName, email: input.email, role: user.role });
  return user;
}

export async function loginUser(input: AuthInput): Promise<Usuario> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) throw error;

    return getProfile(data.user.id, data.user.email ?? input.email);
  }

  if (input.email === "admin@shipflow.local" && input.password !== "admin123") {
    throw new Error("Credenciales de administrador inválidas.");
  }

  const currentUser = getUser();
  const role = input.email === "admin@shipflow.local" ? "admin" : "user";
  const user: Usuario = {
    id: role === "admin" ? "demo-admin" : crypto.randomUUID(),
    email: input.email,
    businessName: role === "admin" ? "Administrador Demo" : currentUser?.name,
    role,
    createdAt: new Date().toISOString(),
  };
  saveUser({ name: user.businessName, email: input.email, role });
  return user;
}

export async function getCurrentUser(): Promise<Usuario | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    return getProfile(data.user.id, data.user.email ?? "");
  }

  const user = getUser();
  if (!user) return null;

  return {
    id: "demo-user",
    email: user.email,
    businessName: user.name,
    role: user.role ?? (user.email === "admin@shipflow.local" ? "admin" : "user"),
    createdAt: new Date().toISOString(),
  };
}

export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }

  window.localStorage.removeItem("shipflow-user");
}

export async function getUsers(): Promise<Usuario[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<ProfileRow[]>();

    if (error) throw error;
    return data.map(profileToUser);
  }

  return getDemoUsers();
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [serverAccess, setServerAccess] = useState<{ userId: string; allowed: boolean } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        setServerAccess({ userId: user.id, allowed: false });
        return;
      }

      const response = await fetch("/api/admin/access", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServerAccess({ userId: user.id, allowed: response.ok });
    }).catch(() => setServerAccess({ userId: user.id, allowed: false }));
  }, [isAdmin, loading, router, user]);

  const adminAllowed = isSupabaseConfigured
    ? serverAccess && serverAccess.userId === user?.id
      ? serverAccess.allowed
      : null
    : isAdmin;

  if (!loading && user && adminAllowed === false) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-pink-950/10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-[#22C55E]">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <p className="mt-4 font-black text-slate-950">403 Admin access required</p>
          <p className="mt-2 text-sm text-slate-500">This support area is restricted to authorized operators.</p>
        </div>
      </div>
    );
  }

  if (loading || !user || adminAllowed !== true) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-pink-950/10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-[#22C55E]">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <p className="mt-4 font-black text-slate-950">Validating admin access</p>
          <p className="mt-2 text-sm text-slate-500">Checking user permissions.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

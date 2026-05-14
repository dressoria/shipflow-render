"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, router, user]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-pink-950/10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-[#22C55E]">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <p className="mt-4 font-black text-slate-950">Validando acceso admin</p>
          <p className="mt-2 text-sm text-slate-500">Revisando permisos del usuario.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

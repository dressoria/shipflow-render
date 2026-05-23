"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerified } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!emailVerified) {
      router.replace("/verifica-tu-correo");
    }
  }, [emailVerified, loading, pathname, router, user]);

  if (loading || !user || !emailVerified) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-pink-950/10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF1493,#FF4FB3_58%,#FF73C6)] text-white">
            <PackageCheck className="h-6 w-6" />
          </span>
          <p className="mt-4 font-black text-slate-950">Validating session</p>
          <p className="mt-2 text-sm text-slate-500">Preparing your dashboard.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

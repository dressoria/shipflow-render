"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/Badge";
import { AdminBalanceTable, AdminShipmentsTable, AdminUsersTable } from "@/components/AdminOverview";
import { LoadingState } from "@/components/LoadingState";
import { getAdminStats } from "@/lib/services/adminService";

type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;

export function AdminUsersView() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminStats().then(setStats);
    }, 0);
  }, []);

  return stats ? <AdminUsersTable users={stats.users} /> : <LoadingState />;
}

export function AdminShipmentsView() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminStats().then(setStats);
    }, 0);
  }, []);

  return stats ? <AdminShipmentsTable shipments={stats.shipments} /> : <LoadingState />;
}

export function AdminCouriersView() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminStats().then(setStats);
    }, 0);
  }, []);

  if (!stats) return <LoadingState />;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.couriers.map((courier) => (
        <div key={courier.name} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#FF1493,#FF4FB3_58%,#FF73C6)] text-sm font-black text-white">
            {courier.initials}
          </span>
          <h2 className="mt-5 font-black text-slate-950">{courier.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{courier.coverage}</p>
          <Badge tone={courier.status === "Conectado" ? "green" : "blue"} className="mt-4">
            {courier.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function AdminBalanceView() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminStats().then(setStats);
    }, 0);
  }, []);

  return stats ? <AdminBalanceTable movements={stats.movements} /> : <LoadingState />;
}

"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, PackageCheck, Truck, Users } from "lucide-react";
import { Badge } from "@/components/Badge";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/forms";
import { getAdminStats } from "@/lib/services/adminService";
import type { Envio, MovimientoSaldo, Usuario } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;

function displayShipmentStatus(status: Envio["status"]) {
  if (status === "Entregado") return "Delivered";
  if (status === "En tránsito") return "In transit";
  if (status === "Pendiente") return "Pending";
  return status;
}

export function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminStats().then(setStats);
    }, 0);
  }, []);

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LoadingState />
        <LoadingState />
        <LoadingState />
        <LoadingState />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers.toString()} detail="profiles" icon={Users} />
        <StatCard label="Total shipments" value={stats.totalShipments.toString()} detail="labels" icon={PackageCheck} />
        <StatCard label="Pending" value={stats.pendingShipments.toString()} detail="to dispatch" icon={Truck} />
        <StatCard label="Balance loaded" value={formatCurrency(stats.totalRecharged)} detail="historical" icon={CircleDollarSign} tone="green" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RecentShipments shipments={stats.shipments.slice(0, 6)} />
        <RecentUsers users={stats.users.slice(0, 6)} />
      </div>
    </>
  );
}

export function AdminUsersTable({ users }: { users: Usuario[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="grid min-w-[680px] grid-cols-[1.2fr_1fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
        <span>Email</span>
        <span>Name</span>
        <span>Role</span>
        <span>Registered</span>
      </div>
      <div className="overflow-x-auto">
        {users.map((user) => (
          <div key={user.id} className="grid min-w-[680px] grid-cols-[1.2fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
            <span className="font-bold text-slate-950">{user.email}</span>
            <span className="text-slate-600">{user.businessName ?? "No name"}</span>
            <span><Badge tone={user.role === "admin" ? "blue" : "slate"}>{user.role}</Badge></span>
            <span className="text-slate-600">{formatDate(user.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminShipmentsTable({ shipments }: { shipments: Envio[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="grid min-w-[820px] grid-cols-[1fr_1.1fr_1fr_1fr_1fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
        <span>Label</span>
        <span>Customer</span>
        <span>Destination</span>
        <span>Courier</span>
        <span>Status</span>
        <span>Value</span>
      </div>
      <div className="overflow-x-auto">
        {shipments.map((shipment) => (
          <div key={shipment.id} className="grid min-w-[820px] grid-cols-[1fr_1.1fr_1fr_1fr_1fr_0.8fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
            <span className="font-black text-slate-950">{shipment.trackingNumber}</span>
            <span className="text-slate-600">{shipment.recipientName}</span>
            <span className="text-slate-600">{shipment.destinationCity}</span>
            <span className="text-slate-600">{shipment.courier}</span>
            <span><Badge tone={shipment.status === "Entregado" ? "green" : shipment.status === "Pendiente" ? "amber" : "blue"}>{displayShipmentStatus(shipment.status)}</Badge></span>
            <span className="font-bold text-slate-950">{formatCurrency(shipment.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminBalanceTable({ movements }: { movements: MovimientoSaldo[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="grid gap-3">
        {movements.map((movement) => (
          <div key={movement.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="font-bold text-slate-950">{movement.concept}</p>
              <p className="text-sm text-slate-500">{formatDate(movement.date)}</p>
            </div>
            <p className={movement.amount > 0 ? "font-black text-[#15803d]" : "font-black text-slate-700"}>
              {formatCurrency(movement.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentShipments({ shipments }: { shipments: Envio[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h2 className="font-black text-slate-950">Recent shipments</h2>
      <div className="mt-4 grid gap-3">
        {shipments.map((shipment) => (
          <div key={shipment.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="font-bold text-slate-950">{shipment.trackingNumber}</p>
              <p className="text-sm text-slate-500">{shipment.destinationCity} · {shipment.courier}</p>
            </div>
            <Badge tone={shipment.status === "Pendiente" ? "amber" : "blue"}>{displayShipmentStatus(shipment.status)}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentUsers({ users }: { users: Usuario[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h2 className="font-black text-slate-950">Recent registered users</h2>
      <div className="mt-4 grid gap-3">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="font-bold text-slate-950">{user.email}</p>
              <p className="text-sm text-slate-500">{user.businessName ?? "Account"}</p>
            </div>
            <Badge tone={user.role === "admin" ? "blue" : "slate"}>{user.role}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

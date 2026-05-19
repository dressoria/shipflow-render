"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleDollarSign, ExternalLink, PackageCheck, RotateCcw, ShieldAlert, Truck, Users } from "lucide-react";
import { Badge } from "@/components/Badge";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/forms";
import { getAdminStats } from "@/lib/services/adminService";
import type { AdminBalanceMovement, AdminShipment } from "@/lib/services/apiClient";
import type { AdminAuditEvent } from "@/lib/services/apiClient";
import type { Envio, MovimientoSaldo, Usuario } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;

function displayShipmentStatus(status: Envio["status"]) {
  if (status === "Entregado") return "Delivered";
  if (status === "En tránsito") return "In transit";
  if (status === "Pendiente") return "Pending";
  return status;
}

function statusTone(status?: string | null): "blue" | "green" | "amber" | "slate" {
  if (!status) return "slate";
  if (["paid", "purchased", "delivered"].includes(status)) return "green";
  if (["voided", "refunded"].includes(status)) return "amber";
  if (["failed", "exception"].includes(status)) return "amber";
  return "blue";
}

function displayStatus(status?: string | null) {
  if (!status) return "Not available";
  if (status === "internal") return "Processed";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayAuditEventType(eventType: string) {
  const labels: Record<string, string> = {
    payment_checkout_started: "Payment checkout started",
    payment_checkout_created: "Payment checkout created",
    payment_checkout_failed: "Payment checkout failed",
    payment_webhook_received: "Payment webhook received",
    payment_recharge_succeeded: "Payment recharge succeeded",
    payment_recharge_duplicate_ignored: "Duplicate payment ignored",
    payment_recharge_db_failed: "Payment recharge save failed",
    payment_recharge_amount_mismatch: "Payment amount mismatch",
    payment_recharge_signature_failed: "Payment signature failed",
  };
  return labels[eventType] ?? displayStatus(eventType);
}

export function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminStats().then(setStats).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We could not load admin data.");
      });
    }, 0);
  }, []);

  if (error) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="font-black">Admin data unavailable</h2>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

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
        <StatCard label="Total shipments" value={stats.totalShipments.toString()} detail="records" icon={PackageCheck} />
        <StatCard label="Labels purchased" value={stats.totals.labelsPurchased.toString()} detail="carrier labels" icon={Truck} />
        <StatCard label="Labels voided" value={stats.totals.labelsVoided.toString()} detail="refund review" icon={RotateCcw} />
        <StatCard label="Total recharged" value={formatCurrency(stats.totals.totalRecharged)} detail="ledger" icon={CircleDollarSign} tone="green" />
        <StatCard label="Label spend" value={formatCurrency(stats.totals.totalLabelSpend)} detail="debits" icon={CircleDollarSign} />
        <StatCard label="Refunds" value={formatCurrency(stats.totals.totalRefunded)} detail="void refunds" icon={RotateCcw} tone="green" />
        <StatCard label="Reconciliation" value={stats.reconciliation.pendingCount.toString()} detail="pending" icon={ShieldAlert} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RecentShipments shipments={stats.shipments.slice(0, 6)} />
        <RecentBalanceActivity movements={stats.movements.slice(0, 6)} />
      </div>
      <div className="mt-6">
        <AdminAuditEventsTable events={(stats.auditEvents ?? []).slice(0, 8)} compact />
      </div>
      <ReconciliationNotice notes={stats.reconciliation.notes} />
    </>
  );
}

function severityTone(severity?: string): "blue" | "green" | "amber" | "slate" {
  if (severity === "critical" || severity === "error") return "amber";
  if (severity === "warning") return "amber";
  if (severity === "info") return "blue";
  return "slate";
}

export function AdminUsersTable({ users }: { users: Usuario[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="overflow-x-auto">
        <div className="grid min-w-[680px] grid-cols-[1.2fr_1fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
          <span>Email</span>
          <span>Name</span>
          <span>Role</span>
          <span>Registered</span>
        </div>
        {users.map((user) => (
          <div key={user.id} className="grid min-w-[680px] grid-cols-[1.2fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
            <span className="break-words font-bold text-slate-950">{user.email}</span>
            <span className="text-slate-600">{user.businessName ?? "No name"}</span>
            <span><Badge tone={user.role === "admin" ? "blue" : "slate"}>{user.role}</Badge></span>
            <span className="text-slate-600">{formatDate(user.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminShipmentsTable({ shipments }: { shipments: AdminShipment[] | Envio[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="overflow-x-auto">
        <div className="grid min-w-[1180px] grid-cols-[1.1fr_1.2fr_1fr_1fr_0.9fr_0.9fr_0.9fr_1fr_1.2fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
          <span>Tracking</span>
          <span>User</span>
          <span>Recipient</span>
          <span>Destination</span>
          <span>Carrier</span>
          <span>Label</span>
          <span>Payment</span>
          <span>Total</span>
          <span>Actions</span>
        </div>
        {shipments.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">No shipments found.</div>
        ) : (
          shipments.map((shipment) => {
            const adminShipment = shipment as AdminShipment;
            return (
              <div key={shipment.id} className="grid min-w-[1180px] grid-cols-[1.1fr_1.2fr_1fr_1fr_0.9fr_0.9fr_0.9fr_1fr_1.2fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
                <span className="break-words font-black text-slate-950">{shipment.trackingNumber}</span>
                <span className="break-words text-slate-600">{adminShipment.userEmail ?? shipment.userId ?? "Unknown"}</span>
                <span className="text-slate-600">{shipment.recipientName}</span>
                <span className="text-slate-600">{shipment.destinationCity}</span>
                <span className="text-slate-600">{shipment.courier}</span>
                <span><Badge tone={statusTone(shipment.labelStatus)}>{displayStatus(shipment.labelStatus)}</Badge></span>
                <span><Badge tone={statusTone(shipment.paymentStatus)}>{displayStatus(shipment.paymentStatus)}</Badge></span>
                <span className="font-bold text-slate-950">{formatCurrency(shipment.customerPrice ?? shipment.total ?? shipment.value)}</span>
                <span className="flex flex-wrap gap-2">
                  <Link className="font-bold text-[#FF1493]" href={`/guia/${shipment.trackingNumber}`}>View shipment</Link>
                  <Link className="font-bold text-[#FF1493]" href={`/tracking?trackingNumber=${shipment.trackingNumber}`}>Track</Link>
                  {shipment.labelUrl ? (
                    <a className="inline-flex items-center gap-1 font-bold text-[#FF1493]" href={shipment.labelUrl} target="_blank" rel="noreferrer">
                      Label <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function AdminBalanceTable({ movements }: { movements: AdminBalanceMovement[] | MovimientoSaldo[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-black text-slate-950">Recent balance activity</h2>
          <p className="text-sm text-slate-500">Read-only during beta. Manual adjustments are disabled.</p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-black text-slate-400"
        >
          Manual adjustment unavailable
        </button>
      </div>
      <div className="grid gap-3">
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">No balance activity found.</p>
        ) : (
          movements.map((movement) => {
            const adminMovement = movement as AdminBalanceMovement;
            return (
              <div key={movement.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="break-words font-bold text-slate-950">{movement.concept}</p>
                  <p className="break-words text-sm text-slate-500">
                    {adminMovement.userEmail ? `${adminMovement.userEmail} · ` : ""}
                    {adminMovement.trackingNumber ? `Tracking ${adminMovement.trackingNumber} · ` : ""}
                    {formatDate(movement.date)}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {movement.type ?? "movement"} {movement.referenceType ? `· ${movement.referenceType}` : ""}
                  </p>
                  {adminMovement.reason ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Reason: {adminMovement.reason}
                      {adminMovement.note ? ` · Note: ${adminMovement.note}` : ""}
                    </p>
                  ) : null}
                </div>
                <p className={movement.amount > 0 ? "shrink-0 font-black text-[#15803d]" : "shrink-0 font-black text-slate-700"}>
                  {formatCurrency(movement.amount)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function AdminAuditEventsTable({ events, compact = false }: { events: AdminAuditEvent[]; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h2 className="font-black text-slate-950">Reconciliation & audit</h2>
          <p className="text-sm text-slate-500">Read-only operational events. Sensitive provider data is hidden.</p>
        </div>
        <Badge tone="amber">Persistent resolve workflow pending</Badge>
      </div>
      {events.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500">No audit events yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[900px] grid-cols-[0.8fr_1.3fr_1fr_1fr_1.8fr_1fr] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
            <span>Severity</span>
            <span>Event</span>
            <span>Entity</span>
            <span>Tracking</span>
            <span>Message</span>
            <span>Date</span>
          </div>
          {events.map((event) => (
            <div key={event.id} className="grid min-w-[900px] grid-cols-[0.8fr_1.3fr_1fr_1fr_1.8fr_1fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
              <span><Badge tone={severityTone(event.severity)}>{displayStatus(event.severity)}</Badge></span>
              <span className="break-words font-bold text-slate-950">{displayAuditEventType(event.eventType)}</span>
              <span className="text-slate-600">{event.entityType ?? "Not available"}</span>
              <span className="text-slate-600">{event.trackingNumber ?? "Not available"}</span>
              <span className="break-words text-slate-600">{event.message}</span>
              <span className="text-slate-600">{formatDate(event.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
      {compact ? (
        <div className="border-t border-slate-100 px-5 py-3">
          <Link className="text-sm font-black text-[#FF1493]" href="/admin/audit">View all audit events</Link>
        </div>
      ) : null}
    </div>
  );
}

function RecentShipments({ shipments }: { shipments: AdminShipment[] | Envio[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h2 className="font-black text-slate-950">Recent shipments</h2>
      <div className="mt-4 grid gap-3">
        {shipments.length === 0 ? (
          <p className="text-sm text-slate-500">No shipments yet.</p>
        ) : (
          shipments.map((shipment) => (
            <div key={shipment.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="break-words font-bold text-slate-950">{shipment.trackingNumber}</p>
                <p className="text-sm text-slate-500">{shipment.destinationCity} · {shipment.courier}</p>
              </div>
              <Badge tone={shipment.status === "Pendiente" ? "amber" : "blue"}>{displayShipmentStatus(shipment.status)}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RecentBalanceActivity({ movements }: { movements: AdminBalanceMovement[] | MovimientoSaldo[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h2 className="font-black text-slate-950">Recent balance activity</h2>
      <div className="mt-4 grid gap-3">
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">No balance activity yet.</p>
        ) : (
          movements.map((movement) => (
            <div key={movement.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="break-words font-bold text-slate-950">{movement.concept}</p>
                <p className="text-sm text-slate-500">{formatDate(movement.date)}</p>
              </div>
              <span className={movement.amount > 0 ? "shrink-0 font-black text-[#15803d]" : "shrink-0 font-black text-slate-700"}>
                {formatCurrency(movement.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReconciliationNotice({ notes }: { notes: string[] }) {
  return (
    <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <h2 className="font-black">Reconciliation pending</h2>
      <p className="mt-2 text-sm leading-6">
        Read-only during beta. A reconciliation queue is not implemented yet.
      </p>
      <ul className="mt-3 grid gap-2 text-sm">
        {notes.map((note) => (
          <li key={note}>• {note}</li>
        ))}
      </ul>
    </div>
  );
}

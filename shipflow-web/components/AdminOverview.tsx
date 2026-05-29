"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleDollarSign, ExternalLink, PackageCheck, RotateCcw, ShieldAlert, Truck, Users } from "lucide-react";
import { Badge } from "@/components/Badge";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/forms";
import { getAdminStats } from "@/lib/services/adminService";
import { apiGetConfigStatus, type ConfigStatus } from "@/lib/services/apiClient";
import type { AdminBalanceMovement, AdminShipment } from "@/lib/services/apiClient";
import type { AdminAuditEvent } from "@/lib/services/apiClient";
import type { Envio, MovimientoSaldo, Usuario } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;
type ProfitRange = "today" | "7d" | "30d" | "all";

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
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [profitRange, setProfitRange] = useState<ProfitRange>("30d");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminStats().then(setStats).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We could not load admin data.");
      });
      apiGetConfigStatus().then(setConfigStatus).catch(() => setConfigStatus(null));
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
      <BetaModeNotice configStatus={configStatus} />
      <ProfitabilityPanel
        shipments={stats.shipments}
        range={profitRange}
        onRangeChange={setProfitRange}
      />
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

function inferPaymentMethod(shipment: Envio): "Wallet" | "Card" | null {
  const breakdown = shipment.pricingBreakdown;
  if (breakdown && typeof breakdown.paymentMethod === "string") {
    if (breakdown.paymentMethod === "card") return "Card";
    if (breakdown.paymentMethod === "wallet") return "Wallet";
  }
  if (shipment.pricingModel === "direct_label_payment") return "Card";
  if (shipment.pricingModel === "shipflow_v1") return "Wallet";
  return null;
}

function shipmentAmount(shipment: Envio, key: "customer" | "provider" | "markup" | "fee") {
  if (key === "customer") return shipment.customerPrice ?? shipment.total ?? shipment.value ?? 0;
  if (key === "provider") return shipment.providerCost ?? 0;
  if (key === "markup") return shipment.platformMarkup ?? 0;
  return shipment.paymentFee ?? 0;
}

function isInProfitRange(shipment: Envio, range: ProfitRange) {
  if (range === "all") return true;
  const createdAt = new Date(shipment.date).getTime();
  if (!Number.isFinite(createdAt)) return false;
  const now = new Date();
  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return createdAt >= start;
  }
  const days = range === "7d" ? 7 : 30;
  return createdAt >= now.getTime() - days * 24 * 60 * 60 * 1000;
}

function BetaModeNotice({ configStatus }: { configStatus: ConfigStatus | null }) {
  return (
    <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-950">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-black">Test/Beta label mode</h2>
          <p className="mt-1 text-sm leading-6">
            Labels remain enabled for beta. Keep provider credentials in the current sandbox/test setup until the real-label launch decision is made.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={configStatus?.realLabelPurchaseEnabled ? "green" : "amber"}>
            Labels {configStatus?.realLabelPurchaseEnabled ? "enabled" : "disabled"}
          </Badge>
          <Badge tone={configStatus?.processLabelInWebhookEnabled ? "green" : "slate"}>
            Auto process {configStatus?.processLabelInWebhookEnabled ? "on" : "off"}
          </Badge>
          <Badge tone="amber">Beta</Badge>
        </div>
      </div>
    </div>
  );
}

function ProfitabilityPanel({
  shipments,
  range,
  onRangeChange,
}: {
  shipments: AdminShipment[];
  range: ProfitRange;
  onRangeChange: (range: ProfitRange) => void;
}) {
  const filtered = shipments.filter((shipment) => {
    const purchased = shipment.labelStatus === "purchased";
    return purchased && isInProfitRange(shipment, range);
  });

  const totals = filtered.reduce(
    (acc, shipment) => {
      const customer = shipmentAmount(shipment, "customer");
      const provider = shipmentAmount(shipment, "provider");
      const markup = shipmentAmount(shipment, "markup");
      const fee = shipmentAmount(shipment, "fee");
      const paymentMethod = inferPaymentMethod(shipment);
      acc.customer += customer;
      acc.provider += provider;
      acc.markup += markup;
      acc.fees += fee;
      acc.margin += Math.max(0, customer - provider - fee);
      acc.labels += 1;
      if (paymentMethod === "Card") acc.card += 1;
      if (paymentMethod === "Wallet") acc.wallet += 1;
      return acc;
    },
    { customer: 0, provider: 0, markup: 0, fees: 0, margin: 0, labels: 0, card: 0, wallet: 0 },
  );

  const ranges: Array<{ value: ProfitRange; label: string }> = [
    { value: "today", label: "Today" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "all", label: "All time" },
  ];

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-black text-slate-950">Profitability snapshot</h2>
          <p className="text-sm text-slate-500">
            Estimate based on purchased labels with pricing fields populated. Refund/void accounting remains manual during beta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onRangeChange(item.value)}
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                range === item.value
                  ? "bg-[#2563EB] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-[#2563EB]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-6">
        <MiniMetric label="Customer charged" value={formatCurrency(totals.customer)} />
        <MiniMetric label="Provider cost" value={formatCurrency(totals.provider)} />
        <MiniMetric label="Platform markup" value={formatCurrency(totals.markup)} />
        <MiniMetric label="Est. payment fees" value={formatCurrency(totals.fees)} />
        <MiniMetric label="Gross margin" value={formatCurrency(totals.margin)} tone="green" />
        <MiniMetric label="Labels" value={String(totals.labels)} />
      </div>
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-sm font-bold text-slate-700">
          Payment split: {totals.wallet} wallet · {totals.card} card · {Math.max(0, totals.labels - totals.wallet - totals.card)} unknown
        </p>
      </div>
      <div className="overflow-x-auto border-t border-slate-100">
        <div className="grid min-w-[900px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] gap-4 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
          <span>Shipment</span>
          <span>Payment</span>
          <span>Charged</span>
          <span>Cost</span>
          <span>Fees</span>
          <span>Margin</span>
        </div>
        {filtered.slice(0, 8).map((shipment) => {
          const charged = shipmentAmount(shipment, "customer");
          const cost = shipmentAmount(shipment, "provider");
          const fee = shipmentAmount(shipment, "fee");
          const margin = Math.max(0, charged - cost - fee);
          return (
            <div key={shipment.id} className="grid min-w-[900px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-t border-slate-100 px-5 py-3 text-sm">
              <span className="break-words font-bold text-slate-950">{shipment.trackingNumber}</span>
              <span className="text-slate-600">{inferPaymentMethod(shipment) ?? "Unknown"}</span>
              <span>{formatCurrency(charged)}</span>
              <span>{formatCurrency(cost)}</span>
              <span>{formatCurrency(fee)}</span>
              <span className="font-black text-[#15803d]">{formatCurrency(margin)}</span>
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No purchased labels in this range.</div>
        ) : null}
      </div>
    </section>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${tone === "green" ? "text-[#15803d]" : "text-slate-950"}`}>
        {value}
      </p>
    </div>
  );
}

export function AdminShipmentsTable({ shipments }: { shipments: AdminShipment[] | Envio[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="overflow-x-auto">
        <div className="grid min-w-[1280px] grid-cols-[1.1fr_1.2fr_1fr_1fr_0.9fr_0.9fr_0.9fr_1.2fr_1.2fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
          <span>Tracking</span>
          <span>User</span>
          <span>Recipient</span>
          <span>Destination</span>
          <span>Carrier</span>
          <span>Label</span>
          <span>Payment</span>
          <span>Charged / Cost</span>
          <span>Actions</span>
        </div>
        {shipments.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">No shipments found.</div>
        ) : (
          shipments.map((shipment) => {
            const adminShipment = shipment as AdminShipment;
            const paymentMethod = inferPaymentMethod(shipment);
            const hasCostBreakdown = shipment.providerCost != null;
            const marginUsd = hasCostBreakdown ? ((shipment.platformMarkup ?? 0)) : null;
            return (
              <div key={shipment.id} className="grid min-w-[1280px] grid-cols-[1.1fr_1.2fr_1fr_1fr_0.9fr_0.9fr_0.9fr_1.2fr_1.2fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-0">
                <span className="break-words font-black text-slate-950">{shipment.trackingNumber}</span>
                <span className="break-words text-slate-600">{adminShipment.userEmail ?? shipment.userId ?? "Unknown"}</span>
                <span className="text-slate-600">{shipment.recipientName}</span>
                <span className="text-slate-600">{shipment.destinationCity}</span>
                <span className="text-slate-600">{shipment.courier}</span>
                <span><Badge tone={statusTone(shipment.labelStatus)}>{displayStatus(shipment.labelStatus)}</Badge></span>
                <div>
                  <Badge tone={statusTone(shipment.paymentStatus)}>{displayStatus(shipment.paymentStatus)}</Badge>
                  {paymentMethod ? (
                    <p className="mt-0.5 text-xs text-slate-500">{paymentMethod}</p>
                  ) : null}
                </div>
                <div>
                  <p className="font-bold text-slate-950">{formatCurrency(shipment.customerPrice ?? shipment.total ?? shipment.value)}</p>
                  {hasCostBreakdown ? (
                    <p className="text-xs text-slate-500">
                      Cost {formatCurrency(shipment.providerCost!)} · +{formatCurrency(marginUsd!)}
                    </p>
                  ) : null}
                </div>
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

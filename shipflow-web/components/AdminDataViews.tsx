"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/Badge";
import { AdminAuditEventsTable, AdminBalanceTable, AdminShipmentsTable, AdminUsersTable } from "@/components/AdminOverview";
import { LoadingState } from "@/components/LoadingState";
import {
  createAdminBalanceAdjustment,
  getAdminAuditEvents,
  getAdminBalanceMovements,
  getAdminShipments,
  getAdminStats,
} from "@/lib/services/adminService";
import type { AdminAuditEvent, AdminBalanceMovement, AdminShipment } from "@/lib/services/apiClient";
import type { Usuario } from "@/lib/types";

type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;

export function AdminUsersView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminStats().then(setStats).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We could not load users.");
      });
    }, 0);
  }, []);

  if (error) return <AdminLoadError message={error} />;
  return stats ? <AdminUsersTable users={stats.users} /> : <LoadingState />;
}

export function AdminShipmentsView() {
  const [shipments, setShipments] = useState<AdminShipment[] | null>(null);
  const [query, setQuery] = useState("");
  const [labelStatus, setLabelStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminShipments().then((data) => setShipments(data as AdminShipment[])).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We could not load shipments.");
      });
    }, 0);
  }, []);

  if (error) return <AdminLoadError message={error} />;
  if (!shipments) return <LoadingState />;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredShipments = shipments.filter((shipment) => {
    const matchesQuery =
      !normalizedQuery ||
      shipment.trackingNumber.toLowerCase().includes(normalizedQuery) ||
      shipment.recipientName.toLowerCase().includes(normalizedQuery) ||
      shipment.destinationCity.toLowerCase().includes(normalizedQuery) ||
      shipment.userEmail?.toLowerCase().includes(normalizedQuery);
    const matchesLabel = !labelStatus || shipment.labelStatus === labelStatus;
    const matchesPayment = !paymentStatus || shipment.paymentStatus === paymentStatus;
    return matchesQuery && matchesLabel && matchesPayment;
  });

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tracking, email, recipient, or city"
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
          />
          <select
            value={labelStatus}
            onChange={(event) => setLabelStatus(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
          >
            <option value="">All labels</option>
            <option value="purchased">Purchased</option>
            <option value="voided">Voided</option>
            <option value="internal">Internal</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
          >
            <option value="">All payments</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
            <option value="unpaid">Unpaid</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      <AdminShipmentsTable shipments={filteredShipments} />
    </div>
  );
}

export function AdminCouriersView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminStats().then(setStats).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We could not load couriers.");
      });
    }, 0);
  }, []);

  if (error) return <AdminLoadError message={error} />;
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
            {courier.status === "Conectado" ? "Connected" : "Planned"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function AdminBalanceView() {
  const [movements, setMovements] = useState<AdminBalanceMovement[] | null>(null);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refresh() {
    const [nextMovements, stats] = await Promise.all([
      getAdminBalanceMovements(),
      getAdminStats(),
    ]);
    setMovements(nextMovements as AdminBalanceMovement[]);
    setUsers(stats.users);
  }

  useEffect(() => {
    window.setTimeout(() => {
      refresh().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We could not load balance movements.");
      });
    }, 0);
  }, []);

  if (error) return <AdminLoadError message={error} />;
  if (!movements) return <LoadingState />;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredMovements = movements.filter((movement) => {
    const matchesQuery =
      !normalizedQuery ||
      movement.concept.toLowerCase().includes(normalizedQuery) ||
      movement.userEmail?.toLowerCase().includes(normalizedQuery) ||
      movement.trackingNumber?.toLowerCase().includes(normalizedQuery);
    const matchesType = !type || movement.type === type;
    return matchesQuery && matchesType;
  });

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_220px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search email, tracking, or concept"
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
          >
            <option value="">All types</option>
            <option value="recharge">Recharge</option>
            <option value="debit">Debit</option>
            <option value="refund">Refund</option>
            <option value="adjustment">Adjustment</option>
            <option value="fee">Fee</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSuccess(null);
              setShowAdjustmentForm(true);
            }}
            className="h-11 rounded-2xl bg-[#FF1493] px-4 text-sm font-black text-white shadow-lg shadow-pink-500/20"
          >
            Manual adjustment
          </button>
        </div>
      </div>
      {success ? (
        <div className="rounded-3xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
          {success}
        </div>
      ) : null}
      {showAdjustmentForm ? (
        <ManualAdjustmentForm
          users={users}
          onCancel={() => setShowAdjustmentForm(false)}
          onCreated={async () => {
            setShowAdjustmentForm(false);
            setSuccess("Balance adjustment created.");
            await refresh();
          }}
        />
      ) : null}
      <AdminBalanceTable movements={filteredMovements} />
    </div>
  );
}

export function AdminAuditView() {
  const [events, setEvents] = useState<AdminAuditEvent[] | null>(null);
  const [severity, setSeverity] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      getAdminAuditEvents().then(setEvents).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We could not load audit events.");
      });
    }, 0);
  }, []);

  if (error) return <AdminLoadError message={error} />;
  if (!events) return <LoadingState />;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEvents = events.filter((event) => {
    const matchesSeverity = !severity || event.severity === severity;
    const matchesQuery =
      !normalizedQuery ||
      event.eventType.toLowerCase().includes(normalizedQuery) ||
      event.message.toLowerCase().includes(normalizedQuery) ||
      event.trackingNumber?.toLowerCase().includes(normalizedQuery) ||
      event.requestId?.toLowerCase().includes(normalizedQuery);
    return matchesSeverity && matchesQuery;
  });

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search event, message, tracking, or request ID"
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
          />
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
          >
            <option value="">All severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <AdminAuditEventsTable events={filteredEvents} />
    </div>
  );
}

function ManualAdjustmentForm({
  users,
  onCancel,
  onCreated,
}: {
  users: Usuario[];
  onCancel: () => void;
  onCreated: () => Promise<void>;
}) {
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [mode, setMode] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const signedAmount = Number(amount) * (mode === "deduct" ? -1 : 1);
      await createAdminBalanceAdjustment({
        userId,
        amount: signedAmount,
        reason,
        note,
        idempotencyKey,
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not create this adjustment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-black text-slate-950">Manual balance adjustment</h2>
          <p className="mt-1 text-sm text-slate-500">
            This creates an administrative balance adjustment. It is not a payment.
          </p>
        </div>
        <Badge tone="amber">Beta admin action</Badge>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          User
          <select
            required
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Type
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as "add" | "deduct")}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white"
          >
            <option value="add">Add funds</option>
            <option value="deduct">Deduct funds</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Amount
          <input
            required
            min="0.01"
            max="500"
            step="0.01"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Reason
          <input
            required
            maxLength={160}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Beta support test credit"
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:bg-white"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
          Note
          <textarea
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional internal support note"
            className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-pink-400 focus:bg-white"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="h-11 rounded-2xl bg-[#FF1493] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating adjustment..." : "Create adjustment"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AdminLoadError({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <h2 className="font-black">Admin data unavailable</h2>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

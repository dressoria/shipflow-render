"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Clock, Copy, RefreshCw, XCircle } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import {
  apiAdminGetLabelOrder,
  apiGetConfigFeatures,
  apiGetConfigStatus,
  type ConfigFeatures,
  type ConfigStatus,
} from "@/lib/services/apiClient";
import {
  getAdminLabelOrders,
  markAdminLabelOrderActionRequired,
  markAdminLabelOrderRefundNeeded,
  markAdminLabelOrderRefundedManual,
  markAdminLabelOrderExpired,
  expireStaleAdminLabelOrders,
  processAdminLabelOrder,
  refundAdminLabelOrder,
} from "@/lib/services/adminService";
import type { PendingLabelOrder, PendingLabelOrderStatus } from "@/lib/types";
import {
  canMarkActionRequired,
  canMarkRefundedManual,
  canMarkRefundNeeded,
  canProcessLabelOrder,
  canRefundLabelOrder,
  getLabelOrderStatusDescription,
  getLabelOrderStatusLabel,
} from "@/lib/label-order-status";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(value: string | undefined, n = 12) {
  if (!value) return "—";
  if (value.length <= n) return value;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

function copyToClipboard(value: string) {
  navigator.clipboard.writeText(value).catch(() => undefined);
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PendingLabelOrderStatus, string> = {
  pending_payment: "bg-slate-100 text-slate-700",
  paid_test_mode: "bg-purple-100 text-purple-700",
  paid_waiting_label_purchase: "bg-blue-100 text-blue-700",
  label_purchase_pending: "bg-yellow-100 text-yellow-700",
  label_purchased: "bg-green-100 text-green-700",
  action_required: "bg-orange-100 text-orange-800",
  refund_needed: "bg-red-100 text-red-700",
  refund_pending: "bg-pink-100 text-pink-700",
  refunded: "bg-teal-100 text-teal-700",
  expired: "bg-slate-100 text-slate-500",
  canceled: "bg-slate-100 text-slate-400",
};

function StatusBadge({ status }: { status: PendingLabelOrderStatus }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${style}`}
      title={getLabelOrderStatusDescription(status)}
    >
      {getLabelOrderStatusLabel(status)}
    </span>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-slate-700"
      >
        {label}
        <span className="text-xs font-normal text-slate-400">{open ? "collapse" : "expand"}</span>
      </button>
      {open && (
        <pre className="overflow-x-auto px-4 pb-4 text-xs text-slate-600">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ReasonDialog({
  title,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="font-black text-slate-950">{title}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          rows={3}
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#FF1493]"
        />
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            disabled={!reason.trim() || loading}
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 rounded-2xl bg-[#FF1493] py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {loading ? "Saving…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundDialog({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (input: { reason: string; confirmation: "REFUND" }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const canSubmit = reason.trim().length > 0 && confirmation.trim() === "REFUND";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="font-black text-slate-950">Refund in Stripe</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This calls Stripe and returns the captured label payment. It does not touch wallet balance.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason or support note (required)"
          rows={3}
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#FF1493]"
        />
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="Type REFUND"
          className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
        />
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            disabled={!canSubmit || loading}
            onClick={() => onConfirm({ reason: reason.trim(), confirmation: "REFUND" })}
            className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {loading ? "Refunding…" : "Refund"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

type DialogState =
  | { type: "action_required"; orderId: string }
  | { type: "refund_needed"; orderId: string }
  | { type: "refund"; orderId: string }
  | { type: "manual_refunded"; orderId: string }
  | { type: "process_label"; orderId: string }
  | null;

function OrderDetail({
  order,
  configStatus,
  configFeatures,
  onClose,
  onMutated,
}: {
  order: PendingLabelOrder;
  configStatus: ConfigStatus | null;
  configFeatures: ConfigFeatures | null;
  onClose: () => void;
  onMutated: (updated: PendingLabelOrder) => void;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState<string | null>(null);

  async function handleActionRequired(reason: string) {
    setMutating(true);
    setMutateError(null);
    try {
      const result = await markAdminLabelOrderActionRequired(order.id, reason);
      onMutated(result.order);
      setDialog(null);
    } catch (err) {
      setMutateError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setMutating(false);
    }
  }

  async function handleRefundNeeded(reason: string) {
    setMutating(true);
    setMutateError(null);
    try {
      const result = await markAdminLabelOrderRefundNeeded(order.id, reason);
      onMutated(result.order);
      setDialog(null);
    } catch (err) {
      setMutateError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setMutating(false);
    }
  }

  async function handleRefund(input: { reason: string; confirmation: "REFUND" }) {
    setMutating(true);
    setMutateError(null);
    try {
      const result = await refundAdminLabelOrder(order.id, input);
      onMutated(result.order);
      setDialog(null);
    } catch (err) {
      setMutateError(err instanceof Error ? err.message : "Refund failed.");
    } finally {
      setMutating(false);
    }
  }

  async function handleManualRefunded(reason: string) {
    setMutating(true);
    setMutateError(null);
    try {
      const result = await markAdminLabelOrderRefundedManual(order.id, reason);
      onMutated(result.order);
      setDialog(null);
    } catch (err) {
      setMutateError(err instanceof Error ? err.message : "Manual refund recording failed.");
    } finally {
      setMutating(false);
    }
  }

  async function handleMarkExpired() {
    if (!confirm("Mark this order as expired? Only pending_payment orders can be expired.")) return;
    setMutating(true);
    setMutateError(null);
    try {
      const result = await markAdminLabelOrderExpired(order.id);
      onMutated(result.order);
    } catch (err) {
      setMutateError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setMutating(false);
    }
  }

  async function handleProcessLabel() {
    if (
      !confirm(
        "Purchase label now? This calls the carrier API using the stored rate snapshot.\n\n" +
          "Requires ENABLE_REAL_LABEL_PURCHASE=true on the server.",
      )
    ) {
      return;
    }
    setMutating(true);
    setMutateError(null);
    setProcessResult(null);
    try {
      const result = await processAdminLabelOrder(order.id);
      setProcessResult(
        `Label purchased. Tracking: ${result.trackingNumber} · Shipment: ${result.shipmentId}${result.labelUrl ? " · Label ready" : ""}`,
      );
      const refreshed = await apiAdminGetLabelOrder(order.id);
      onMutated(refreshed.order);
    } catch (err) {
      setMutateError(err instanceof Error ? err.message : "Label purchase failed.");
    } finally {
      setMutating(false);
    }
  }

  return (
    <>
      {dialog?.type === "action_required" && (
        <ReasonDialog
          title="Mark as action_required"
          onConfirm={handleActionRequired}
          onCancel={() => setDialog(null)}
          loading={mutating}
        />
      )}
      {dialog?.type === "refund_needed" && (
        <ReasonDialog
          title="Mark as refund_needed"
          onConfirm={handleRefundNeeded}
          onCancel={() => setDialog(null)}
          loading={mutating}
        />
      )}
      {dialog?.type === "manual_refunded" && (
        <ReasonDialog
          title="Record manual Stripe refund"
          onConfirm={handleManualRefunded}
          onCancel={() => setDialog(null)}
          loading={mutating}
        />
      )}
      {dialog?.type === "refund" && (
        <RefundDialog
          onConfirm={handleRefund}
          onCancel={() => setDialog(null)}
          loading={mutating}
        />
      )}

      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              <span className="font-mono text-xs text-slate-400">{order.id}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            {getLabelOrderStatusDescription(order.status)}
          </p>

          <div className="mt-4 grid gap-2 text-sm">
            <Row label="Order ID" value={order.id} mono />
            <Row label="User ID" value={order.userId} mono />
            <Row label="Provider" value={order.provider} />
            <Row label="Service" value={order.serviceName ?? order.serviceCode ?? "—"} />
            <Row
              label="Amount"
              value={`${formatCents(order.amountCents, order.currency)} (${order.amountCents} cents)`}
            />
            <Row label="Currency" value={order.currency.toUpperCase()} />
            <Row label="Created" value={formatDate(order.createdAt)} />
            <Row label="Updated" value={formatDate(order.updatedAt)} />
            <Row label="Expires at" value={formatDate(order.expiresAt)} />
            <Row label="Paid at" value={formatDate(order.paidAt)} />
            <Row label="Processed at" value={formatDate(order.processedAt)} />
            <Row label="Tracking" value={order.trackingNumber ?? "—"} />
            {order.trackingNumber && (
              <CopyRow label="Copy tracking" value={order.trackingNumber} />
            )}
            <Row label="Label ID" value={order.labelId ?? "—"} mono />
            <Row label="Shipment ID" value={order.shipmentId ?? "—"} mono />
            {order.shipmentId && (
              <CopyRow label="Copy shipment ID" value={order.shipmentId} />
            )}
            {order.stripeCheckoutSessionId && (
              <CopyRow label="Stripe session" value={order.stripeCheckoutSessionId} />
            )}
            {order.stripePaymentIntentId && (
              <CopyRow label="Stripe PI" value={order.stripePaymentIntentId} />
            )}
            {order.stripeRefundId && (
              <CopyRow label="Stripe refund ID" value={order.stripeRefundId} />
            )}
            <Row label="Refund attempted" value={formatDate(order.refundAttemptedAt)} />
            <Row label="Refunded at" value={formatDate(order.refundedAt)} />
            {order.refundErrorMessage && (
              <div className="rounded-2xl bg-red-50 px-4 py-3">
                <p className="text-xs font-bold text-red-700">Refund error</p>
                <p className="mt-1 text-sm text-red-600">{order.refundErrorMessage}</p>
              </div>
            )}
            {order.errorMessage && (
              <div className="rounded-2xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold text-amber-700">
                  {order.status === "action_required" ? "Action required reason" :
                   order.status === "refund_needed" ? "Refund needed reason" :
                   "Error / reason"}
                </p>
                <p className="mt-1 text-sm text-amber-800 break-words">{order.errorMessage}</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <JsonBlock label="Rate snapshot" value={order.rateSnapshot} />
            <JsonBlock label="Origin address" value={order.origin} />
            <JsonBlock label="Destination address" value={order.destination} />
            <JsonBlock label="Parcel" value={order.parcel} />
          </div>

          {mutateError && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{mutateError}</p>
          )}

          {processResult && (
            <div className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              <p className="font-semibold">{processResult}</p>
              {order.shipmentId && (
                <p className="mt-1 text-xs text-green-600">
                  Shipment ID: <span className="font-mono">{order.shipmentId}</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {canProcessLabelOrder(order.status) && !order.labelId && !order.trackingNumber && (
              <button
                type="button"
                disabled={mutating}
                onClick={handleProcessLabel}
                title="Requires ENABLE_REAL_LABEL_PURCHASE=true on the server"
                className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 disabled:opacity-40"
              >
                {mutating ? "Processing…" : "Process label"}
              </button>
            )}
            {canMarkActionRequired(order.status) && (
              <button
                type="button"
                disabled={mutating}
                onClick={() => setDialog({ type: "action_required", orderId: order.id })}
                className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 disabled:opacity-40"
              >
                Mark action required
              </button>
            )}
            {canMarkRefundNeeded(order.status) && (
              <button
                type="button"
                disabled={mutating}
                onClick={() => setDialog({ type: "refund_needed", orderId: order.id })}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-40"
              >
                Mark refund needed
              </button>
            )}
            {canRefundLabelOrder(order.status) && !order.labelId && !order.trackingNumber && (
              configStatus?.labelPaymentRefundsEnabled && configFeatures?.labelPaymentRefundAvailable ? (
                <button
                  type="button"
                  disabled={mutating}
                  onClick={() => setDialog({ type: "refund", orderId: order.id })}
                  className="rounded-2xl border border-red-300 bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  Refund via Stripe
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title={
                    configStatus?.labelPaymentRefundsEnabled
                      ? "Refunds are not available for this admin account."
                      : "Stripe refunds are disabled in this environment. Use Stripe Dashboard manually."
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-400"
                >
                  Refund via Stripe
                </button>
              )
            )}
            {canMarkRefundedManual(order.status) && !!order.stripePaymentIntentId && !!order.paidAt && (
              <button
                type="button"
                disabled={mutating}
                onClick={() => setDialog({ type: "manual_refunded", orderId: order.id })}
                title="Records a refund already completed in Stripe Dashboard. Does not call Stripe or move money."
                className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-700 disabled:opacity-40"
              >
                Mark refunded manually
              </button>
            )}
            {order.status === "pending_payment" && (
              <button
                type="button"
                disabled={mutating}
                onClick={handleMarkExpired}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-40"
              >
                Mark expired
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-36 shrink-0 text-xs font-bold text-slate-400">{label}</span>
      <span className={`min-w-0 break-all text-sm text-slate-700 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-36 shrink-0 text-xs font-bold text-slate-400">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">{value}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 text-slate-300 hover:text-slate-600"
        title="Copy"
      >
        {copied ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: PendingLabelOrderStatus }) {
  if (status === "label_purchased" || status === "refunded") {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (status === "action_required" || status === "refund_needed") {
    return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  }
  if (status === "expired" || status === "canceled") {
    return <XCircle className="h-4 w-4 text-slate-400" />;
  }
  return <Clock className="h-4 w-4 text-slate-300" />;
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function AdminLabelOrdersView() {
  const [orders, setOrders] = useState<PendingLabelOrder[] | null>(null);
  const [total, setTotal] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PendingLabelOrder | null>(null);
  const [expiring, setExpiring] = useState(false);
  const [expireResult, setExpireResult] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [configFeatures, setConfigFeatures] = useState<ConfigFeatures | null>(null);

  const load = useCallback(() => {
    setError(null);
    setOrders(null);
    getAdminLabelOrders({
      status: statusFilter || undefined,
      provider: providerFilter || undefined,
      search: search.trim() || undefined,
      limit: 100,
    })
      .then((result) => {
        setOrders(result.orders);
        setTotal(result.total);
        setWarning(result.warning ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We could not load label orders.");
      });
  }, [statusFilter, providerFilter, search]);

  useEffect(() => {
    window.setTimeout(load, 0);
  }, [load]);

  useEffect(() => {
    apiGetConfigStatus().then(setConfigStatus).catch(() => setConfigStatus(null));
    apiGetConfigFeatures().then(setConfigFeatures).catch(() => setConfigFeatures(null));
  }, []);

  function handleMutated(updated: PendingLabelOrder) {
    setOrders((prev) => prev?.map((o) => (o.id === updated.id ? updated : o)) ?? null);
    setSelectedOrder(updated);
  }

  async function handleExpireStale() {
    if (!confirm("Run expiry sweep? All pending_payment orders past their expires_at will be marked expired.")) return;
    setExpiring(true);
    setExpireResult(null);
    try {
      const result = await expireStaleAdminLabelOrders();
      setExpireResult(`${result.expiredCount} order(s) expired.`);
      load();
    } catch (err) {
      setExpireResult(err instanceof Error ? err.message : "Expiry failed.");
    } finally {
      setExpiring(false);
    }
  }

  const STATUS_OPTIONS: PendingLabelOrderStatus[] = [
    "pending_payment",
    "paid_test_mode",
    "paid_waiting_label_purchase",
    "label_purchase_pending",
    "label_purchased",
    "action_required",
    "refund_needed",
    "refund_pending",
    "refunded",
    "expired",
    "canceled",
  ];

  return (
    <>
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          configStatus={configStatus}
          configFeatures={configFeatures}
          onClose={() => setSelectedOrder(null)}
          onMutated={handleMutated}
        />
      )}

      <div className="grid gap-4">
        {/* Filters */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search session ID, payment intent, or tracking"
              className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {getLabelOrderStatusLabel(s)}
                </option>
              ))}
            </select>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#FF1493]"
            >
              <option value="">All providers</option>
              <option value="shipengine">ShipEngine</option>
              <option value="shippo">Shippo</option>
              <option value="easypost">EasyPost</option>
              <option value="easyship">Easyship</option>
            </select>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              disabled={expiring}
              onClick={handleExpireStale}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Clock className="h-3.5 w-3.5" />
              {expiring ? "Running…" : "Expire stale"}
            </button>
            {expireResult && (
              <span className="text-sm text-slate-500">{expireResult}</span>
            )}
            <span className="ml-auto text-xs text-slate-400">
              {orders !== null ? `${total} total` : ""}
            </span>
          </div>
        </div>

        {/* Warning banner (table not yet applied) */}
        {warning && (
          <div className="rounded-3xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800">
            <span className="font-bold">Note:</span> {warning}
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        {!orders ? (
          <LoadingState />
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-400 shadow-sm shadow-slate-950/5">
            No label orders found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3"></th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Stripe session</th>
                    <th className="px-4 py-3">Tracking</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <StatusIcon status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCents(order.amountCents, order.currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{order.provider}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {order.serviceName ?? order.serviceCode ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {order.stripeCheckoutSessionId ? (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.stripeCheckoutSessionId!)}
                            className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 hover:text-slate-800"
                            title={order.stripeCheckoutSessionId}
                          >
                            {truncate(order.stripeCheckoutSessionId)}
                            <Copy className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {order.trackingNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(order.expiresAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

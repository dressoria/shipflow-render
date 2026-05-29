"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/Badge";
import { LoadingState } from "@/components/LoadingState";
import {
  apiCreateAdminPrepOrderEvent,
  apiGetAdminPrepOrder,
  apiGetAdminPrepOrders,
  apiUpdateAdminPrepOrder,
} from "@/lib/services/apiClient";
import { getPrepStatusLabel, getPrepStatusTone, PREP_STATUSES } from "@/lib/prep";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/forms";
import type { PrepOrder } from "@/lib/types";

export function AdminPrepOrdersView({ orderId }: { orderId?: string }) {
  if (orderId) return <AdminPrepOrderDetail orderId={orderId} />;
  return <AdminPrepOrderList />;
}

function AdminPrepOrderList() {
  const [orders, setOrders] = useState<PrepOrder[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    apiGetAdminPrepOrders({ status: status || undefined, limit: 100 })
      .then((result) => setOrders(result.orders))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="font-black text-slate-950">Prep Orders</h2>
          <p className="text-sm text-slate-500">Manual-managed SendiFlash Prep requests and internal review.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(event) => {
              setLoading(true);
              setStatus(event.target.value);
            }}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
          >
            <option value="">All statuses</option>
            {PREP_STATUSES.map((candidate) => <option key={candidate} value={candidate}>{getPrepStatusLabel(candidate)}</option>)}
          </select>
          <button type="button" onClick={load} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-600">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="p-5"><LoadingState /></div>
      ) : (
        <div className="divide-y divide-slate-100">
          {orders.map((order) => (
            <Link key={order.id} href={`/admin/prep-orders/${order.id}`} className="grid gap-3 p-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_160px_120px_120px_32px]">
              <div className="min-w-0">
                <p className="font-black text-slate-950">{order.businessName || order.contactEmail}</p>
                <p className="text-sm text-slate-500">{order.productSummary} · {order.totalUnits} units</p>
              </div>
              <Badge tone={getPrepStatusTone(order.status)}>{getPrepStatusLabel(order.status)}</Badge>
              <p className="text-sm font-bold text-slate-600">{formatDate(order.createdAt)}</p>
              <p className="font-black text-slate-950 lg:text-right">{formatCurrency(order.finalTotal ?? order.estimatedTotal ?? 0)}</p>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
          {orders.length === 0 ? <div className="p-5 text-sm text-slate-600">No Prep orders match this filter.</div> : null}
        </div>
      )}
    </section>
  );
}

function AdminPrepOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<PrepOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [eventDraft, setEventDraft] = useState({ visibility: "customer" as "customer" | "internal", title: "", message: "" });

  const [draft, setDraft] = useState({
    status: "quote_requested",
    estimatedUnitPrice: "",
    estimatedTotal: "",
    finalUnitPrice: "",
    finalTotal: "",
    partnerCostTotal: "",
    marginTotal: "",
    receivingReference: "",
    partnerNameInternal: "",
    partnerReferenceInternal: "",
    adminNotes: "",
  });

  const load = useCallback(() => {
    apiGetAdminPrepOrder(orderId).then((result) => {
      setOrder(result.order);
      setDraft({
        status: result.order.status,
        estimatedUnitPrice: String(result.order.estimatedUnitPrice ?? ""),
        estimatedTotal: String(result.order.estimatedTotal ?? ""),
        finalUnitPrice: String(result.order.finalUnitPrice ?? ""),
        finalTotal: String(result.order.finalTotal ?? ""),
        partnerCostTotal: String(result.order.partnerCostTotal ?? ""),
        marginTotal: String(result.order.marginTotal ?? ""),
        receivingReference: result.order.receivingReference ?? "",
        partnerNameInternal: result.order.partnerNameInternal ?? "",
        partnerReferenceInternal: result.order.partnerReferenceInternal ?? "",
        adminNotes: result.order.adminNotes ?? "",
      });
    });
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const computedMargin = useMemo(() => {
    const finalTotal = Number(draft.finalTotal || 0);
    const cost = Number(draft.partnerCostTotal || 0);
    return finalTotal > 0 || cost > 0 ? Math.max(finalTotal - cost, 0).toFixed(2) : draft.marginTotal;
  }, [draft.finalTotal, draft.partnerCostTotal, draft.marginTotal]);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const result = await apiUpdateAdminPrepOrder(orderId, { ...draft, marginTotal: computedMargin });
      setOrder(result.order);
      setMessage("Prep order updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function addEvent() {
    setSaving(true);
    setMessage("");
    try {
      const result = await apiCreateAdminPrepOrderEvent(orderId, eventDraft);
      setOrder(result.order);
      setEventDraft({ visibility: "customer", title: "", message: "" });
      setMessage("Event added.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Event failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!order) return <LoadingState />;

  return (
    <div className="grid gap-5">
      <Link href="/admin/prep-orders" className="text-sm font-black text-[#2563EB]">Back to Prep Orders</Link>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone={getPrepStatusTone(order.status)}>{getPrepStatusLabel(order.status)}</Badge>
            <h2 className="mt-3 text-2xl font-black text-slate-950">{order.businessName || order.contactEmail}</h2>
            <p className="mt-1 text-sm text-slate-600">{order.productSummary} · {order.totalUnits} units · {order.totalCartons} cartons</p>
          </div>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{order.id}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <h3 className="font-black text-slate-950">Admin controls</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Status</span>
              <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold">
                {PREP_STATUSES.map((candidate) => <option key={candidate} value={candidate}>{getPrepStatusLabel(candidate)}</option>)}
              </select>
            </label>
            <Field label="Receiving reference" value={draft.receivingReference} onChange={(receivingReference) => setDraft((current) => ({ ...current, receivingReference }))} />
            <Field label="Estimated unit price" value={draft.estimatedUnitPrice} type="number" onChange={(estimatedUnitPrice) => setDraft((current) => ({ ...current, estimatedUnitPrice }))} />
            <Field label="Estimated total" value={draft.estimatedTotal} type="number" onChange={(estimatedTotal) => setDraft((current) => ({ ...current, estimatedTotal }))} />
            <Field label="Final unit price" value={draft.finalUnitPrice} type="number" onChange={(finalUnitPrice) => setDraft((current) => ({ ...current, finalUnitPrice }))} />
            <Field label="Final total" value={draft.finalTotal} type="number" onChange={(finalTotal) => setDraft((current) => ({ ...current, finalTotal }))} />
            <Field label="Partner cost total" value={draft.partnerCostTotal} type="number" onChange={(partnerCostTotal) => setDraft((current) => ({ ...current, partnerCostTotal }))} />
            <Field label="Margin total" value={computedMargin} type="number" onChange={(marginTotal) => setDraft((current) => ({ ...current, marginTotal }))} />
            <Field label="Partner name internal" value={draft.partnerNameInternal} onChange={(partnerNameInternal) => setDraft((current) => ({ ...current, partnerNameInternal }))} />
            <Field label="Partner reference internal" value={draft.partnerReferenceInternal} onChange={(partnerReferenceInternal) => setDraft((current) => ({ ...current, partnerReferenceInternal }))} />
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Admin notes internal</span>
            <textarea value={draft.adminNotes} onChange={(event) => setDraft((current) => ({ ...current, adminNotes: event.target.value }))} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
          </label>
          <button type="button" onClick={save} disabled={saving} className="mt-4 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
            {saving ? "Saving..." : "Save admin updates"}
          </button>
          {message ? <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{message}</p> : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <h3 className="font-black text-slate-950">Add event</h3>
          <select value={eventDraft.visibility} onChange={(event) => setEventDraft((current) => ({ ...current, visibility: event.target.value as "customer" | "internal" }))} className="mt-4 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold">
            <option value="customer">Customer visible</option>
            <option value="internal">Internal only</option>
          </select>
          <Field label="Title" value={eventDraft.title} onChange={(title) => setEventDraft((current) => ({ ...current, title }))} />
          <label className="mt-3 block">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Message</span>
            <textarea value={eventDraft.message} onChange={(event) => setEventDraft((current) => ({ ...current, message: event.target.value }))} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
          </label>
          <button type="button" onClick={addEvent} disabled={saving || !eventDraft.title.trim()} className="mt-4 rounded-2xl bg-[#F97316] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
            Add event
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <h3 className="font-black text-slate-950">Items and timeline</h3>
        <div className="mt-4 grid gap-3">
          {(order.items ?? []).map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <strong>{item.productName}</strong> · {item.units} units · {item.prepServices.join(", ") || "No services selected"}
            </div>
          ))}
          {(order.events ?? []).map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
              <Badge tone={event.visibility === "internal" ? "slate" : "blue"}>{event.visibility}</Badge>
              <p className="mt-2 font-black text-slate-950">{event.title}</p>
              {event.message ? <p className="text-sm text-slate-600">{event.message}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input type={type} step={type === "number" ? "0.01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

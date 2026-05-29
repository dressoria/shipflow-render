"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/Badge";
import { LoadingState } from "@/components/LoadingState";
import {
  apiCreateAdminPrepOrderEvent,
  apiGetAdminPrepOrder,
  apiGetAdminPrepOrders,
  apiUpdateAdminPrepOrder,
} from "@/lib/services/apiClient";
import {
  getPrepNextStep,
  getPrepPaymentStatusLabel,
  getPrepPaymentTone,
  getPrepStatusEventTitle,
  getPrepStatusLabel,
  getPrepStatusTone,
  PREP_STATUSES,
} from "@/lib/prep";
import { formatDate } from "@/lib/forms";
import { formatCurrency } from "@/lib/utils";
import type { PrepOrder } from "@/lib/types";

export function AdminPrepOrdersView({ orderId }: { orderId?: string }) {
  if (orderId) return <AdminPrepOrderDetail orderId={orderId} />;
  return <AdminPrepOrderList />;
}

function AdminPrepOrderList() {
  const [orders, setOrders] = useState<PrepOrder[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    apiGetAdminPrepOrders({ status: status || undefined, search: search || undefined, limit: 100 })
      .then((result) => {
        setError("");
        setOrders(result.orders);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "We could not load Prep orders."))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="grid gap-4 border-b border-slate-200 p-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h2 className="font-black text-slate-950">Prep Orders</h2>
          <p className="text-sm text-slate-500">Manual-managed SendiFlash Prep operations, quote review, and internal partner tracking.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 min-w-64 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => {
                setLoading(true);
                setSearch(event.target.value);
              }}
              className="min-w-0 flex-1 bg-transparent outline-none"
              placeholder="Email, business, product"
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setLoading(true);
              setStatus(event.target.value);
            }}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
          >
            <option value="">All statuses</option>
            {PREP_STATUSES.map((candidate) => (
              <option key={candidate} value={candidate}>{getPrepStatusLabel(candidate)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-600"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? <div className="m-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
      {loading ? (
        <div className="p-5"><LoadingState /></div>
      ) : (
        <div className="divide-y divide-slate-100">
          {orders.map((order) => {
            const margin = order.marginTotal ?? ((order.finalTotal ?? 0) - (order.partnerCostTotal ?? 0));
            return (
              <Link
                key={order.id}
                href={`/admin/prep-orders/${order.id}`}
                className="grid gap-3 p-4 transition hover:bg-slate-50 xl:grid-cols-[minmax(0,1.25fr)_130px_120px_120px_120px_120px_32px]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === "action_required" ? <Badge tone="amber">Needs action</Badge> : null}
                    <p className="font-black text-slate-950">{order.businessName || order.contactEmail}</p>
                  </div>
                  <p className="truncate text-sm text-slate-500">
                    {order.id.slice(0, 8)} · {order.productSummary} · {order.totalUnits} units · {order.totalCartons} cartons
                  </p>
                </div>
                <Badge tone={getPrepStatusTone(order.status)}>{getPrepStatusLabel(order.status)}</Badge>
                <Badge tone={getPrepPaymentTone(order.paymentStatus)}>{getPrepPaymentStatusLabel(order.paymentStatus)}</Badge>
                <p className="text-sm font-bold text-slate-600">{formatDate(order.createdAt)}</p>
                <p className="font-black text-slate-950 xl:text-right">{formatCurrency(order.finalTotal ?? order.estimatedTotal ?? 0)}</p>
                <p className="font-black text-green-700 xl:text-right">{order.finalTotal || order.partnerCostTotal ? formatCurrency(margin) : "TBD"}</p>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            );
          })}
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
  const [statusEvent, setStatusEvent] = useState({
    visibility: "customer" as "customer" | "internal" | "none",
    title: "",
    message: "",
  });
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

  const hydrate = useCallback((nextOrder: PrepOrder) => {
    setOrder(nextOrder);
    setDraft({
      status: nextOrder.status,
      estimatedUnitPrice: moneyString(nextOrder.estimatedUnitPrice),
      estimatedTotal: moneyString(nextOrder.estimatedTotal),
      finalUnitPrice: moneyString(nextOrder.finalUnitPrice),
      finalTotal: moneyString(nextOrder.finalTotal),
      partnerCostTotal: moneyString(nextOrder.partnerCostTotal),
      marginTotal: moneyString(nextOrder.marginTotal),
      receivingReference: nextOrder.receivingReference ?? "",
      partnerNameInternal: nextOrder.partnerNameInternal ?? "",
      partnerReferenceInternal: nextOrder.partnerReferenceInternal ?? "",
      adminNotes: nextOrder.adminNotes ?? "",
    });
    setStatusEvent({ visibility: "customer", title: "", message: "" });
  }, []);

  const load = useCallback(() => {
    apiGetAdminPrepOrder(orderId).then((result) => hydrate(result.order));
  }, [hydrate, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const calculatedFinalTotal = useMemo(() => {
    if (!order) return "";
    const unit = Number(draft.finalUnitPrice || 0);
    if (!Number.isFinite(unit) || unit <= 0) return draft.finalTotal;
    return (unit * order.totalUnits).toFixed(2);
  }, [draft.finalTotal, draft.finalUnitPrice, order]);

  const calculatedEstimatedTotal = useMemo(() => {
    if (!order) return "";
    const unit = Number(draft.estimatedUnitPrice || 0);
    if (!Number.isFinite(unit) || unit <= 0) return draft.estimatedTotal;
    return (unit * order.totalUnits).toFixed(2);
  }, [draft.estimatedTotal, draft.estimatedUnitPrice, order]);

  const calculatedMargin = useMemo(() => {
    const finalTotal = Number(draft.finalTotal || calculatedFinalTotal || 0);
    const cost = Number(draft.partnerCostTotal || 0);
    if (!Number.isFinite(finalTotal) || !Number.isFinite(cost)) return draft.marginTotal;
    return finalTotal > 0 || cost > 0 ? (finalTotal - cost).toFixed(2) : draft.marginTotal;
  }, [calculatedFinalTotal, draft.finalTotal, draft.marginTotal, draft.partnerCostTotal]);

  async function save() {
    if (!order) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await apiUpdateAdminPrepOrder(orderId, {
        ...draft,
        estimatedTotal: draft.estimatedTotal || calculatedEstimatedTotal,
        finalTotal: draft.finalTotal || calculatedFinalTotal,
        marginTotal: draft.marginTotal || calculatedMargin,
        statusEventVisibility: statusEvent.visibility,
        statusEventTitle: statusEvent.title,
        statusEventMessage: statusEvent.message,
      });
      hydrate(result.order);
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
      hydrate(result.order);
      setEventDraft({ visibility: "customer", title: "", message: "" });
      setMessage("Event added.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Event failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!order) return <LoadingState />;

  const finalQuote = order.finalTotal ?? Number(draft.finalTotal || calculatedFinalTotal || 0);
  const estimate = order.estimatedTotal ?? Number(draft.estimatedTotal || calculatedEstimatedTotal || 0);

  return (
    <div className="grid gap-5">
      <Link href="/admin/prep-orders" className="inline-flex items-center gap-2 text-sm font-black text-[#2563EB]">
        <ArrowLeft className="h-4 w-4" /> Back to Prep Orders
      </Link>

      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={getPrepStatusTone(order.status)}>{getPrepStatusLabel(order.status)}</Badge>
              <Badge tone="slate">{order.id.slice(0, 8)}</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-950">{order.businessName || order.contactEmail}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{order.productSummary}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Current quote</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(finalQuote || estimate || 0)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={getPrepPaymentTone(order.paymentStatus)}>{getPrepPaymentStatusLabel(order.paymentStatus)}</Badge>
              {order.paymentMethod ? <Badge tone="slate">{order.paymentMethod}</Badge> : null}
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Summary label="Units" value={String(order.totalUnits)} />
          <Summary label="Cartons" value={String(order.totalCartons)} />
          <Summary label="Created" value={formatDate(order.createdAt)} />
          <Summary label="Next step" value={getPrepNextStep(order.status, order.receivingReference)} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-5">
          <Card title="Customer and request">
            <div className="grid gap-3 md:grid-cols-2">
              <Summary label="Contact" value={order.contactName} />
              <Summary label="Email" value={order.contactEmail} />
              <Summary label="Phone" value={order.contactPhone || "Not provided"} />
              <Summary label="Marketplace" value="Amazon FBA" />
              <Summary label="Payment" value={getPrepPaymentStatusLabel(order.paymentStatus)} />
              <Summary label="Paid amount" value={order.paidAmount != null ? formatCurrency(order.paidAmount) : "Not paid"} />
              <Summary label="Paid at" value={order.paidAt ? formatDate(order.paidAt) : "Not paid"} />
              <Summary label="Payment ref" value={order.paymentReference || order.stripePaymentIntentId || order.stripeCheckoutSessionId || "N/A"} />
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Customer notes</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{order.customerNotes || "No customer notes."}</p>
            </div>
          </Card>

          <Card title="Items / SKUs and requested services">
            <div className="grid gap-3">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{item.productName}</p>
                      <p className="text-sm text-slate-500">SKU {item.sku || "N/A"} · ASIN {item.asin || "N/A"}</p>
                    </div>
                    <p className="font-black text-slate-950">{item.units} units · {item.cartons} cartons</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.prepServices.map((service) => <Badge key={service} tone="orange">{service}</Badge>)}
                    {item.prepServices.length === 0 ? <Badge tone="slate">No services selected</Badge> : null}
                  </div>
                  {item.notes ? <p className="mt-3 text-sm text-slate-600">{item.notes}</p> : null}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Timeline and events">
            <div className="grid gap-3">
              {(order.events ?? []).map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={event.visibility === "internal" ? "slate" : "blue"}>{event.visibility === "internal" ? "Internal" : "Customer"}</Badge>
                    {event.status ? <Badge tone={getPrepStatusTone(event.status)}>{getPrepStatusLabel(event.status)}</Badge> : null}
                    <span className="text-xs font-bold text-slate-400">{formatDate(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 font-black text-slate-950">{event.title}</p>
                  {event.message ? <p className="mt-1 text-sm leading-6 text-slate-600">{event.message}</p> : null}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card title="Status controls">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Status</span>
              <select
                value={draft.status}
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  setDraft((current) => ({ ...current, status: nextStatus }));
                  setStatusEvent((current) => ({
                    ...current,
                    title: nextStatus !== order.status ? getPrepStatusEventTitle(nextStatus) : "",
                  }));
                }}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold"
              >
                {PREP_STATUSES.map((candidate) => <option key={candidate} value={candidate}>{getPrepStatusLabel(candidate)}</option>)}
              </select>
            </label>
            {draft.status !== order.status ? (
              <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-sm font-black text-slate-950">Status event</p>
                <select value={statusEvent.visibility} onChange={(event) => setStatusEvent((current) => ({ ...current, visibility: event.target.value as "customer" | "internal" | "none" }))} className="mt-2 h-10 w-full rounded-xl border border-blue-100 px-3 text-sm font-bold">
                  <option value="customer">Customer visible</option>
                  <option value="internal">Internal only</option>
                  <option value="none">No event</option>
                </select>
                <Field label="Event title" value={statusEvent.title} onChange={(title) => setStatusEvent((current) => ({ ...current, title }))} />
                <Textarea label="Event message" value={statusEvent.message} onChange={(message) => setStatusEvent((current) => ({ ...current, message }))} />
              </div>
            ) : null}
          </Card>

          <Card title="Pricing and margin">
            <div className="grid gap-2">
              <Field label="Estimated unit price" value={draft.estimatedUnitPrice} type="number" onChange={(estimatedUnitPrice) => setDraft((current) => ({ ...current, estimatedUnitPrice }))} />
              <CalculatedLine label="Estimated total" value={calculatedEstimatedTotal || draft.estimatedTotal} onUse={() => setDraft((current) => ({ ...current, estimatedTotal: calculatedEstimatedTotal }))} />
              <Field label="Estimated total override" value={draft.estimatedTotal} type="number" onChange={(estimatedTotal) => setDraft((current) => ({ ...current, estimatedTotal }))} />
              <Field label="Final unit price" value={draft.finalUnitPrice} type="number" onChange={(finalUnitPrice) => setDraft((current) => ({ ...current, finalUnitPrice }))} />
              <CalculatedLine label="Final total" value={calculatedFinalTotal || draft.finalTotal} onUse={() => setDraft((current) => ({ ...current, finalTotal: calculatedFinalTotal }))} />
              <Field label="Final total override" value={draft.finalTotal} type="number" onChange={(finalTotal) => setDraft((current) => ({ ...current, finalTotal }))} />
              <Field label="Partner cost total" value={draft.partnerCostTotal} type="number" onChange={(partnerCostTotal) => setDraft((current) => ({ ...current, partnerCostTotal }))} />
              <CalculatedLine label="Margin total" value={calculatedMargin} onUse={() => setDraft((current) => ({ ...current, marginTotal: calculatedMargin }))} />
              <Field label="Margin override" value={draft.marginTotal} type="number" onChange={(marginTotal) => setDraft((current) => ({ ...current, marginTotal }))} />
            </div>
          </Card>

          <Card title="Partner/internal workflow">
            <Field label="Receiving reference" value={draft.receivingReference} onChange={(receivingReference) => setDraft((current) => ({ ...current, receivingReference }))} />
            <Field label="Partner name internal" value={draft.partnerNameInternal} onChange={(partnerNameInternal) => setDraft((current) => ({ ...current, partnerNameInternal }))} />
            <Field label="Partner reference internal" value={draft.partnerReferenceInternal} onChange={(partnerReferenceInternal) => setDraft((current) => ({ ...current, partnerReferenceInternal }))} />
            <Textarea label="Admin notes internal" value={draft.adminNotes} onChange={(adminNotes) => setDraft((current) => ({ ...current, adminNotes }))} />
          </Card>

          <button type="button" onClick={save} disabled={saving} className="rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 disabled:opacity-60">
            {saving ? "Saving..." : "Save operations updates"}
          </button>
          {message ? <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{message}</p> : null}

          <Card title="Add timeline event">
            <select value={eventDraft.visibility} onChange={(event) => setEventDraft((current) => ({ ...current, visibility: event.target.value as "customer" | "internal" }))} className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold">
              <option value="customer">Customer visible</option>
              <option value="internal">Internal only</option>
            </select>
            <Field label="Title" value={eventDraft.title} onChange={(title) => setEventDraft((current) => ({ ...current, title }))} />
            <Textarea label="Message" value={eventDraft.message} onChange={(nextMessage) => setEventDraft((current) => ({ ...current, message: nextMessage }))} />
            <button type="button" onClick={addEvent} disabled={saving || !eventDraft.title.trim()} className="mt-4 rounded-2xl bg-[#F97316] px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/25 disabled:opacity-60">
              Add event
            </button>
          </Card>

          <Card title="Documents">
            <p className="text-sm leading-6 text-slate-600">
              Document upload/storage is intentionally deferred. Use timeline events for operational notes in this MVP.
            </p>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function moneyString(value?: number | null) {
  return value == null ? "" : value.toFixed(2);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function CalculatedLine({ label, value, onUse }: { label: string; value: string; onUse: () => void }) {
  return (
    <div className="rounded-2xl bg-blue-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-500">{label}</p>
          <p className="mt-1 font-black text-slate-950">{value ? formatCurrency(Number(value)) : "TBD"}</p>
        </div>
        <button type="button" onClick={onUse} disabled={!value} className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#2563EB] disabled:opacity-50">
          <Calculator className="h-3.5 w-3.5" /> Use
        </button>
      </div>
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

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Ban, Network, ShieldCheck } from "lucide-react";
import type { EcuadorProviderDiagnosticsSnapshot } from "@/lib/ecuador/providerHealth";
import { apiTestAdminDelivereoAuth } from "@/lib/services/apiClient";

export function AdminEcuadorProvidersDiagnostics({
  initialSnapshot,
}: {
  initialSnapshot: EcuadorProviderDiagnosticsSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");

  const rows = [
    { label: "Provider", value: "Delivereo" },
    { label: "Status", value: formatStatus(snapshot) },
    { label: "Credentials", value: snapshot.credentialsConfigured ? "Configured" : "Not configured" },
    { label: "Network", value: snapshot.networkTested ? "Login only tested" : "Not tested" },
    { label: "Orders", value: snapshot.ordersEnabled ? "Enabled" : "Disabled" },
    { label: "Tracking", value: snapshot.trackingEnabled ? "Enabled" : "Disabled" },
    { label: "Enabled flag", value: snapshot.enabled ? "true" : "false" },
    { label: "Auth test", value: formatAuthTest(snapshot.authTest) },
    { label: "Token received", value: snapshot.tokenReceived ? "Yes" : "No" },
    { label: "Base URL", value: snapshot.baseUrl || "Not configured" },
    { label: "Last checked", value: snapshot.lastCheckedAt ? formatTimestamp(snapshot.lastCheckedAt) : "Not tested" },
  ] as const;

  async function runAuthTest() {
    setTesting(true);
    setMessage("");
    try {
      const result = await apiTestAdminDelivereoAuth();
      setSnapshot(result.snapshot);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delivereo authentication test failed.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm shadow-slate-950/5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-950">Delivereo is not connected.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              No real provider operations are available. This page is diagnostic-only and does not make network calls.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-950">Provider diagnostics</h3>
            <p className="text-sm text-slate-500">Sandbox readiness foundation only. No credentials are loaded here.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runAuthTest}
              disabled={testing}
              className="inline-flex items-center rounded-2xl border border-pink-100 bg-pink-50 px-4 py-2 text-sm font-bold text-[#FF1493] transition hover:bg-pink-100 disabled:opacity-60"
            >
              {testing ? "Probando auth..." : "Probar auth Delivereo"}
            </button>
            <Link
              href="/admin/ecuador-envios"
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a solicitudes Ecuador
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">{row.label}</p>
              <p className="mt-2 text-sm font-black text-slate-950">{row.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <h3 className="font-black text-slate-950">Readiness flags</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FlagCard label="Configured" value={snapshot.configured ? "Yes" : "No"} icon={ShieldCheck} />
            <FlagCard label="Credentials present" value={snapshot.credentialsPresent ? "Yes" : "No"} icon={Ban} />
            <FlagCard label="Can quote" value={snapshot.canQuote ? "Yes" : "No"} icon={Network} />
            <FlagCard label="Can create orders" value={snapshot.canCreateOrders ? "Yes" : "No"} icon={Ban} />
            <FlagCard label="Can track" value={snapshot.canTrack ? "Yes" : "No"} icon={Network} />
            <FlagCard label="Environment" value={snapshot.status} icon={ShieldCheck} />
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Operational status</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Provider calls are disabled, tracking is disabled, and order creation is disabled until Delivereo credentials and sandbox validation arrive.
            </p>
            {message ? (
              <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${snapshot.authTest === "success" ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-700"}`}>
                {message}
              </p>
            ) : null}
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Next step</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use the roadmap doc to connect auth first, then quote, then create-shipment, then tracking, without activating public Ecuador shipping early.
            </p>
            <Link
              href="/admin/ecuador-envios"
              className="mt-4 inline-flex text-sm font-black text-[#FF1493]"
            >
              Review Ecuador beta requests
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function formatStatus(snapshot: EcuadorProviderDiagnosticsSnapshot) {
  if (!snapshot.enabled) return "Not configured";
  return snapshot.status.replaceAll("_", " ");
}

function formatAuthTest(status: EcuadorProviderDiagnosticsSnapshot["authTest"]) {
  if (status === "not_tested") return "Not tested";
  if (status === "success") return "Success";
  return "Fail";
}

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat("es-EC", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function FlagCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <Icon className="h-4 w-4 text-[#FF1493]" />
      <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

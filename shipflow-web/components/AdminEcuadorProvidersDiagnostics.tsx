"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Ban, Network, ShieldCheck } from "lucide-react";
import type { EcuadorProviderDiagnosticsSnapshot } from "@/lib/ecuador/providerHealth";
import { apiTestAdminDelivereoAuth } from "@/lib/services/apiClient";

export function AdminEcuadorProvidersDiagnostics({
  initialSnapshots,
}: {
  initialSnapshots: EcuadorProviderDiagnosticsSnapshot[];
}) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");

  const delivereoSnapshot = useMemo(
    () => snapshots.find((item) => item.provider === "delivereo") ?? snapshots[0],
    [snapshots],
  );

  async function runAuthTest() {
    setTesting(true);
    setMessage("");
    try {
      const result = await apiTestAdminDelivereoAuth();
      setSnapshots(result.snapshots);
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
            <h2 className="text-xl font-black text-slate-950">Framework multicourier Ecuador activo.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Delivereo queda como adapter real preparado pero pendiente de activación. Los demás providers siguen visibles dentro del framework con estado de preparación o contacto pendiente.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-950">Provider diagnostics</h3>
            <p className="text-sm text-slate-500">Cotización multicourier sin activar bookings reales ni pagos.</p>
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

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {snapshots.map((snapshot) => (
            <article key={snapshot.provider} className="rounded-[1.8rem] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <Image
                      src={snapshot.logoPath}
                      alt={`${snapshot.providerName} logo`}
                      width={120}
                      height={40}
                      className="max-h-8 w-auto"
                    />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-950">{snapshot.providerName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Estado del adapter: {formatProviderStatus(snapshot.providerStatus)}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusChip(snapshot)}`}>
                  {formatEnvironment(snapshot.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <FlagCard label="Quote support" value={snapshot.canQuote ? "Sí" : "No"} icon={Network} />
                <FlagCard label="Booking support" value={snapshot.canCreateOrders ? "Sí" : "No"} icon={Ban} />
                <FlagCard label="Credenciales" value={snapshot.credentialsConfigured ? "Configuradas" : "Pendientes"} icon={ShieldCheck} />
                <FlagCard label="Último auth test" value={formatAuthTest(snapshot.authTest)} icon={ShieldCheck} />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Último motivo</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {snapshot.lastFailureReason ?? "Sin fallas registradas"}
                </p>
                {snapshot.provider === "delivereo" ? (
                  <div className="mt-3 grid gap-2 text-xs text-slate-500">
                    <p>Enabled flag: {snapshot.enabled ? "true" : "false"}</p>
                    <p>Token recibido: {snapshot.tokenReceived ? "Sí" : "No"}</p>
                    <p>Última revisión: {snapshot.lastCheckedAt ? formatTimestamp(snapshot.lastCheckedAt) : "No probada"}</p>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <h3 className="font-black text-slate-950">Delivereo diagnostics</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FlagCard label="Configured" value={delivereoSnapshot.configured ? "Yes" : "No"} icon={ShieldCheck} />
            <FlagCard label="Credentials present" value={delivereoSnapshot.credentialsPresent ? "Yes" : "No"} icon={Ban} />
            <FlagCard label="Can quote" value={delivereoSnapshot.canQuote ? "Yes" : "No"} icon={Network} />
            <FlagCard label="Can create orders" value={delivereoSnapshot.canCreateOrders ? "Yes" : "No"} icon={Ban} />
            <FlagCard label="Can track" value={delivereoSnapshot.canTrack ? "Yes" : "No"} icon={Network} />
            <FlagCard label="Environment" value={formatEnvironment(delivereoSnapshot.status)} icon={ShieldCheck} />
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Operational status</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              El motor multicourier puede seguir mostrando opciones y estados de preparación aunque Delivereo continúe bloqueado por auth 401.
            </p>
            {message ? (
              <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${delivereoSnapshot.authTest === "success" ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-700"}`}>
                {message}
              </p>
            ) : null}
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Next step</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Esperar confirmación del proveedor para la auth de Delivereo mientras el framework Ecuador continúa listo para sumar adapters reales adicionales.
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

function formatEnvironment(status: EcuadorProviderDiagnosticsSnapshot["status"]) {
  return status.replaceAll("_", " ");
}

function formatProviderStatus(status: EcuadorProviderDiagnosticsSnapshot["providerStatus"]) {
  return status.replaceAll("_", " ");
}

function formatAuthTest(status: EcuadorProviderDiagnosticsSnapshot["authTest"]) {
  if (!status || status === "not_tested") return "No probado";
  if (status === "success") return "Success";
  return "Fail";
}

function statusChip(snapshot: EcuadorProviderDiagnosticsSnapshot) {
  if (snapshot.provider === "delivereo" && snapshot.authTest === "fail") {
    return "bg-amber-50 text-amber-700";
  }
  if (snapshot.providerStatus === "contact_required") {
    return "bg-orange-50 text-orange-700";
  }
  if (snapshot.providerStatus === "integration_pending") {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-sky-50 text-sky-700";
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

import Link from "next/link";
import { AlertTriangle, Ban, Network, ShieldCheck } from "lucide-react";
import { getProviderReadiness } from "@/lib/ecuador/providerHealth";

const rows = [
  { label: "Provider", value: "Delivereo" },
  { label: "Status", value: "Not configured" },
  { label: "Credentials", value: "Not configured" },
  { label: "Network", value: "Not tested" },
  { label: "Orders", value: "Disabled" },
  { label: "Tracking", value: "Disabled" },
] as const;

export function AdminEcuadorProvidersDiagnostics() {
  const readiness = getProviderReadiness("delivereo");

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
          <Link
            href="/admin/ecuador-envios"
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Volver a solicitudes Ecuador
          </Link>
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
            <FlagCard label="Configured" value={readiness.configured ? "Yes" : "No"} icon={ShieldCheck} />
            <FlagCard label="Credentials present" value={readiness.credentialsPresent ? "Yes" : "No"} icon={Ban} />
            <FlagCard label="Can quote" value={readiness.canQuote ? "Yes" : "No"} icon={Network} />
            <FlagCard label="Can create orders" value={readiness.canCreateOrders ? "Yes" : "No"} icon={Ban} />
            <FlagCard label="Can track" value={readiness.canTrack ? "Yes" : "No"} icon={Network} />
            <FlagCard label="Environment" value={readiness.status} icon={ShieldCheck} />
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <h3 className="font-black text-slate-950">Operational status</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Provider calls are disabled, tracking is disabled, and order creation is disabled until Delivereo credentials and sandbox validation arrive.
            </p>
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

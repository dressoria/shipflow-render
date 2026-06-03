"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  ClipboardList,
  CircleDollarSign,
  HelpCircle,
  MapPinned,
  PackageCheck,
  PlusCircle,
  Settings,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { useRegionMode } from "@/contexts/RegionModeContext";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/forms";
import { getBalanceSummary } from "@/lib/services/balanceService";
import { getShipments } from "@/lib/services/shipmentService";
import { getPrepAccessState } from "@/lib/prepAccess";
import type { Envio, MovimientoSaldo } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const statusTone = {
  Entregado: "green",
  "En tránsito": "blue",
  Pendiente: "amber",
} as const;

function displayLabelStatus(status?: string | null) {
  if (!status) return "No label";
  if (status === "purchased") return "Label ready";
  if (status === "voided") return "Voided";
  if (status === "failed") return "Failed";
  if (status === "processing") return "Processing";
  return status.replaceAll("_", " ");
}

function activityDate(value: string) {
  try {
    return formatDate(value);
  } catch {
    return "Recently";
  }
}

type DashboardActivity =
  | { id: string; kind: "shipment"; title: string; detail: string; amount: number; date: string; href: string; tone: "blue" | "green" | "amber" | "slate" }
  | { id: string; kind: "wallet"; title: string; detail: string; amount: number; date: string; href: string; tone: "blue" | "green" | "amber" | "slate" };

export function DashboardOverview() {
  const { user } = useAuth();
  const { mode } = useRegionMode();
  const [shipments, setShipments] = useState<Envio[]>([]);
  const [movements, setMovements] = useState<MovimientoSaldo[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.setTimeout(() => {
      Promise.all([getShipments(), getBalanceSummary()]).then(([nextShipments, balanceSummary]) => {
        setShipments(nextShipments);
        setBalance(balanceSummary.availableBalance ?? balanceSummary.balance ?? 0);
        setMovements(balanceSummary.recentMovements ?? balanceSummary.movements ?? []);
        setLoading(false);
      });
    }, 200);
  }, []);

  const stats = useMemo(() => {
    const total = shipments.reduce((sum, shipment) => sum + (shipment.customerPrice ?? shipment.total ?? shipment.value ?? 0), 0);
    const inTransit = shipments.filter((shipment) => shipment.status === "En tránsito").length;
    const labelsPurchased = shipments.filter((shipment) => shipment.labelStatus === "purchased").length;
    const issues = shipments.filter((shipment) => ["failed", "voided"].includes(shipment.labelStatus ?? "")).length;
    return { total, inTransit, labelsPurchased, issues };
  }, [shipments]);

  const recentActivity = useMemo<DashboardActivity[]>(() => {
    const shipmentActivity = shipments.slice(0, 5).map((shipment) => ({
      id: `shipment-${shipment.id}`,
      kind: "shipment" as const,
      title: shipment.trackingNumber || shipment.id,
      detail: `${shipment.recipientName} · ${displayLabelStatus(shipment.labelStatus)}`,
      amount: shipment.customerPrice ?? shipment.total ?? shipment.value ?? 0,
      date: shipment.date,
      href: shipment.trackingNumber ? `/guia/${shipment.trackingNumber}` : "/envios",
      tone: shipment.labelStatus === "purchased" ? "green" as const : statusTone[shipment.status],
    }));
    const walletActivity = movements.slice(0, 4).map((movement) => ({
      id: `wallet-${movement.id}`,
      kind: "wallet" as const,
      title: movement.concept,
      detail: movement.type ? movement.type.replaceAll("_", " ") : "Wallet activity",
      amount: movement.amount,
      date: movement.date,
      href: "/saldo",
      tone: movement.amount >= 0 ? "green" as const : "amber" as const,
    }));
    return [...shipmentActivity, ...walletActivity]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [movements, shipments]);

  const profileIncomplete = !user?.businessName;
  const hasShipments = shipments.length > 0;
  const greetingName = user?.businessName || user?.email?.split("@")[0] || "there";
  const prepAccess = getPrepAccessState(user);
  const isEcuadorMode = mode === "ec";

  if (loading) {
    return (
      <div className="grid gap-4">
        <LoadingState />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LoadingState />
          <LoadingState />
          <LoadingState />
          <LoadingState />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm shadow-slate-950/5">
        <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">{isEcuadorMode ? "Vista regional" : "Controlled beta"}</Badge>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${isEcuadorMode ? "bg-sky-50 text-sky-700" : "bg-green-50 text-green-700"}`}>
                {isEcuadorMode ? "Modo Ecuador · Solicitudes beta" : "Automatic labels enabled"}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              {isEcuadorMode ? `Qué bueno verte, ${greetingName}.` : `Good to see you, ${greetingName}.`}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {isEcuadorMode
                ? "Estamos preparando tu espacio multicourier Ecuador para solicitudes beta, cotizaciones en preparación y cobertura nacional por operadores aliados."
                : "Compare rates, pay with wallet or card, and manage domestic shipments from one operating workspace."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {isEcuadorMode ? (
                <>
                  <QuickAction href="/ecuador/crear-envio" icon={MapPinned} label="Solicitar revisión beta" detail="No crea envío real" accent="blue" />
                  <QuickAction href="/ecuador/crear-envio" icon={Truck} label="Cotizar envío beta" detail="Sin cobro por ahora" accent="blue" />
                  <QuickAction href="/support" icon={HelpCircle} label="Solicitar acceso temprano" detail="Red Ecuador en preparación" accent="slate" />
                  <QuickAction href="/ecuador/envios" icon={Boxes} label="Mis solicitudes Ecuador" detail="Seguimiento beta" accent="slate" />
                </>
              ) : (
                <>
                  <QuickAction href="/crear-guia" icon={PlusCircle} label="Create shipment" detail="Single label flow" accent="orange" />
                  <QuickAction href="/crear-guia" icon={Boxes} label="Multi-label beta" detail="Up to 5 shipments" accent="blue" />
                </>
              )}
              <QuickAction
                href="/prep"
                icon={ClipboardList}
                label="SendiFlash Prep"
                detail={prepAccess.canUsePrep ? "FBA prep requests" : "In preparation"}
                accent={prepAccess.canUsePrep ? "orange" : "slate"}
              />
              {prepAccess.canUsePrep ? (
                <QuickAction href="/prep/orders" icon={ClipboardList} label="Prep orders" detail="Beta operations" accent="orange" />
              ) : null}
              {!isEcuadorMode ? <QuickAction href="/saldo" icon={Wallet} label="Add balance" detail={formatCurrency(balance)} accent="green" /> : null}
              {!isEcuadorMode ? <QuickAction href="/envios" icon={Truck} label="My Shipments" detail={`${shipments.length} total`} accent="blue" /> : null}
              {!isEcuadorMode ? <QuickAction href="/ecuador" icon={MapPinned} label="Ecuador Shipping" detail="Coming soon" accent="slate" /> : null}
              <QuickAction href={isEcuadorMode ? "/perfil" : "/perfil"} icon={Settings} label={isEcuadorMode ? "Perfil" : "Profile"} detail={profileIncomplete ? (isEcuadorMode ? "Completa tu cuenta" : "Complete setup") : (isEcuadorMode ? "Datos de la cuenta" : "Account settings")} accent={profileIncomplete ? "orange" : "slate"} />
              {isEcuadorMode ? <QuickAction href="/shipping-labels" icon={Truck} label="También USA" detail="Shipping Labels secundario" accent="orange" /> : null}
              <QuickAction href="/support" icon={HelpCircle} label="Support" detail="Beta help center" accent="slate" />
            </div>
          </div>
          <div className={`rounded-3xl border p-4 ${isEcuadorMode ? "border-sky-100 bg-sky-50/60" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">{isEcuadorMode ? "Siguientes pasos" : "Next best steps"}</p>
            <div className="mt-4 grid gap-3">
              <NextStep done={isEcuadorMode ? false : hasShipments} title={isEcuadorMode ? "Revisar vista previa Ecuador" : "Create your first shipment"} href={isEcuadorMode ? "/ecuador/crear-envio" : "/crear-guia"} />
              <NextStep done={isEcuadorMode ? false : balance > 0} title={isEcuadorMode ? "Solicitar acceso temprano" : "Add wallet balance"} href={isEcuadorMode ? "/support" : "/saldo"} />
              <NextStep done={!profileIncomplete} title={isEcuadorMode ? "Completa tu perfil" : "Complete your profile"} href="/perfil" />
              <NextStep done={false} title={isEcuadorMode ? "Conocer el estado beta" : "Read the beta support guide"} href="/support" optional />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-6">
        <MetricCard label={isEcuadorMode ? "Envíos USA" : "Shipments"} value={shipments.length.toString()} detail={isEcuadorMode ? "Historial disponible" : "Created"} icon={PackageCheck} tone="blue" />
        <MetricCard label={isEcuadorMode ? "Cotización beta" : "Spend"} value={isEcuadorMode ? "Activa" : formatCurrency(stats.total)} detail={isEcuadorMode ? "Sin cobro" : "Estimated total"} icon={CircleDollarSign} tone="green" />
        <MetricCard label={isEcuadorMode ? "Cobertura Ecuador" : "Active"} value={isEcuadorMode ? "6+" : stats.inTransit.toString()} detail={isEcuadorMode ? "Ciudades foco" : "In transit"} icon={Truck} tone="blue" />
        <MetricCard label="Balance" value={isEcuadorMode ? "USA" : formatCurrency(balance)} detail={isEcuadorMode ? "Carril secundario" : "Available"} icon={Wallet} tone="green" />
        <MetricCard label={isEcuadorMode ? "Etiquetas USA" : "Labels"} value={stats.labelsPurchased.toString()} detail={isEcuadorMode ? "Compradas" : "Purchased"} icon={BadgeCheck} tone="blue" />
        <MetricCard label={isEcuadorMode ? "Incidencias" : "Issues"} value={stats.issues.toString()} detail={isEcuadorMode ? "Revisión necesaria" : "Need review"} icon={AlertTriangle} tone={stats.issues > 0 ? "amber" : "slate"} />
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="font-black text-slate-950">Recent activity</h2>
              <p className="text-sm text-slate-500">Shipments and wallet movement in one timeline.</p>
            </div>
            <Link href="/envios" className="inline-flex items-center gap-1 text-sm font-black text-[#2563EB]">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.href}
                  className="grid gap-3 px-4 py-3 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_140px_110px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={activity.tone}>{activity.kind === "shipment" ? "Shipment" : "Wallet"}</Badge>
                      <p className="truncate font-black text-slate-950">{activity.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{activity.detail}</p>
                  </div>
                  <p className="font-black text-slate-950 md:text-right">{formatCurrency(activity.amount)}</p>
                  <p className="text-sm text-slate-500 md:text-right">{activityDate(activity.date)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={Truck}
                title={isEcuadorMode ? "Sin actividad todavía" : "No activity yet"}
                description={isEcuadorMode ? "Tus movimientos de cuenta y Shipping Labels USA aparecerán aquí mientras Ecuador sigue en preparación." : "Create a shipment or add wallet balance to start your activity timeline."}
              />
            </div>
          )}
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-black text-slate-950">Operational status</h3>
                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  <StatusLine label="Automatic labels" value="On after payment" />
                  <StatusLine label="Markets" value="Selected domestic routes" />
                  <StatusLine label="Payments" value="Wallet and card" />
                  <StatusLine label="Ecuador Shipping" value="Coming soon" />
                  <StatusLine label="FBA Prep" value={prepAccess.canUsePrep ? "Beta enabled" : "In preparation"} />
                  <StatusLine label="Exceptions" value="Support review" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
            <p className="font-black text-slate-950">Need help shipping?</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              If a label needs review, payment is confirmed and support can retry safely.
            </p>
            <Link href="/support" className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[#EA580C]">
              Open support guide
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  detail,
  accent,
}: {
  href: string;
  icon: typeof PlusCircle;
  label: string;
  detail: string;
  accent: "blue" | "orange" | "green" | "slate";
}) {
  const colors = {
    blue: "border-blue-100 bg-blue-50 text-[#2563EB]",
    orange: "border-orange-100 bg-orange-50 text-[#F97316]",
    green: "border-green-100 bg-green-50 text-green-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  }[accent];

  return (
    <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl border ${colors}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{label}</p>
          <p className="truncate text-xs font-semibold text-slate-500">{detail}</p>
        </div>
      </div>
    </Link>
  );
}

function NextStep({ done, title, href, optional = false }: { done: boolean; title: string; href: string; optional?: boolean }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2.5 text-sm transition hover:bg-blue-50">
      <span className="flex items-center gap-2 font-bold text-slate-700">
        <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${done ? "bg-green-100 text-green-700" : "bg-orange-100 text-[#EA580C]"}`}>
          {done ? "✓" : optional ? "?" : "!"}
        </span>
        {title}
      </span>
      <ArrowRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof PackageCheck;
  tone: "blue" | "green" | "amber" | "slate";
}) {
  const colors = {
    blue: "bg-blue-50 text-[#2563EB]",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${colors}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-black text-slate-950">{value}</span>
    </div>
  );
}

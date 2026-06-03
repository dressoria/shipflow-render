"use client";

import Image from "next/image";
import { Badge } from "@/components/Badge";
import { MotionCard } from "@/components/Motion";

type EcuadorOperatorStatus = "En preparación" | "Beta cotización";

type EcuadorOperator = {
  name: string;
  logo: string;
  status: EcuadorOperatorStatus;
  logoClassName?: string;
};

export const ECUADOR_OPERATORS: EcuadorOperator[] = [
  {
    name: "Servientrega",
    logo: "/images/ecuador/operators/servientrega.svg",
    status: "En preparación",
    logoClassName: "max-h-10 w-auto",
  },
  {
    name: "LaarCourier",
    logo: "/images/ecuador/operators/laarcourier.png",
    status: "En preparación",
    logoClassName: "max-h-12 w-auto",
  },
  {
    name: "Tramaco",
    logo: "/images/ecuador/operators/tramaco.png",
    status: "En preparación",
    logoClassName: "max-h-10 w-auto",
  },
  {
    name: "Delivereo",
    logo: "/images/ecuador/operators/delivereo.svg",
    status: "Beta cotización",
    logoClassName: "max-h-9 w-auto",
  },
  {
    name: "Urbano Envíos",
    logo: "/images/ecuador/operators/urbano-envios.png",
    status: "En preparación",
    logoClassName: "max-h-12 w-auto",
  },
  // TODO: reemplazar por wordmark oficial de Yobel si publican un asset horizontal limpio.
  {
    name: "Yobel",
    logo: "/images/ecuador/operators/yobel.svg",
    status: "En preparación",
    logoClassName: "max-h-11 w-auto",
  },
];

function statusTone(status: EcuadorOperatorStatus) {
  if (status === "Beta cotización") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-sky-100 bg-sky-50 text-sky-700";
}

export function EcuadorOperatorsLogos() {
  return (
    <section id="operadores" className="bg-[#F8FBFF] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Operadores en preparación</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Una vista multicourier con marcas reales del ecosistema ecuatoriano
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Estamos preparando cobertura, validaciones e integraciones por operador. Delivereo ya participa en la beta de cotización y el resto sigue en preparación.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ECUADOR_OPERATORS.map((operator, index) => (
            <MotionCard
              key={operator.name}
              delay={index * 0.05}
              className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-sm shadow-sky-950/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Operador
                </div>
                <Badge className={`border ${statusTone(operator.status)}`}>{operator.status}</Badge>
              </div>

              <div className="mt-6 rounded-[1.6rem] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3f9ff_100%)] p-5 shadow-inner shadow-sky-100/40">
                <div className="flex min-h-24 items-center justify-center rounded-[1.25rem] bg-white px-4">
                  <Image
                    src={operator.logo}
                    alt={`${operator.name} logo`}
                    width={240}
                    height={80}
                    className={operator.logoClassName ?? "max-h-10 w-auto"}
                  />
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-xl font-black text-slate-950">{operator.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Operador contemplado para la experiencia Ecuador dentro de SendiFlash, con activación gradual y controles por etapa.
                </p>
              </div>
            </MotionCard>
          ))}
        </div>
      </div>
    </section>
  );
}

import type { Courier } from "../types";
import { supabase } from "./supabase";

type CourierRow = {
  id: string;
  nombre: string;
  activo: boolean;
  logo_url?: string | null;
  cobertura: string;
  precio_base: number;
  precio_por_kg: number;
  permite_contra_entrega: boolean;
  comision_contra_entrega: number;
  tiempo_estimado: string;
  notas?: string | null;
};

function fromRow(row: CourierRow): Courier {
  return {
    id: row.id,
    nombre: row.nombre,
    activo: row.activo,
    logoUrl: row.logo_url ?? undefined,
    cobertura: row.cobertura,
    precioBase: Number(row.precio_base),
    precioPorKg: Number(row.precio_por_kg),
    permiteContraEntrega: row.permite_contra_entrega,
    comisionContraEntrega: Number(row.comision_contra_entrega),
    tiempoEstimado: row.tiempo_estimado,
    notas: row.notas ?? undefined,
  };
}

export async function getCouriers() {
  const { data, error } = await supabase
    .from("couriers")
    .select("*")
    .order("nombre")
    .returns<CourierRow[]>();

  if (error) throw error;
  return data.map(fromRow);
}

export async function getActiveCouriers() {
  return (await getCouriers()).filter((courier) => courier.activo);
}

export function calculateRate(input: {
  courier: Courier;
  weight: number;
  originCity: string;
  destinationCity: string;
}) {
  const routeSurcharge = input.originCity === input.destinationCity ? 0 : 0.75;
  return Number((input.courier.precioBase + input.weight * input.courier.precioPorKg + routeSurcharge).toFixed(2));
}

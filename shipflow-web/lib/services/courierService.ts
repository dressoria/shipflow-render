import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getCourierConfigs, setCourierConfigs } from "@/lib/storage";
import type { CourierConfig, ShippingRate } from "@/lib/types";

type CourierRow = {
  id: string;
  nombre: string;
  activo: boolean;
  logo_url: string | null;
  cobertura: string;
  precio_base: number;
  precio_por_kg: number;
  permite_contra_entrega: boolean;
  comision_contra_entrega: number;
  tiempo_estimado: string;
  notas: string | null;
};

function fromRow(row: CourierRow): CourierConfig {
  return {
    id: row.id,
    nombre: row.nombre,
    activo: row.activo,
    logoUrl: row.logo_url ?? "",
    cobertura: row.cobertura,
    precioBase: row.precio_base,
    precioPorKg: row.precio_por_kg,
    permiteContraEntrega: row.permite_contra_entrega,
    comisionContraEntrega: row.comision_contra_entrega,
    tiempoEstimado: row.tiempo_estimado,
    notas: row.notas ?? "",
  };
}

function toRow(courier: CourierConfig) {
  return {
    id: courier.id,
    nombre: courier.nombre,
    activo: courier.activo,
    logo_url: courier.logoUrl,
    cobertura: courier.cobertura,
    precio_base: courier.precioBase,
    precio_por_kg: courier.precioPorKg,
    permite_contra_entrega: courier.permiteContraEntrega,
    comision_contra_entrega: courier.comisionContraEntrega,
    tiempo_estimado: courier.tiempoEstimado,
    notas: courier.notas,
  };
}

export async function getCouriers(): Promise<CourierConfig[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("couriers").select("*").order("nombre").returns<CourierRow[]>();
    if (error) throw error;
    return data.map(fromRow);
  }
  return getCourierConfigs();
}

export async function getActiveCouriers() {
  return (await getCouriers()).filter((courier) => courier.activo);
}

export async function createCourier(input: CourierConfig) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("couriers").insert(toRow(input)).select().single<CourierRow>();
    if (error) throw error;
    return fromRow(data);
  }
  const next = [input, ...getCourierConfigs()];
  setCourierConfigs(next);
  return input;
}

export async function updateCourier(id: string, input: Partial<CourierConfig>) {
  const current = (await getCouriers()).find((courier) => courier.id === id);
  if (!current) throw new Error("Courier no encontrado.");
  const updatedCourier = { ...current, ...input };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("couriers").update(toRow(updatedCourier)).eq("id", id).select().single<CourierRow>();
    if (error) throw error;
    return fromRow(data);
  }
  setCourierConfigs(getCourierConfigs().map((courier) => courier.id === id ? updatedCourier : courier));
  return updatedCourier;
}

export async function deleteCourier(id: string) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("couriers").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  setCourierConfigs(getCourierConfigs().filter((courier) => courier.id !== id));
}

export function calculateShippingRate(input: {
  courier: CourierConfig;
  peso: number;
  ciudadOrigen: string;
  ciudadDestino: string;
  contraEntrega: boolean;
  valorCobrar: number;
}): ShippingRate {
  const routeSurcharge = input.ciudadOrigen === input.ciudadDestino ? 0 : 0.75;
  const subtotal = Number((input.courier.precioBase + input.peso * input.courier.precioPorKg + routeSurcharge).toFixed(2));
  const contraEntregaComision =
    input.contraEntrega && input.courier.permiteContraEntrega
      ? Number(Math.max(input.courier.comisionContraEntrega, input.valorCobrar * 0.02).toFixed(2))
      : 0;
  return { courier: input.courier, subtotal, contraEntregaComision, total: Number((subtotal + contraEntregaComision).toFixed(2)) };
}

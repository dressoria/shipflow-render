import type { RealTrackingEvent, ShipmentStatus, StandardTrackingStatus, TrackingEvent, TrackingStatus } from "../types";
import { supabase } from "./supabase";

type TrackingRow = {
  id: string;
  shipment_id: string;
  tracking_number: string;
  title: string;
  description?: string | null;
  status: string;
  status_label?: string | null;
  location?: string | null;
  event_date?: string | null;
  created_at: string;
};

const statusMap: Record<StandardTrackingStatus, ShipmentStatus> = {
  pendiente: "Pendiente",
  recolectado: "En tránsito",
  en_transito: "En tránsito",
  en_reparto: "En tránsito",
  entregado: "Entregado",
  novedad: "Pendiente",
  devuelto: "Pendiente",
  cancelado: "Pendiente",
};

function fromRow(row: TrackingRow): TrackingEvent {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    trackingNumber: row.tracking_number,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status === "Entregado" || row.status === "En tránsito" || row.status === "Pendiente" ? row.status : "Pendiente",
    date: row.event_date ?? row.created_at,
  };
}

export async function getTrackingEvents(trackingNumber: string) {
  const { data, error } = await supabase
    .from("tracking_events")
    .select("*")
    .eq("tracking_number", trackingNumber.trim())
    .order("created_at", { ascending: true })
    .returns<TrackingRow[]>();

  if (error) throw error;
  return data.map(fromRow);
}

function eventKey(event: RealTrackingEvent) {
  return `${event.date ?? ""}|${event.location ?? ""}|${event.description ?? event.title}|${event.status}`;
}

export async function saveRealTrackingEvents(shipmentId: string, tracking: TrackingStatus) {
  if (tracking.events.length === 0) return;

  const { data: existing, error: existingError } = await supabase
    .from("tracking_events")
    .select("title,description,status,created_at,event_date,location")
    .eq("tracking_number", tracking.trackingNumber)
    .returns<Array<{ title: string; description?: string | null; status: string; created_at: string; event_date?: string | null; location?: string | null }>>();

  if (existingError) return;

  const existingKeys = new Set(
    existing.map((event) =>
      `${event.event_date ?? event.created_at}|${event.location ?? ""}|${event.description ?? event.title}|${event.status}`,
    ),
  );

  const rows = tracking.events
    .filter((event) => !existingKeys.has(eventKey(event)))
    .map((event) => ({
      shipment_id: shipmentId,
      tracking_number: tracking.trackingNumber,
      title: event.title,
      description: event.description,
      status: statusMap[event.status],
      status_label: event.statusLabel,
      location: event.location,
      event_date: event.date ?? new Date().toISOString(),
      source: tracking.source,
      is_real: tracking.isReal,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("tracking_events").insert(rows);
  if (!error) return;

  await supabase.from("tracking_events").insert(
    rows.map(({ status_label, location, event_date, source, is_real, ...legacy }) => ({
      ...legacy,
      status: legacy.status,
    })),
  );
}

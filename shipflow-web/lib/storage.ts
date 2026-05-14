import { shipments as demoShipments } from "@/data/site";
import type { CourierConfig, Envio, MovimientoSaldo, ShipmentStatus, Usuario } from "@/lib/types";

export type CreatedShipment = Envio;
export type BalanceMovement = MovimientoSaldo;

const SHIPMENTS_KEY = "shipflow-shipments";
const BALANCE_KEY = "shipflow-balance";
const MOVEMENTS_KEY = "shipflow-balance-movements";
const USER_KEY = "shipflow-user";
const USERS_KEY = "shipflow-users";
const COURIERS_KEY = "shipflow-couriers";

export const defaultCourierConfigs: CourierConfig[] = [
  { id: "usps", nombre: "USPS", activo: true, logoUrl: "", cobertura: "U.S. nationwide", precioBase: 5.2, precioPorKg: 0.85, permiteContraEntrega: false, comisionContraEntrega: 0, tiempoEstimado: "2-5 business days", notas: "Strong option for lightweight parcels and mailbox delivery." },
  { id: "ups", nombre: "UPS", activo: true, logoUrl: "", cobertura: "Ground and express", precioBase: 7.9, precioPorKg: 1.15, permiteContraEntrega: false, comisionContraEntrega: 0, tiempoEstimado: "1-5 business days", notas: "Reliable ground network for ecommerce sellers." },
  { id: "fedex", nombre: "FedEx", activo: true, logoUrl: "", cobertura: "Home, Ground, Express", precioBase: 8.4, precioPorKg: 1.2, permiteContraEntrega: false, comisionContraEntrega: 0, tiempoEstimado: "1-5 business days", notas: "Express and home delivery coverage." },
  { id: "dhl", nombre: "DHL", activo: true, logoUrl: "", cobertura: "Domestic and international", precioBase: 10.2, precioPorKg: 1.4, permiteContraEntrega: false, comisionContraEntrega: 0, tiempoEstimado: "2-7 business days", notas: "Useful for cross-border ecommerce." },
];

export const defaultFunctionalShipments: CreatedShipment[] = demoShipments.map(
  (shipment, index) => ({
    id: shipment.id,
    trackingNumber: shipment.id,
    senderName: "Demo Store",
    senderPhone: "555-0100",
    originCity: shipment.route.split(" -> ")[0] ?? "New York, NY",
    recipientName: shipment.customer,
    recipientPhone: "555-0188",
    destinationCity: shipment.route.split(" -> ")[1] ?? "Chicago, IL",
    destinationAddress: "100 Market Street, Suite 200",
    weight: 1 + index,
    productType: "Ecommerce goods",
    courier: shipment.courier,
    shippingSubtotal: shipment.price,
    cashOnDeliveryCommission: 0,
    total: shipment.price,
    cashOnDelivery: false,
    cashAmount: 0,
    status: shipment.status as ShipmentStatus,
    date: new Date(2026, 4, 12 - index).toISOString(),
    value: shipment.price,
  }),
);

const defaultMovements: BalanceMovement[] = [
  { id: "MOV-001", concept: "Demo wallet top-up", date: new Date(2026, 4, 12).toISOString(), amount: 150 },
  { id: "MOV-002", concept: "Label SF-24018", date: new Date(2026, 4, 12).toISOString(), amount: -8.9 },
  { id: "MOV-003", concept: "Label SF-24017", date: new Date(2026, 4, 11).toISOString(), amount: -12.4 },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getShipments() {
  return readJson<CreatedShipment[]>(SHIPMENTS_KEY, defaultFunctionalShipments).map((shipment) => ({
    ...shipment,
    trackingNumber: shipment.trackingNumber ?? shipment.id,
  }));
}

export function saveShipment(shipment: CreatedShipment) {
  const next = [shipment, ...getShipments()];
  writeJson(SHIPMENTS_KEY, next);
  setBalance(Number((getBalance() - shipment.value).toFixed(2)));
  addBalanceMovement({
    id: `MOV-${Date.now()}`,
    concept: `Label ${shipment.id}`,
    date: new Date().toISOString(),
    amount: -shipment.value,
  });
  return next;
}

export function findShipment(id: string) {
  return getShipments().find(
    (shipment) =>
      shipment.id.toLowerCase() === id.trim().toLowerCase() ||
      shipment.trackingNumber.toLowerCase() === id.trim().toLowerCase(),
  );
}

export function getBalance() {
  return readJson<number>(BALANCE_KEY, 128.7);
}

export function setBalance(value: number) {
  writeJson(BALANCE_KEY, value);
}

export function getBalanceMovements() {
  return readJson<BalanceMovement[]>(MOVEMENTS_KEY, defaultMovements);
}

export function addBalanceMovement(movement: BalanceMovement) {
  const next = [movement, ...getBalanceMovements()];
  writeJson(MOVEMENTS_KEY, next);
  return next;
}

export function saveUser(user: { name?: string; email: string; role?: Usuario["role"] }) {
  writeJson(USER_KEY, user);
  upsertDemoUser({
    id: user.email === "admin@shipflow.local" ? "demo-admin" : `demo-${user.email}`,
    email: user.email,
    businessName: user.name,
    role: user.role ?? "user",
    createdAt: new Date().toISOString(),
  });
}

export function getUser() {
  return readJson<{ name?: string; email: string; role?: Usuario["role"] } | null>(USER_KEY, null);
}

export function getDemoUsers() {
  const users = readJson<Usuario[]>(USERS_KEY, []);
  const admin: Usuario = {
    id: "demo-admin",
    email: "admin@shipflow.local",
    businessName: "ShipFlow Admin",
    role: "admin",
    createdAt: new Date(2026, 4, 12).toISOString(),
  };

  return [admin, ...users.filter((user) => user.email !== admin.email)];
}

export function upsertDemoUser(user: Usuario) {
  const users = getDemoUsers();
  const next = [user, ...users.filter((item) => item.email !== user.email)];
  writeJson(USERS_KEY, next);
  return next;
}

export function getCourierConfigs() {
  return readJson<CourierConfig[]>(COURIERS_KEY, defaultCourierConfigs);
}

export function setCourierConfigs(couriers: CourierConfig[]) {
  writeJson(COURIERS_KEY, couriers);
}

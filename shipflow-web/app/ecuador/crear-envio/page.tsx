import { DashboardShell } from "@/components/DashboardShell";
import { EcuadorShipmentRequestForm } from "@/components/EcuadorShipmentRequestForm";

export default function EcuadorCreateShipmentPage() {
  return (
    <DashboardShell
      title="Envíos Ecuador"
      description="Solicitud beta para Ecuador Shipping sin crear órdenes reales ni llamar proveedores."
    >
      <EcuadorShipmentRequestForm />
    </DashboardShell>
  );
}

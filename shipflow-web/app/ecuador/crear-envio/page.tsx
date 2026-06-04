import { DashboardShell } from "@/components/DashboardShell";
import { EcuadorShipmentRequestForm } from "@/components/EcuadorShipmentRequestForm";

export default function EcuadorCreateShipmentPage() {
  return (
    <DashboardShell
      title="Cotización Ecuador"
      description="Prepara una solicitud Ecuador, revisa cotizaciones disponibles y organiza tus paquetes sin crear órdenes reales."
    >
      <EcuadorShipmentRequestForm />
    </DashboardShell>
  );
}

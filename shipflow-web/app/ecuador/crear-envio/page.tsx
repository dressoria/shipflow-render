import { DashboardShell } from "@/components/DashboardShell";
import { EcuadorShipmentRequestForm } from "@/components/EcuadorShipmentRequestForm";

export default function EcuadorCreateShipmentPage() {
  return (
    <DashboardShell
      title="Nueva solicitud"
      description="Completa origen, destino y paquetes para consultar operadores disponibles."
    >
      <EcuadorShipmentRequestForm />
    </DashboardShell>
  );
}

import { DashboardShell } from "@/components/DashboardShell";
import { EcuadorShipmentsView } from "@/components/EcuadorShipmentsView";

export default function EcuadorShipmentsPage() {
  return (
    <DashboardShell
      title="Envíos Ecuador"
      description="Historial de solicitudes Ecuador visibles solo para tu cuenta."
    >
      <EcuadorShipmentsView />
    </DashboardShell>
  );
}

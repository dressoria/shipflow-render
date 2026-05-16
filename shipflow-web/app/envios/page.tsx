import { DashboardShell } from "@/components/DashboardShell";
import { ShipmentsTable } from "@/components/ShipmentsTable";

export default function ShipmentsPage() {
  return (
    <DashboardShell
      title="Envíos"
      description="Consulta tus guías creadas, estados, costos y acciones disponibles."
    >
      <ShipmentsTable />
    </DashboardShell>
  );
}

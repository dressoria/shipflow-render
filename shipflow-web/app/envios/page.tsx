import { DashboardShell } from "@/components/DashboardShell";
import { ShipmentsTable } from "@/components/ShipmentsTable";

export default function ShipmentsPage() {
  return (
    <DashboardShell
      title="Envíos"
      description="Lista funcional de envíos guardados en la base principal cuando Supabase está activo."
    >
      <ShipmentsTable />
    </DashboardShell>
  );
}

import { DashboardShell } from "@/components/DashboardShell";
import { ShipmentsTable } from "@/components/ShipmentsTable";

export default function ShipmentsPage() {
  return (
    <DashboardShell
      title="Shipments"
      description="Review created shipments, statuses, costs, and available actions."
    >
      <ShipmentsTable />
    </DashboardShell>
  );
}

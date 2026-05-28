import { DashboardShell } from "@/components/DashboardShell";
import { ShipmentsTable } from "@/components/ShipmentsTable";

export default function ShipmentsPage() {
  return (
    <DashboardShell
      title="My Shipments"
      description="Download labels, review tracking numbers, and manage your shipping history after checkout."
    >
      <ShipmentsTable />
    </DashboardShell>
  );
}

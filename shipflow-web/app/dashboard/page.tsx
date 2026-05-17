import { DashboardOverview } from "@/components/DashboardOverview";
import { DashboardShell } from "@/components/DashboardShell";

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Dashboard"
      description="Overview of shipments, estimated costs, in-transit packages, and available balance."
    >
      <DashboardOverview />
    </DashboardShell>
  );
}

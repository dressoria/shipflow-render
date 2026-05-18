import { DashboardShell } from "@/components/DashboardShell";
import { TrackingSearch } from "@/components/TrackingSearch";

export default function TrackingPage() {
  return (
    <DashboardShell
      title="Tracking"
      description="Enter a tracking number to view shipment details and carrier updates."
    >
      <TrackingSearch />
    </DashboardShell>
  );
}

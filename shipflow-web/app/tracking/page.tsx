import { DashboardShell } from "@/components/DashboardShell";
import { TrackingSearch } from "@/components/TrackingSearch";

export default function TrackingPage() {
  return (
    <DashboardShell
      title="Tracking"
      description="Track shipments once a tracking number is available."
    >
      <TrackingSearch />
    </DashboardShell>
  );
}

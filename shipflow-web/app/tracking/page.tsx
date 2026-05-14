import { DashboardShell } from "@/components/DashboardShell";
import { TrackingSearch } from "@/components/TrackingSearch";

export default function TrackingPage() {
  return (
    <DashboardShell
      title="Tracking"
      description="Search by tracking number and check carrier status when live data is available."
    >
      <TrackingSearch />
    </DashboardShell>
  );
}

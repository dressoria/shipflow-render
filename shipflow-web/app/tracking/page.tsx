import { DashboardShell } from "@/components/DashboardShell";
import { TrackingSearch } from "@/components/TrackingSearch";

export default function TrackingPage() {
  return (
    <DashboardShell
      title="Tracking"
      description="Consulta el estado de tus guías cuando tengan número de tracking."
    >
      <TrackingSearch />
    </DashboardShell>
  );
}

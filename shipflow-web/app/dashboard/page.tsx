import { DashboardOverview } from "@/components/DashboardOverview";
import { DashboardShell } from "@/components/DashboardShell";

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Dashboard"
      description="Resumen de guías, costos estimados, envíos en tránsito y saldo disponible."
    >
      <DashboardOverview />
    </DashboardShell>
  );
}

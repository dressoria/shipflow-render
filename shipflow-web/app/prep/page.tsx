import { DashboardShell } from "@/components/DashboardShell";
import { PrepGate } from "@/components/PrepGate";
import { PrepOverview } from "@/components/PrepOverview";

export default function PrepPage() {
  return (
    <DashboardShell
      title="SendiFlash Prep"
      description="Managed Amazon FBA prep requests reviewed and tracked inside SendiFlash."
    >
      <PrepGate>
        <PrepOverview />
      </PrepGate>
    </DashboardShell>
  );
}

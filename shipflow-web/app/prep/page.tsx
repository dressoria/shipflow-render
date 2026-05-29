import { DashboardShell } from "@/components/DashboardShell";
import { PrepOverview } from "@/components/PrepOverview";

export default function PrepPage() {
  return (
    <DashboardShell
      title="SendiFlash Prep"
      description="Managed Amazon FBA prep requests reviewed and tracked inside SendiFlash."
    >
      <PrepOverview />
    </DashboardShell>
  );
}

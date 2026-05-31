import { DashboardShell } from "@/components/DashboardShell";
import { PrepGate } from "@/components/PrepGate";
import { PrepOrdersView } from "@/components/PrepOrdersView";

export default function PrepOrdersPage() {
  return (
    <DashboardShell
      title="Prep Orders"
      description="Track SendiFlash-managed Amazon FBA prep requests."
    >
      <PrepGate>
        <PrepOrdersView />
      </PrepGate>
    </DashboardShell>
  );
}

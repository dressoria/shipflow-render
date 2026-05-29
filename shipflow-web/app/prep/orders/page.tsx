import { DashboardShell } from "@/components/DashboardShell";
import { PrepOrdersView } from "@/components/PrepOrdersView";

export default function PrepOrdersPage() {
  return (
    <DashboardShell
      title="Prep Orders"
      description="Track SendiFlash-managed Amazon FBA prep requests."
    >
      <PrepOrdersView />
    </DashboardShell>
  );
}

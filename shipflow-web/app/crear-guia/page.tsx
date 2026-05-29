import { CreateGuideWorkspace } from "@/components/CreateGuideWorkspace";
import { DashboardShell } from "@/components/DashboardShell";

export default function CreateGuidePage() {
  return (
    <DashboardShell
      title="Get rates"
      description="Compare rates using From, To, and package details."
    >
      <CreateGuideWorkspace />
    </DashboardShell>
  );
}

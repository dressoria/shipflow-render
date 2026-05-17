import { CreateGuideForm } from "@/components/CreateGuideForm";
import { DashboardShell } from "@/components/DashboardShell";

export default function CreateGuidePage() {
  return (
    <DashboardShell
      title="Get rates"
      description="Compare rates using From, To, and package details."
    >
      <CreateGuideForm />
    </DashboardShell>
  );
}

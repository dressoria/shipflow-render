import { CreateGuideForm } from "@/components/CreateGuideForm";
import { DashboardShell } from "@/components/DashboardShell";

export default function CreateGuidePage() {
  return (
    <DashboardShell
      title="Create label"
      description="Functional form with validation, rate comparison, print view, and saved shipments."
    >
      <CreateGuideForm />
    </DashboardShell>
  );
}

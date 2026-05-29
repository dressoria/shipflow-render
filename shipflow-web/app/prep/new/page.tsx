import { DashboardShell } from "@/components/DashboardShell";
import { PrepOrderForm } from "@/components/PrepOrderForm";

export default function NewPrepOrderPage() {
  return (
    <DashboardShell
      title="Create Prep request"
      description="Send inventory details for manual SendiFlash review before final quote."
    >
      <PrepOrderForm />
    </DashboardShell>
  );
}

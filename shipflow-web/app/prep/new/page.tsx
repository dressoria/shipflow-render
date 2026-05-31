import { DashboardShell } from "@/components/DashboardShell";
import { PrepGate } from "@/components/PrepGate";
import { PrepOrderForm } from "@/components/PrepOrderForm";

export default function NewPrepOrderPage() {
  return (
    <DashboardShell
      title="Create Prep request"
      description="Send inventory details for manual SendiFlash review before final quote."
    >
      <PrepGate>
        <PrepOrderForm />
      </PrepGate>
    </DashboardShell>
  );
}

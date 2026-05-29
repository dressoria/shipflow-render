import { AdminPrepOrdersView } from "@/components/AdminPrepOrdersView";
import { AdminShell } from "@/components/AdminShell";

export default function AdminPrepOrdersPage() {
  return (
    <AdminShell
      title="Prep Orders"
      description="Review SendiFlash Prep requests, update statuses, and manage internal partner details."
    >
      <AdminPrepOrdersView />
    </AdminShell>
  );
}

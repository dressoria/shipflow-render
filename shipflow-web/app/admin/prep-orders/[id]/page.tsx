import { AdminPrepOrdersView } from "@/components/AdminPrepOrdersView";
import { AdminShell } from "@/components/AdminShell";

export default async function AdminPrepOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell
      title="Prep Order Detail"
      description="Admin-only SendiFlash Prep controls, pricing, partner references, and internal events."
    >
      <AdminPrepOrdersView orderId={id} />
    </AdminShell>
  );
}

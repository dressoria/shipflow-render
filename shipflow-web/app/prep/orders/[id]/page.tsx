import { DashboardShell } from "@/components/DashboardShell";
import { PrepOrderDetail } from "@/components/PrepOrderDetail";

export default async function PrepOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DashboardShell
      title="Prep Order"
      description="Customer-visible status, items, and next steps for this SendiFlash Prep request."
    >
      <PrepOrderDetail id={id} />
    </DashboardShell>
  );
}

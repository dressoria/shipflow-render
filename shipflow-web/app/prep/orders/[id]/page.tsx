import { Suspense } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { PrepOrderDetail } from "@/components/PrepOrderDetail";
import { PrepGate } from "@/components/PrepGate";
import { LoadingState } from "@/components/LoadingState";

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
      <PrepGate>
        <Suspense fallback={<LoadingState />}>
          <PrepOrderDetail id={id} />
        </Suspense>
      </PrepGate>
    </DashboardShell>
  );
}

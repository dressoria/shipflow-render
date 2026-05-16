import { CreateGuideForm } from "@/components/CreateGuideForm";
import { DashboardShell } from "@/components/DashboardShell";

export default function CreateGuidePage() {
  return (
    <DashboardShell
      title="Cotizar envío"
      description="Cotiza tu envío con dirección de origen, destino y paquete."
    >
      <CreateGuideForm />
    </DashboardShell>
  );
}

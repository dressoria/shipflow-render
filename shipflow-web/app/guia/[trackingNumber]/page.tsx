import { PrintableGuide } from "@/components/PrintableGuide";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ trackingNumber: string }>;
}) {
  const { trackingNumber } = await params;
  return <PrintableGuide trackingNumber={trackingNumber} />;
}

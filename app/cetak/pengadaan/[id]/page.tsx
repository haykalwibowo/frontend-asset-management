import PrintPurchaseRequest from "./PrintPurchaseRequest";

export default async function CetakPengadaanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PrintPurchaseRequest id={id} />;
}

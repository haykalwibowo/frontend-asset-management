import PurchaseDetailView from "@/components/purchase/PurchaseDetailView";

export default async function AdminPengadaanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <PurchaseDetailView id={id} backHref="/purchase-requests" backLabel="Kembali ke daftar" />
    </div>
  );
}

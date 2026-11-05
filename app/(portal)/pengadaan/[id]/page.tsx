import PurchaseDetailView from "@/components/purchase/PurchaseDetailView";

export default async function PengadaanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PurchaseDetailView id={id} backHref="/pengadaan" backLabel="Kembali ke daftar" />;
}

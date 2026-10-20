import { Suspense } from "react";
import AssetDetailClient from "./AssetDetailClient";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <p className="text-gray-600">Memuat...</p>
        </div>
      }
    >
      <AssetDetailClient assetId={id} />
    </Suspense>
  );
}
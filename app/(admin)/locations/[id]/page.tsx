"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

interface Asset {
  id: string;
  name: string;
  quantity: number;
  availableQuantity: number;
}

interface LocationDetail {
  id: string;
  name: string;
  address: string | null;
  assets: Asset[];
}

export default function LocationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/locations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setLocation(res.data))
      .catch(() => setError("Gagal memuat data location"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="p-6">
      <div className="max-w-3xl">
        {loading && <p className="text-gray-500">Memuat data...</p>}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        {!loading && location && (
          <>
            <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-2xl font-bold text-gray-800">
                {location.name}
              </h2>
              <p className="mt-1 text-gray-600">
                {location.address || "Alamat belum diisi"}
              </p>
            </div>

            <h3 className="mb-3 text-lg font-semibold text-gray-800">
              Daftar Aset di Lokasi Ini
            </h3>

            {location.assets.length === 0 && (
              <div className="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
                <p className="text-gray-500">Belum ada aset di lokasi ini.</p>
              </div>
            )}

            {location.assets.length > 0 && (
              <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Nama Aset</th>
                      <th className="px-5 py-3">Stok Tersedia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {location.assets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="border-t border-gray-100 transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-3 text-gray-800">
                          {asset.name}
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                            {asset.availableQuantity} / {asset.quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
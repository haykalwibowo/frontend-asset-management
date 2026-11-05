"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import PurchaseTable from "@/components/purchase/PurchaseTable";
import {
  apiUrl,
  authHeaders,
  apiMessage,
  isUnauthorized,
  type PurchaseSummary,
} from "@/lib/purchase";

const FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: "all", label: "Semua", match: () => true },
  { key: "approval", label: "Dalam Approval", match: (s) => s.startsWith("PENDING_") },
  { key: "process", label: "Diproses", match: (s) => !s.startsWith("PENDING_") && s !== "REJECTED" },
  { key: "rejected", label: "Ditolak", match: (s) => s === "REJECTED" },
];

export default function AdminPurchaseRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PurchaseSummary[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    axios
      .get(`${apiUrl}/purchase-requests`, { params: { scope: "all" }, headers: authHeaders() })
      .then((res) => setRows(res.data))
      .catch((err) => {
        if (isUnauthorized(err)) return router.push("/login");
        setError(apiMessage(err, "Gagal memuat pengajuan"));
      });
  }, [router]);

  const active = FILTERS.find((f) => f.key === filter)!;
  const shown = rows?.filter((r) => active.match(r.status)) ?? null;

  return (
    <div className="p-6">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Pengadaan
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Pengadaan Aset</h2>
        <p className="mt-1 text-sm text-gray-500">
          Semua pengajuan pengadaan beserta posisi prosesnya.
        </p>
      </div>

      <div className="mb-4 inline-flex rounded-lg bg-gray-100 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              filter === f.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {f.label}
            {rows && (
              <span className="ml-1.5 text-xs text-gray-400">
                {rows.filter((r) => f.match(r.status)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}
      {!shown && !error && <p className="text-sm text-gray-500">Memuat...</p>}
      {shown && (
        <PurchaseTable rows={shown} basePath="/purchase-requests" emptyText="Tidak ada pengajuan." />
      )}
    </div>
  );
}

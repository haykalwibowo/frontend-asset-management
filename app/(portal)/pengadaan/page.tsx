"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus } from "lucide-react";
import PurchaseTable from "@/components/purchase/PurchaseTable";
import {
  apiUrl,
  authHeaders,
  apiMessage,
  isUnauthorized,
  type PurchaseSummary,
} from "@/lib/purchase";

type Scope = "mine" | "all";

const TABS: { scope: Scope; label: string; empty: string }[] = [
  { scope: "mine", label: "Pengajuan Saya", empty: "Belum ada pengajuan." },
  { scope: "all", label: "Semua Pengajuan", empty: "Belum ada pengajuan." },
];

// Role yang terlibat di setiap pengajuan, jadi bisa melihat semuanya
const VIEW_ALL_ROLES = ["ga", "finance", "procurement"];

export default function PengadaanPage() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("mine");
  const [rows, setRows] = useState<PurchaseSummary[] | null>(null);
  const [error, setError] = useState("");
  const [canViewAll, setCanViewAll] = useState(false);

  useEffect(() => {
    try {
      const role = JSON.parse(localStorage.getItem("user") || "{}").role;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCanViewAll(VIEW_ALL_ROLES.includes(role));
    } catch {
      setCanViewAll(false);
    }
  }, []);

  useEffect(() => {
    axios
      .get(`${apiUrl}/purchase-requests`, { params: { scope }, headers: authHeaders() })
      .then((res) => {
        setRows(res.data);
        setError("");
      })
      .catch((err) => {
        if (isUnauthorized(err)) {
          router.push("/login");
          return;
        }
        setError(apiMessage(err, "Gagal memuat pengajuan"));
      });
  }, [scope, router]);

  const tabs = TABS.filter((t) => t.scope !== "all" || canViewAll);
  const active = TABS.find((t) => t.scope === scope)!;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Pengadaan Aset</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ajukan pembelian barang / jasa dan pantau prosesnya.
          </p>
        </div>
        <Link
          href="/pengadaan/baru"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={16} strokeWidth={2.5} /> Buat Pengajuan
        </Link>
      </div>

      <div className="mb-4 inline-flex rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.scope}
            onClick={() => {
              setRows(null);
              setScope(t.scope);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              scope === t.scope ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}
      {!rows && !error && <p className="text-sm text-gray-500">Memuat...</p>}
      {rows && (
        <PurchaseTable
          rows={rows}
          basePath="/pengadaan"
          emptyText={active.empty}
          showRequester={scope !== "mine"}
        />
      )}
    </div>
  );
}

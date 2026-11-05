"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { History } from "lucide-react";
import PurchaseTable from "@/components/purchase/PurchaseTable";
import StatusBadge from "@/components/purchase/StatusBadge";
import {
  apiUrl,
  authHeaders,
  apiMessage,
  isUnauthorized,
  formatDateTime,
  STEP_LABEL,
  type PurchaseSummary,
} from "@/lib/purchase";

type Tab = "inbox" | "processed";

// Riwayat keputusan saya: apa yang saya putuskan + posisi pengajuan sekarang
function HistoryTable({ rows }: { rows: PurchaseSummary[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
        <History size={34} className="mx-auto text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">
          Belum ada pengajuan yang pernah Anda approve / tolak.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-5 py-3.5">No. Dokumen</th>
              <th className="px-5 py-3.5">Pemohon</th>
              <th className="px-5 py-3.5">Keputusan Saya</th>
              <th className="px-5 py-3.5">Catatan Saya</th>
              <th className="px-5 py-3.5">Posisi Sekarang</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const a = r.myAction;
              const approved = a?.action === "APPROVED";
              return (
                <tr key={r.id} className="transition hover:bg-blue-50/40">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/pengadaan/${r.id}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      {r.docNumber ?? "-"}
                    </Link>
                    <p className="max-w-[14rem] truncate text-xs text-gray-400" title={r.purpose}>
                      {r.purpose}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{r.requesterName}</p>
                    <p className="text-xs text-gray-400">{r.requesterDepartment ?? "-"}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {a && (
                      <>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                            approved
                              ? "bg-green-50 text-green-700 ring-green-600/20"
                              : "bg-red-50 text-red-700 ring-red-600/20"
                          }`}
                        >
                          {approved ? "Approve" : "Tolak"} · {STEP_LABEL[a.step] ?? a.step}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(a.createdAt)}</p>
                        {a.onBehalfOfName && (
                          <p className="text-xs text-gray-500">a.n. {a.onBehalfOfName}</p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="max-w-xs px-5 py-3.5 text-gray-600">
                    {a?.note ? (
                      <p className="line-clamp-2" title={a.note}>
                        {a.note}
                      </p>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={r.status} label={r.statusLabel} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("inbox");
  const [rows, setRows] = useState<PurchaseSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () =>
      axios
        .get(`${apiUrl}/purchase-requests`, { params: { scope: tab }, headers: authHeaders() })
        .then((res) => {
          setRows(res.data);
          setError("");
        })
        .catch((err) => {
          if (isUnauthorized(err)) {
            router.push("/login");
            return;
          }
          setError(apiMessage(err, "Gagal memuat data"));
        });
    load();
    // daftar "menunggu" diperbarui berkala
    if (tab !== "inbox") return;
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [tab, router]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "inbox", label: "Menunggu Saya" },
    { key: "processed", label: "Riwayat Saya" },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Perlu Tindakan</h2>
        <p className="mt-1 text-sm text-gray-500">
          {tab === "inbox"
            ? "Pengajuan pengadaan yang menunggu approval Anda, termasuk yang Anda proses atas nama orang lain lewat delegasi. Urut dari yang paling lama menunggu."
            : "Semua pengajuan yang pernah Anda approve / tolak, beserta posisi prosesnya sekarang."}
        </p>
      </div>

      <div className="mb-4 inline-flex rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === tab) return;
              setRows(null);
              setTab(t.key);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
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
      {rows && tab === "inbox" && (
        <PurchaseTable
          rows={rows}
          basePath="/pengadaan"
          emptyText="Tidak ada pengajuan yang menunggu approval Anda."
        />
      )}
      {rows && tab === "processed" && <HistoryTable rows={rows} />}
    </div>
  );
}

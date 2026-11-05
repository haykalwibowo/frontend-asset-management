"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatDateOnly, formatRupiah, type PurchaseSummary } from "@/lib/purchase";

// Tabel daftar pengajuan. `basePath` = prefix link detail (mis. "/pengadaan").
export default function PurchaseTable({
  rows,
  basePath,
  emptyText,
  showRequester = true,
}: {
  rows: PurchaseSummary[];
  basePath: string;
  emptyText: string;
  showRequester?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
        <Inbox size={34} className="mx-auto text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">{emptyText}</p>
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
              {showRequester && <th className="px-5 py-3.5">Pemohon</th>}
              <th className="px-5 py-3.5">Purpose</th>
              <th className="px-5 py-3.5 text-right">Total Estimasi</th>
              <th className="px-5 py-3.5">Due Date</th>
              <th className="px-5 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className="transition hover:bg-blue-50/40">
                <td className="px-5 py-3.5">
                  <Link
                    href={`${basePath}/${r.id}`}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    {r.docNumber ?? "-"}
                  </Link>
                  <p className="text-xs text-gray-400">{formatDateOnly(r.createdAt)}</p>
                </td>
                {showRequester && (
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{r.requesterName}</p>
                    <p className="text-xs text-gray-400">{r.requesterDepartment ?? "-"}</p>
                  </td>
                )}
                <td className="max-w-xs px-5 py-3.5">
                  <p className="truncate text-gray-700" title={r.purpose}>
                    {r.purpose}
                  </p>
                  <p className="text-xs text-gray-400">{r.itemCount} barang</p>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-gray-900">
                  {formatRupiah(r.totalEstimate)}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">
                  {formatDateOnly(r.dueDate)}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={r.status} label={r.statusLabel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

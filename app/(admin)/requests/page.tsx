"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  FileText,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Inbox,
  History,
  ArrowRightLeft,
} from "lucide-react";

interface AssignmentHistory {
  id: string;
  returnedAt: string | null;
}

interface RequestItem {
  id: string;
  quantity: number;
  note: string | null;
  documentPath: string;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
  asset: { id: string; name: string };
  employee: {
    id: string;
    name: string;
    department: { id: string; name: string } | null;
  };
  assignmentHistory?: AssignmentHistory | AssignmentHistory[] | null;
}

const PAGE_SIZE = 5;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ambil data peminjaman (bisa object atau array dari backend)
const getHistory = (r: RequestItem): AssignmentHistory | null => {
  const h = r.assignmentHistory;
  if (!h) return null;
  if (Array.isArray(h)) return h[0] ?? null;
  return h;
};

// sedang dipinjam = disetujui, punya catatan peminjaman, dan belum dikembalikan
// (sama persis dengan aturan di halaman staff)
const isBorrowing = (r: RequestItem) => {
  if (r.status !== "approved") return false;
  const h = getHistory(r);
  return !!h && !h.returnedAt;
};

const pageNumbers = (current: number, total: number): (number | "...")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
};

function Badge({
  tone,
  children,
}: {
  tone: "amber" | "blue" | "green" | "red" | "gray";
  children: React.ReactNode;
}) {
  const styles = {
    amber: ["bg-amber-50 text-amber-700 ring-amber-600/20", "bg-amber-500"],
    blue: ["bg-blue-50 text-blue-700 ring-blue-600/20", "bg-blue-500"],
    green: ["bg-green-50 text-green-700 ring-green-600/20", "bg-green-500"],
    red: ["bg-red-50 text-red-700 ring-red-600/20", "bg-red-500"],
    gray: ["bg-gray-50 text-gray-600 ring-gray-500/20", "bg-gray-400"],
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[0]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles[1]}`} />
      {children}
    </span>
  );
}

function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 border-t border-gray-200 bg-gray-50/50 px-4 py-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="inline-flex items-center rounded-md px-2 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="Sebelumnya"
      >
        <ChevronLeft size={16} />
      </button>

      {pageNumbers(page, total).map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-sm text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-w-[32px] rounded-md px-2.5 py-1.5 text-sm transition ${
              p === page
                ? "bg-blue-600 font-semibold text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        className="inline-flex items-center rounded-md px-2 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="Berikutnya"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const loadRequests = () => {
    axios
      .get(`${apiUrl}/requests`, { headers })
      .then((res) => setRequests(res.data))
      .catch(() => setError("Gagal memuat data request"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(userData);
    if (parsed.role === "staff") {
      router.push("/staff");
      return;
    }

    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (id: string) => {
    setError("");
    setActionLoading(true);
    try {
      await axios.put(`${apiUrl}/requests/${id}/approve`, {}, { headers });
      loadRequests();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal approve request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const confirmed = window.confirm("Yakin mau tolak request ini?");
    if (!confirmed) return;

    setError("");
    setActionLoading(true);
    try {
      await axios.put(`${apiUrl}/requests/${id}/reject`, {}, { headers });
      loadRequests();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal reject request");
    } finally {
      setActionLoading(false);
    }
  };

  // kiri: menunggu persetujuan + benar-benar sedang dipinjam
  const activeList = requests.filter(
    (r) => r.status === "pending" || isBorrowing(r)
  );

  // kanan: semua sisanya (ditolak, dikembalikan, atau disetujui tanpa catatan peminjaman)
  const historyList = requests.filter(
    (r) => r.status !== "pending" && !isBorrowing(r)
  );

  const activeTotalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const activeCurrent = Math.min(activePage, activeTotalPages);
  const activePaged = activeList.slice(
    (activeCurrent - 1) * PAGE_SIZE,
    activeCurrent * PAGE_SIZE
  );

  const historyTotalPages = Math.max(
    1,
    Math.ceil(historyList.length / PAGE_SIZE)
  );
  const historyCurrent = Math.min(historyPage, historyTotalPages);
  const historyPaged = historyList.slice(
    (historyCurrent - 1) * PAGE_SIZE,
    historyCurrent * PAGE_SIZE
  );

  const th = "px-4 py-3 text-left";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Request Aset
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Proses permintaan peminjaman dan pantau aset yang sedang dipinjam.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Memuat data...</p>}

      {!loading && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Kiri: menunggu & sedang dipinjam */}
          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft
                  size={18}
                  className="text-amber-500"
                  strokeWidth={1.8}
                />
                <h3 className="font-semibold text-gray-900">
                  Sedang Dipinjam &amp; Menunggu
                </h3>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {activeList.length}
              </span>
            </div>

            {activeList.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Inbox size={34} className="mx-auto text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  Tidak ada request aktif.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className={th}>Staff</th>
                        <th className={th}>Aset</th>
                        <th className={th}>Status</th>
                        <th className={th}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activePaged.map((r) => (
                        <tr
                          key={r.id}
                          className="transition hover:bg-blue-50/40"
                        >
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-gray-900">
                              {r.employee.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {r.employee.department?.name || "-"}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-gray-800">{r.asset.name}</p>
                            <p className="text-xs text-gray-400">
                              {r.quantity} unit &middot;{" "}
                              {formatDate(r.requestedAt)}
                            </p>
                            <a
                              href={`${apiUrl}/uploads/${r.documentPath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                            >
                              <FileText size={12} />
                              Dokumen
                            </a>
                          </td>
                          <td className="px-4 py-3.5">
                            {r.status === "pending" ? (
                              <Badge tone="amber">Menunggu</Badge>
                            ) : (
                              <Badge tone="blue">Dipinjam</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {r.status === "pending" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(r.id)}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                                >
                                  <Check size={14} />
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleReject(r.id)}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  <X size={14} />
                                  Tolak
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={activeCurrent}
                  total={activeTotalPages}
                  onChange={setActivePage}
                />
              </>
            )}
          </section>

          {/* Kanan: history */}
          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <History
                  size={18}
                  className="text-gray-400"
                  strokeWidth={1.8}
                />
                <h3 className="font-semibold text-gray-900">History</h3>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {historyList.length}
              </span>
            </div>

            {historyList.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Inbox size={34} className="mx-auto text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  Belum ada history.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className={th}>Staff</th>
                        <th className={th}>Aset</th>
                        <th className={th}>Status</th>
                        <th className={th}>Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historyPaged.map((r) => {
                        const h = getHistory(r);
                        const returned = r.status === "approved" && !!h?.returnedAt;
                        const approvedOnly = r.status === "approved" && !h;
                        return (
                          <tr
                            key={r.id}
                            className="transition hover:bg-blue-50/40"
                          >
                            <td className="px-4 py-3.5">
                              <p className="font-medium text-gray-900">
                                {r.employee.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {r.employee.department?.name || "-"}
                              </p>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="text-gray-800">{r.asset.name}</p>
                              <p className="text-xs text-gray-400">
                                {r.quantity} unit
                              </p>
                            </td>
                            <td className="px-4 py-3.5">
                              {returned ? (
                                <Badge tone="green">Dikembalikan</Badge>
                              ) : approvedOnly ? (
                                <Badge tone="gray">Disetujui</Badge>
                              ) : (
                                <Badge tone="red">Ditolak</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-gray-500">
                              {returned && h?.returnedAt
                                ? formatDate(h.returnedAt)
                                : r.decidedAt
                                ? formatDate(r.decidedAt)
                                : formatDate(r.requestedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={historyCurrent}
                  total={historyTotalPages}
                  onChange={setHistoryPage}
                />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
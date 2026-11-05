"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { isAdmin } from "@/lib/roles";
import {
  Search,
  UploadCloud,
  FileText,
  X,
  Undo2,
  ArrowRightLeft,
  History,
  CheckCircle2,
  XCircle,
  Inbox,
  Send,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Asset {
  id: string;
  name: string;
  quantity: number;
  availableQuantity: number;
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
  assignmentHistory: { id: string; returnedAt: string | null } | null;
}

interface ToastNotif {
  id: string;
  message: string;
  type: "approved" | "rejected";
}

const statusLabel = (status: string) => {
  if (status === "approved") return "Disetujui";
  if (status === "rejected") return "Ditolak";
  return "Menunggu";
};

const statusTone = (status: string): "green" | "red" | "amber" => {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "amber";
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function Pill({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red";
  children: React.ReactNode;
}) {
  const styles = {
    green: ["bg-green-50 text-green-700 ring-green-600/20", "bg-green-500"],
    amber: ["bg-amber-50 text-amber-700 ring-amber-600/20", "bg-amber-500"],
    red: ["bg-red-50 text-red-700 ring-red-600/20", "bg-red-500"],
  }[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[0]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles[1]}`} />
      {children}
    </span>
  );
}

export default function StaffPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  const [assetId, setAssetId] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [notifications, setNotifications] = useState<ToastNotif[]>([]);
  const prevStatusRef = useRef<Record<string, string>>({});
  const isFirstLoadRef = useRef(true);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const loadData = async () => {
    try {
      const [assetsRes, requestsRes] = await Promise.all([
        axios.get(`${apiUrl}/assets`, { headers }),
        axios.get(`${apiUrl}/requests`, { headers }),
      ]);

      const newRequests: RequestItem[] = requestsRes.data;

      if (!isFirstLoadRef.current) {
        const newNotifs: ToastNotif[] = [];
        newRequests.forEach((r) => {
          const prevStatus = prevStatusRef.current[r.id];
          if (prevStatus === "pending" && r.status !== "pending") {
            newNotifs.push({
              id: `${r.id}-${Date.now()}`,
              message:
                r.status === "approved"
                  ? `Request "${r.asset.name}" telah disetujui`
                  : `Request "${r.asset.name}" ditolak`,
              type: r.status as "approved" | "rejected",
            });
          }
        });

        if (newNotifs.length > 0) {
          setNotifications((prev) => [...prev, ...newNotifs]);
          newNotifs.forEach((n) => {
            setTimeout(() => dismissNotification(n.id), 6000);
          });
        }
      }

      const statusMap: Record<string, string> = {};
      newRequests.forEach((r) => {
        statusMap[r.id] = r.status;
      });
      prevStatusRef.current = statusMap;
      isFirstLoadRef.current = false;

      setAssets(assetsRes.data);
      setRequests(newRequests);
    } catch {
      setError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(userData);
    if (isAdmin(parsed.role)) {
      router.push("/dashboard");
      return;
    }

    setUser(parsed);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!assetId) {
      setError("Pilih aset dulu");
      return;
    }
    if (!quantity || Number(quantity) < 1) {
      setError("Jumlah minimal 1");
      return;
    }
    const chosenAsset = assets.find((a) => a.id === assetId);
    if (chosenAsset && Number(quantity) > chosenAsset.availableQuantity) {
      setError(
        `Jumlah melebihi stok tersedia (sisa ${chosenAsset.availableQuantity} unit)`
      );
      return;
    }
    if (!file) {
      setError("Dokumen surat jalan wajib diupload");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("assetId", assetId);
      formData.append("quantity", quantity);
      if (note) formData.append("note", note);
      formData.append("document", file);

      await axios.post(`${apiUrl}/requests`, formData, { headers });

      setAssetId("");
      setAssetSearch("");
      setQuantity("1");
      setNote("");
      setFile(null);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal membuat request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (assetIdToReturn: string, historyId: string) => {
    setError("");
    setActionLoading(true);
    try {
      await axios.post(
        `${apiUrl}/assets/${assetIdToReturn}/return`,
        { historyId },
        { headers }
      );
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal mengembalikan aset");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Memuat...</p>
      </div>
    );
  }

  const selectedAsset = assets.find((a) => a.id === assetId);
  const quantityNumber = Number(quantity);
  const quantityExceedsStock =
    !!selectedAsset && quantityNumber > selectedAsset.availableQuantity;

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const activeBorrows = requests.filter(
    (r) =>
      r.status === "approved" &&
      r.assignmentHistory &&
      !r.assignmentHistory.returnedAt
  );

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";
  const cardClass = "rounded-xl bg-white shadow-sm ring-1 ring-gray-200";

  return (
    <div>
      {/* Toast notifikasi status request */}
      {notifications.length > 0 && (
        <div className="fixed right-4 top-20 z-50 flex w-80 flex-col gap-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-lg border-l-4 bg-white p-3 shadow-lg ring-1 ring-gray-200 ${
                n.type === "approved" ? "border-green-500" : "border-red-500"
              }`}
            >
              {n.type === "approved" ? (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-green-600"
                />
              ) : (
                <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
              )}
              <p className="flex-1 text-sm text-gray-700">{n.message}</p>
              <button
                onClick={() => dismissNotification(n.id)}
                aria-label="Tutup notifikasi"
                className="shrink-0 rounded p-0.5 text-gray-400 transition hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}


      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Request Peminjaman Aset
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Ajukan peminjaman dan pantau status request kamu.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        {/* Form request */}
        <form onSubmit={handleSubmit} className={`${cardClass} mb-6 p-6`}>
          <div className="relative mb-4">
            <label className={labelClass}>Aset</label>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={assetSearch}
                onChange={(e) => {
                  setAssetSearch(e.target.value);
                  setAssetId("");
                  setIsAssetDropdownOpen(true);
                }}
                onFocus={() => setIsAssetDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setIsAssetDropdownOpen(false), 150);
                }}
                placeholder="Ketik nama aset untuk mencari..."
                autoComplete="off"
                className={`${inputClass} pl-9`}
              />
            </div>

            {isAssetDropdownOpen && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {filteredAssets.length === 0 && (
                  <p className="p-3 text-sm text-gray-400">
                    Aset tidak ditemukan
                  </p>
                )}
                {filteredAssets.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    disabled={a.availableQuantity <= 0}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setAssetId(a.id);
                      setAssetSearch(a.name);
                      setIsAssetDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition ${
                      a.availableQuantity <= 0
                        ? "cursor-not-allowed text-gray-300"
                        : "text-gray-800 hover:bg-blue-50"
                    }`}
                  >
                    <span className="truncate">{a.name}</span>
                    <span
                      className={`shrink-0 text-xs ${
                        a.availableQuantity <= 0
                          ? "text-gray-300"
                          : "text-gray-400"
                      }`}
                    >
                      sisa {a.availableQuantity}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className={labelClass}>Jumlah</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 ${
                quantityExceedsStock
                  ? "border-red-300 focus:ring-red-400/30"
                  : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              }`}
            />
            {selectedAsset && !quantityExceedsStock && (
              <p className="mt-1.5 text-xs text-gray-500">
                Sisa stok tersedia: {selectedAsset.availableQuantity} unit
              </p>
            )}
            {quantityExceedsStock && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                Jumlah melebihi stok tersedia (sisa{" "}
                {selectedAsset!.availableQuantity} unit)
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className={labelClass}>Catatan (opsional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: untuk keperluan presentasi client"
              className={inputClass}
            />
          </div>

          <div className="mb-6">
            <label className={labelClass}>Dokumen Surat Jalan</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                e.target.value = "";
              }}
              className="hidden"
            />

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  setFile(e.dataTransfer.files?.[0] || null);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
                  dragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <UploadCloud size={20} strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  Klik untuk upload atau tarik file ke sini
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Surat jalan dalam bentuk PDF atau foto
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <FileText size={20} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Hapus file"
                  title="Hapus file"
                  className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || quantityExceedsStock}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? "Mengirim..." : "Kirim Request"}
          </button>
        </form>

        {/* Sedang saya pinjam */}
        {activeBorrows.length > 0 && (
          <div className={`${cardClass} mb-6 p-6`}>
            <div className="mb-4 flex items-center gap-2">
              <ArrowRightLeft
                size={18}
                className="text-amber-500"
                strokeWidth={1.8}
              />
              <h3 className="font-semibold text-gray-900">
                Sedang Saya Pinjam
              </h3>
            </div>
            <div className="space-y-3">
              {activeBorrows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {r.asset.name} &middot; {r.quantity} unit
                    </p>
                    <p className="text-xs text-gray-500">
                      Disetujui:{" "}
                      {new Date(r.decidedAt || r.requestedAt).toLocaleDateString(
                        "id-ID"
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleReturn(r.asset.id, r.assignmentHistory!.id)
                    }
                    disabled={actionLoading}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Undo2 size={14} />
                    Kembalikan
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History request */}
        <div className={`${cardClass} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-gray-400" strokeWidth={1.8} />
              <h3 className="font-semibold text-gray-900">History Request</h3>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {requests.length}
            </span>
          </div>

          {requests.length === 0 && (
            <div className="py-8 text-center">
              <Inbox size={34} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Belum ada request.</p>
            </div>
          )}

          {requests.length > 0 && (
            <div className="space-y-3">
              {requests.map((r) => {
                const returned =
                  r.status === "approved" && !!r.assignmentHistory?.returnedAt;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {r.asset.name} &middot; {r.quantity} unit
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.requestedAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {r.note ? ` · ${r.note}` : ""}
                      </p>
                      <a
                        href={`${apiUrl}/uploads/${r.documentPath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                      >
                        <FileText size={12} />
                        Lihat dokumen
                      </a>
                    </div>
                    <Pill tone={returned ? "green" : statusTone(r.status)}>
                      {returned ? "Sudah Dikembalikan" : statusLabel(r.status)}
                    </Pill>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
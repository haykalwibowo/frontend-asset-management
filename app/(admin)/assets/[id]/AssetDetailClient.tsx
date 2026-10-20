"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface Asset {
  id: string;
  name: string;
  serialNumber: string | null;
  value: number | null;
  categoryId: string;
  locationId: string | null;
  quantity: number;
  availableQuantity: number;
}

interface Category {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  department: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface HistoryItem {
  id: string;
  quantity: number;
  assignedAt: string;
  returnedAt: string | null;
  note: string | null;
  employee: Employee;
}

interface AssetUnit {
  id: string;
  idNumber: string;
  status: string;
  condition?: string | null;
  conditionNote?: string | null;
  currentAssignmentHistoryId?: string | null;
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isDamaged = (u: AssetUnit) => u.condition === "damaged";

export default function AssetDetailClient({ assetId }: { assetId: string }) {
  const router = useRouter();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<AssetUnit[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  const [editingStock, setEditingStock] = useState(false);
  const [stockValue, setStockValue] = useState("");
  const [stockSaving, setStockSaving] = useState(false);

  // modal detail unit
  const [selectedUnit, setSelectedUnit] = useState<AssetUnit | null>(null);
  const [conditionEdit, setConditionEdit] = useState("good");
  const [conditionNoteEdit, setConditionNoteEdit] = useState("");
  const [conditionSaving, setConditionSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = { Authorization: `Bearer ${token}` };
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const loadData = async () => {
    try {
      const [
        assetRes,
        historyRes,
        employeesRes,
        locationsRes,
        unitsRes,
        categoriesRes,
      ] = await Promise.all([
        axios.get(`${apiUrl}/assets/${assetId}`, { headers }),
        axios.get(`${apiUrl}/assets/${assetId}/history`, { headers }),
        axios.get(`${apiUrl}/employees`, { headers }),
        axios.get(`${apiUrl}/locations`, { headers }),
        axios.get(`${apiUrl}/assets/${assetId}/units`, { headers }),
        axios.get(`${apiUrl}/categories`, { headers }),
      ]);
      setAsset(assetRes.data);
      setHistory(historyRes.data);
      setEmployees(employeesRes.data);
      setLocations(locationsRes.data);
      setUnits(unitsRes.data);
      setCategories(categoriesRes.data);
    } catch {
      setError("Gagal memuat data aset");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  // tutup modal dengan tombol Escape
  useEffect(() => {
    if (!selectedUnit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedUnit(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedUnit]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!employeeId) {
      setError("Pilih karyawan dulu");
      return;
    }
    if (!quantity || Number(quantity) < 1) {
      setError("Jumlah minimal 1");
      return;
    }

    setActionLoading(true);
    try {
      await axios.post(
        `${apiUrl}/assets/${assetId}/assign`,
        { employeeId, quantity: Number(quantity), note: note || undefined },
        { headers }
      );
      setEmployeeId("");
      setQuantity("1");
      setNote("");
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal assign aset");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (historyId: string) => {
    setError("");
    setActionLoading(true);
    try {
      await axios.post(
        `${apiUrl}/assets/${assetId}/return`,
        { historyId },
        { headers }
      );
      await loadData();
    } catch {
      setError("Gagal mengembalikan aset");
    } finally {
      setActionLoading(false);
    }
  };

  const startEditStock = () => {
    if (!asset) return;
    setEditingStock(true);
    setStockValue(String(asset.quantity));
    setError("");
  };

  const cancelEditStock = () => {
    setEditingStock(false);
    setStockValue("");
  };

  const saveStock = async () => {
    setError("");

    if (!stockValue || Number(stockValue) < 0) {
      setError("Jumlah tidak valid");
      return;
    }

    setStockSaving(true);
    try {
      await axios.put(
        `${apiUrl}/assets/${assetId}`,
        { quantity: Number(stockValue) },
        { headers }
      );
      setEditingStock(false);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal menyimpan jumlah");
    } finally {
      setStockSaving(false);
    }
  };

  const openUnit = (u: AssetUnit) => {
    setSelectedUnit(u);
    setConditionEdit(u.condition === "damaged" ? "damaged" : "good");
    setConditionNoteEdit(u.conditionNote || "");
    setModalError("");
  };

  const saveCondition = async () => {
    if (!selectedUnit) return;
    setModalError("");
    setConditionSaving(true);
    try {
      await axios.put(
        `${apiUrl}/units/${selectedUnit.id}/condition`,
        { condition: conditionEdit, conditionNote: conditionNoteEdit },
        { headers }
      );
      // muat ulang supaya badge stok ikut ter-update
      await loadData();
      setSelectedUnit(null);
    } catch (err: any) {
      setModalError(
        err?.response?.data?.message || "Gagal menyimpan kondisi unit"
      );
    } finally {
      setConditionSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Aset tidak ditemukan.</p>
      </div>
    );
  }

  const location = locations.find((l) => l.id === asset.locationId);
  const categoryName =
    categories.find((c) => c.id === asset.categoryId)?.name || "-";
  const activeBorrowers = history.filter((h) => !h.returnedAt);
  const pastHistory = history.filter((h) => h.returnedAt);

  const borrowerOfUnit = (u: AssetUnit) =>
    u.currentAssignmentHistoryId
      ? history.find((h) => h.id === u.currentAssignmentHistoryId)
      : undefined;

  const damagedCount = units.filter(isDamaged).length;

  return (
    <div>
      <main className="mx-auto max-w-3xl p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-2xl font-bold text-gray-800">{asset.name}</h2>

            {!editingStock ? (
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    asset.availableQuantity > 0
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  Stok: {asset.availableQuantity} / {asset.quantity}
                </span>
                <button
                  onClick={startEditStock}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={saveStock}
                  disabled={stockSaving}
                  className="text-xs font-medium text-green-600 hover:underline disabled:opacity-50"
                >
                  {stockSaving ? "..." : "Simpan"}
                </button>
                <button
                  onClick={cancelEditStock}
                  className="text-xs font-medium text-gray-500 hover:underline"
                >
                  Batal
                </button>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Serial Number
              </dt>
              <dd className="text-sm text-gray-700">
                {asset.serialNumber || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Value
              </dt>
              <dd className="text-sm text-gray-700">
                {asset.value ? `Rp ${asset.value.toLocaleString("id-ID")}` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">
                Location
              </dt>
              <dd className="text-sm text-gray-700">
                {location ? location.name : "-"}
              </dd>
            </div>
          </dl>

          {damagedCount > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
              {damagedCount} unit sedang rusak, jadi tidak dihitung di stok
              tersedia. Stok tersedia {asset.availableQuantity} dari{" "}
              {asset.quantity} unit.
            </div>
          )}
        </div>

        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Daftar Unit</h3>
            {damagedCount > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                {damagedCount} unit rusak
              </span>
            )}
          </div>

          {units.length === 0 && (
            <p className="text-sm text-gray-500">Belum ada unit tercatat.</p>
          )}

          {units.length > 0 && (
            <>
              <p className="mb-3 text-xs text-gray-400">
                Klik unit untuk melihat detail dan kondisinya.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {units.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => openUnit(u)}
                    className={`flex flex-col items-start gap-1.5 rounded-lg border px-3 py-2 text-left transition hover:shadow-sm ${
                      isDamaged(u)
                        ? "border-red-200 bg-red-50/40 hover:border-red-300"
                        : "border-gray-100 hover:border-blue-200 hover:bg-blue-50/30"
                    }`}
                  >
                    <span className="break-all text-sm font-medium text-gray-700">
                      {u.idNumber}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {isDamaged(u) && u.status === "available" ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Sedang rusak
                        </span>
                      ) : (
                        <>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.status === "available"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {u.status === "available" ? "Tersedia" : "Dipinjam"}
                          </span>
                          {isDamaged(u) && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              Rusak
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    {isDamaged(u) && u.conditionNote && (
                      <span className="text-xs text-red-600">
                        {u.conditionNote}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {asset.availableQuantity > 0 ? (
          <form
            onSubmit={handleAssign}
            className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
          >
            <h3 className="mb-4 text-lg font-bold text-gray-800">
              Assign Aset
            </h3>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Karyawan
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Karyawan --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.department ? `(${emp.department})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Jumlah (sisa stok: {asset.availableQuantity})
              </label>
              <input
                type="number"
                min={1}
                max={asset.availableQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Catatan (opsional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? "Memproses..." : "Assign Aset"}
            </button>
          </form>
        ) : (
          <div className="mb-6 rounded-xl bg-red-50 p-6 text-sm text-red-700 ring-1 ring-red-100">
            Stok habis: semua unit sedang dipinjam atau rusak.
          </div>
        )}

        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 text-lg font-bold text-gray-800">
            Sedang Dipinjam
          </h3>

          {activeBorrowers.length === 0 && (
            <p className="text-sm text-gray-500">
              Tidak ada yang sedang meminjam aset ini.
            </p>
          )}

          {activeBorrowers.length > 0 && (
            <div className="space-y-3">
              {activeBorrowers.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {h.employee.name}{" "}
                      <span className="font-normal text-gray-400">
                        ({h.employee.department || "-"})
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Jumlah: {h.quantity} &middot; Dipinjam:{" "}
                      {formatDateTime(h.assignedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReturn(h.id)}
                    disabled={actionLoading}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Kembalikan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 text-lg font-bold text-gray-800">
            History Peminjaman
          </h3>

          {pastHistory.length === 0 && (
            <p className="text-sm text-gray-500">Belum ada history.</p>
          )}

          {pastHistory.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="py-2">Karyawan</th>
                  <th className="py-2">Divisi</th>
                  <th className="py-2">Jumlah</th>
                  <th className="py-2">Dipinjam</th>
                  <th className="py-2">Dikembalikan</th>
                </tr>
              </thead>
              <tbody>
                {pastHistory.map((h) => (
                  <tr key={h.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-800">{h.employee.name}</td>
                    <td className="py-2 text-gray-500">
                      {h.employee.department || "-"}
                    </td>
                    <td className="py-2 text-gray-500">{h.quantity}</td>
                    <td className="py-2 text-gray-500">
                      {formatDateTime(h.assignedAt)}
                    </td>
                    <td className="py-2 text-gray-500">
                      {h.returnedAt ? formatDateTime(h.returnedAt) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ===== Modal Detail Unit ===== */}
      {selectedUnit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedUnit(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Detail Unit
                </p>
                <h3 className="break-all text-lg font-bold text-gray-800">
                  {selectedUnit.idNumber}
                </h3>
                <p className="text-sm text-gray-500">{categoryName}</p>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="text-2xl leading-none text-gray-400 hover:text-gray-600"
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
                {modalError}
              </div>
            )}

            <dl className="mb-4 space-y-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">
                  Status
                </dt>
                <dd className="mt-1">
                  {isDamaged(selectedUnit) &&
                  selectedUnit.status === "available" ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                      Sedang rusak (tidak bisa dipinjam)
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        selectedUnit.status === "available"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {selectedUnit.status === "available"
                        ? "Tersedia"
                        : "Dipinjam"}
                    </span>
                  )}
                </dd>
              </div>

              {selectedUnit.status !== "available" &&
                borrowerOfUnit(selectedUnit) && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-400">
                      Dipinjam oleh
                    </dt>
                    <dd className="text-sm text-gray-700">
                      {borrowerOfUnit(selectedUnit)!.employee.name}
                      <span className="text-gray-400">
                        {" "}
                        &middot;{" "}
                        {formatDateTime(borrowerOfUnit(selectedUnit)!.assignedAt)}
                      </span>
                    </dd>
                  </div>
                )}
            </dl>

            <div className="mb-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                Kondisi Barang
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConditionEdit("good")}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    conditionEdit === "good"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Baik
                </button>
                <button
                  type="button"
                  onClick={() => setConditionEdit("damaged")}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    conditionEdit === "damaged"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Rusak
                </button>
              </div>
              {conditionEdit === "damaged" && (
                <p className="mt-2 text-xs text-amber-700">
                  Unit rusak tidak dihitung di stok tersedia dan tidak akan
                  dipilih saat aset di-assign atau request disetujui.
                </p>
              )}
            </div>

            <div className="mb-5">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Catatan kondisi (opsional)
              </label>
              <textarea
                value={conditionNoteEdit}
                onChange={(e) => setConditionNoteEdit(e.target.value)}
                rows={3}
                placeholder="Contoh: layar retak, tinta bocor"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedUnit(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Tutup
              </button>
              <button
                onClick={saveCondition}
                disabled={conditionSaving}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {conditionSaving ? "Menyimpan..." : "Simpan Kondisi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
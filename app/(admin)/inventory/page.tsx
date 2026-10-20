"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Search,
  FileSpreadsheet,
  X,
  PackageSearch,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AssetUnitRow {
  id: string;
  idNumber: string;
  status: string; // "available" | "borrowed"
  condition: string; // "good" | "damaged"
  conditionNote?: string | null;
  damageLevel?: string | null; // "ringan" | "sedang" | "berat"
  urgency?: string | null; // "rendah" | "menengah" | "tinggi" | "darurat"
  asset: {
    id: string;
    name: string;
    value?: number | null;
    purchaseDate?: string | null;
    category?: { name: string } | null;
    location?: { name: string } | null;
  };
}

const PAGE_SIZE = 10;

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

const cap = (s?: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "-";

const urgencyBadge = (u?: string | null) => {
  if (u === "darurat") return "bg-red-600 text-white";
  if (u === "tinggi") return "bg-orange-100 text-orange-700";
  if (u === "menengah") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function StatusBadge({ status }: { status: string }) {
  const available = status === "available";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        available
          ? "bg-green-50 text-green-700 ring-green-600/20"
          : "bg-amber-50 text-amber-700 ring-amber-600/20"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          available ? "bg-green-500" : "bg-amber-500"
        }`}
      />
      {available ? "Tersedia" : "Dipinjam"}
    </span>
  );
}

export default function InventoryPage() {
  const [units, setUnits] = useState<AssetUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");

  const [page, setPage] = useState(1);

  const [selectedUnit, setSelectedUnit] = useState<AssetUnitRow | null>(null);
  const [editIdNumber, setEditIdNumber] = useState("");
  const [editCondition, setEditCondition] = useState("good");
  const [editDamageLevel, setEditDamageLevel] = useState("");
  const [editUrgency, setEditUrgency] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [exporting, setExporting] = useState(false);

  async function loadUnits() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/asset-units`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnits(res.data);
      setError("");
    } catch (e) {
      console.error(e);
      setError("Gagal memuat data inventaris");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUnits();
  }, []);

  // kembali ke halaman 1 setiap filter berubah
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, locationFilter, statusFilter, conditionFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.asset.category?.name) set.add(u.asset.category.name);
    });
    return Array.from(set).sort();
  }, [units]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.asset.location?.name) set.add(u.asset.location.name);
    });
    return Array.from(set).sort();
  }, [units]);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchSearch =
        search.trim() === "" ||
        u.idNumber.toLowerCase().includes(search.toLowerCase()) ||
        u.asset.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === "" || u.asset.category?.name === categoryFilter;
      const matchLocation =
        locationFilter === "" || u.asset.location?.name === locationFilter;
      const matchStatus = statusFilter === "" || u.status === statusFilter;
      const matchCondition =
        conditionFilter === "" || u.condition === conditionFilter;
      return (
        matchSearch &&
        matchCategory &&
        matchLocation &&
        matchStatus &&
        matchCondition
      );
    });
  }, [units, search, categoryFilter, locationFilter, statusFilter, conditionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUnits = filteredUnits.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function openModal(unit: AssetUnitRow) {
    setSelectedUnit(unit);
    setEditIdNumber(unit.idNumber);
    setEditCondition(unit.condition);
    setEditDamageLevel(unit.damageLevel || "");
    setEditUrgency(unit.urgency || "");
    setEditNote(unit.conditionNote || "");
    setSaveError("");
  }

  function closeModal() {
    setSelectedUnit(null);
    setSaveError("");
  }

  async function handleSave() {
    if (!selectedUnit) return;
    setSaveError("");

    if (editCondition === "damaged") {
      if (!editDamageLevel) {
        setSaveError("Pilih jenis kerusakan dulu");
        return;
      }
      if (!editUrgency) {
        setSaveError("Pilih urgensi dulu");
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editIdNumber.trim() !== selectedUnit.idNumber) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/units/${selectedUnit.id}/id-number`,
          { idNumber: editIdNumber.trim() },
          { headers }
        );
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/units/${selectedUnit.id}/condition`,
        {
          condition: editCondition,
          conditionNote: editNote,
          damageLevel: editCondition === "damaged" ? editDamageLevel : null,
          urgency: editCondition === "damaged" ? editUrgency : null,
        },
        { headers }
      );

      await loadUnits();
      closeModal();
    } catch (e: any) {
      console.error(e);
      setSaveError(e?.response?.data?.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  // export mengambil SEMUA hasil filter, bukan hanya halaman yang tampil
  async function handleExport() {
    if (filteredUnits.length === 0) return;
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Inventaris");

      sheet.columns = [
        { header: "ID Number", key: "idNumber", width: 24 },
        { header: "Nama Aset", key: "name", width: 28 },
        { header: "Kategori", key: "category", width: 16 },
        { header: "Lokasi", key: "location", width: 16 },
        { header: "Status", key: "status", width: 12 },
        { header: "Kondisi", key: "condition", width: 12 },
        { header: "Jenis Kerusakan", key: "damageLevel", width: 16 },
        { header: "Urgensi", key: "urgency", width: 12 },
        { header: "Catatan Kondisi", key: "note", width: 32 },
        { header: "Harga per Unit (Rp)", key: "value", width: 20 },
        { header: "Tanggal Pembelian", key: "purchaseDate", width: 18 },
      ];

      filteredUnits.forEach((u) => {
        sheet.addRow({
          idNumber: u.idNumber,
          name: u.asset.name,
          category: u.asset.category?.name || "-",
          location: u.asset.location?.name || "-",
          status: u.status === "available" ? "Tersedia" : "Dipinjam",
          condition: u.condition === "damaged" ? "Rusak" : "Baik",
          damageLevel: u.condition === "damaged" ? cap(u.damageLevel) : "",
          urgency: u.condition === "damaged" ? cap(u.urgency) : "",
          note: u.conditionNote || "",
          value: u.asset.value ?? null,
          purchaseDate: u.asset.purchaseDate
            ? new Date(u.asset.purchaseDate).toLocaleDateString("id-ID")
            : "",
        });
      });

      // gaya header: biru + teks putih tebal
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1D4ED8" },
        };
        cell.alignment = { vertical: "middle" };
      });
      headerRow.height = 22;

      // format angka harga: 3.500.000
      sheet.getColumn("value").numFmt = "#,##0";

      // freeze baris header
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `inventaris-${today}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Gagal export Excel");
    } finally {
      setExporting(false);
    }
  }

  const thClass = "px-5 py-3.5 text-left";

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Inventaris
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Daftar seluruh unit barang dari semua aset
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || filteredUnits.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={16} />
          )}
          {exporting ? "Menyiapkan..." : `Export Excel (${filteredUnits.length})`}
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Cari ID / nama aset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Semua Lokasi</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Semua Status</option>
          <option value="available">Tersedia</option>
          <option value="borrowed">Dipinjam</option>
        </select>
        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Semua Kondisi</option>
          <option value="good">Baik</option>
          <option value="damaged">Rusak</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className={thClass}>ID Number</th>
                <th className={thClass}>Nama Aset</th>
                <th className={thClass}>Kategori</th>
                <th className={thClass}>Lokasi</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Kondisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-gray-400"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <PackageSearch
                      size={36}
                      className="mx-auto text-gray-300"
                    />
                    <p className="mt-3 text-sm text-gray-500">
                      Tidak ada unit yang cocok
                    </p>
                  </td>
                </tr>
              ) : (
                pagedUnits.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => openModal(u)}
                    className="cursor-pointer transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-medium text-gray-700">
                      {u.idNumber}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">
                      {u.asset.name}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {u.asset.category?.name || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {u.asset.location?.name || "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          u.condition === "damaged"
                            ? "bg-red-50 text-red-700 ring-red-600/20"
                            : "bg-gray-50 text-gray-600 ring-gray-500/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.condition === "damaged"
                              ? "bg-red-500"
                              : "bg-gray-400"
                          }`}
                        />
                        {u.condition === "damaged" ? "Rusak" : "Baik"}
                      </span>
                      {u.condition === "damaged" &&
                        (u.damageLevel || u.urgency) && (
                          <p className="mt-1 text-xs text-gray-500">
                            {cap(u.damageLevel)}
                            {u.urgency && (
                              <>
                                {" "}
                                &middot;{" "}
                                <span
                                  className={`rounded-full px-1.5 py-0.5 font-medium ${urgencyBadge(
                                    u.urgency
                                  )}`}
                                >
                                  {cap(u.urgency)}
                                </span>
                              </>
                            )}
                          </p>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredUnits.length > 0 && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/50 px-5 py-3">
            <p className="text-sm text-gray-500">
              Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, filteredUnits.length)} dari{" "}
              {filteredUnits.length} unit
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              {pageNumbers(currentPage, totalPages).map((p, i) =>
                p === "..." ? (
                  <span
                    key={`dots-${i}`}
                    className="px-2 text-sm text-gray-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] rounded-md px-2.5 py-1.5 text-sm transition ${
                      p === currentPage
                        ? "bg-blue-600 font-semibold text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detail unit */}
      {selectedUnit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Inventaris
                </p>
                <h2 className="text-lg font-bold text-gray-900">Detail Unit</h2>
              </div>
              <button
                onClick={closeModal}
                aria-label="Tutup"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  ID Number
                </label>
                <input
                  type="text"
                  value={editIdNumber}
                  onChange={(e) => setEditIdNumber(e.target.value)}
                  className={`${inputClass} font-medium text-gray-800`}
                />
              </div>

              <dl className="divide-y divide-gray-100 rounded-lg bg-gray-50 px-4 ring-1 ring-gray-100">
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500">Nama Aset</dt>
                  <dd className="font-medium text-gray-900">
                    {selectedUnit.asset.name}
                  </dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500">Kategori</dt>
                  <dd className="text-gray-700">
                    {selectedUnit.asset.category?.name || "-"}
                  </dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-gray-500">Lokasi</dt>
                  <dd className="text-gray-700">
                    {selectedUnit.asset.location?.name || "-"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    <StatusBadge status={selectedUnit.status} />
                  </dd>
                </div>
              </dl>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Kondisi
                </label>
                <select
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    editCondition === "damaged"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  <option value="good">Baik</option>
                  <option value="damaged">Rusak</option>
                </select>
              </div>

              {editCondition === "damaged" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Jenis Kerusakan
                    </label>
                    <select
                      value={editDamageLevel}
                      onChange={(e) => setEditDamageLevel(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">-- Pilih Jenis Kerusakan --</option>
                      <option value="ringan">Ringan</option>
                      <option value="sedang">Sedang</option>
                      <option value="berat">Berat</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Urgensi
                    </label>
                    <select
                      value={editUrgency}
                      onChange={(e) => setEditUrgency(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">-- Pilih Urgensi --</option>
                      <option value="rendah">Rendah</option>
                      <option value="menengah">Menengah</option>
                      <option value="tinggi">Tinggi</option>
                      <option value="darurat">Darurat</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Catatan Kondisi (opsional)
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                  placeholder="Contoh: layar retak di pojok kanan"
                  className={inputClass}
                />
              </div>

              {saveError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/50 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
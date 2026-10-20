"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  X,
  Pencil,
  Check,
  AlertTriangle,
  FileText,
  Undo2,
  Box,
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type?: string | null;
  value: number | null;
  categoryId: string;
  locationId: string | null;
  quantity: number;
  availableQuantity: number;
  invoiceNumber?: string | null;
  vendorName?: string | null;
  invoicePath?: string | null;
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
  damageLevel?: string | null;
  urgency?: string | null;
  currentAssignmentHistoryId?: string | null;
}

type TabKey = "detail" | "units" | "assign" | "borrowed" | "history";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isDamaged = (u: AssetUnit) => u.condition === "damaged";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";

const cardClass = "rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200";

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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[0]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles[1]}`} />
      {children}
    </span>
  );
}

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-800">{children}</dd>
    </div>
  );
}

export default function AssetDetailDrawer({
  assetId,
  onClose,
  onChanged,
}: {
  assetId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  // animasi slide dari kanan
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<TabKey>("detail");

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

  // edit info aset (nama, kategori, lokasi)
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoName, setInfoName] = useState("");
  const [infoCategoryId, setInfoCategoryId] = useState("");
  const [infoLocationId, setInfoLocationId] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);

  // modal kondisi unit
  const [selectedUnit, setSelectedUnit] = useState<AssetUnit | null>(null);
  const [conditionEdit, setConditionEdit] = useState("good");
  const [damageLevelEdit, setDamageLevelEdit] = useState("");
  const [urgencyEdit, setUrgencyEdit] = useState("");
  const [conditionNoteEdit, setConditionNoteEdit] = useState("");
  const [conditionSaving, setConditionSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  // jalankan animasi masuk
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  // Escape: tutup modal unit dulu, kalau tidak ada baru tutup panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedUnit) setSelectedUnit(null);
      else handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit]);

  const refreshAll = async () => {
    await loadData();
    onChanged();
  };

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
      await refreshAll();
      setTab("borrowed");
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
      await refreshAll();
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
      await refreshAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal menyimpan jumlah");
    } finally {
      setStockSaving(false);
    }
  };

  const startEditInfo = () => {
    if (!asset) return;
    setInfoName(asset.name);
    setInfoCategoryId(asset.categoryId);
    setInfoLocationId(asset.locationId || "");
    setEditingInfo(true);
    setError("");
  };

  const cancelEditInfo = () => {
    setEditingInfo(false);
  };

  const saveInfo = async () => {
    setError("");
    if (!infoName.trim()) {
      setError("Nama aset tidak boleh kosong");
      return;
    }
    if (!infoCategoryId) {
      setError("Pilih kategori dulu");
      return;
    }
    setInfoSaving(true);
    try {
      await axios.put(
        `${apiUrl}/assets/${assetId}`,
        {
          name: infoName.trim(),
          categoryId: infoCategoryId,
          locationId: infoLocationId || null,
        },
        { headers }
      );
      setEditingInfo(false);
      await refreshAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal menyimpan info aset");
    } finally {
      setInfoSaving(false);
    }
  };

  const openUnit = (u: AssetUnit) => {
    setSelectedUnit(u);
    setConditionEdit(u.condition === "damaged" ? "damaged" : "good");
    setDamageLevelEdit(u.damageLevel || "");
    setUrgencyEdit(u.urgency || "");
    setConditionNoteEdit(u.conditionNote || "");
    setModalError("");
  };

  const saveCondition = async () => {
    if (!selectedUnit) return;
    setModalError("");

    if (conditionEdit === "damaged") {
      if (!damageLevelEdit) {
        setModalError("Pilih jenis kerusakan dulu");
        return;
      }
      if (!urgencyEdit) {
        setModalError("Pilih urgensi dulu");
        return;
      }
    }

    setConditionSaving(true);
    try {
      await axios.put(
        `${apiUrl}/units/${selectedUnit.id}/condition`,
        {
          condition: conditionEdit,
          conditionNote: conditionNoteEdit,
          damageLevel: conditionEdit === "damaged" ? damageLevelEdit : null,
          urgency: conditionEdit === "damaged" ? urgencyEdit : null,
        },
        { headers }
      );
      await refreshAll();
      setSelectedUnit(null);
    } catch (err: any) {
      setModalError(
        err?.response?.data?.message || "Gagal menyimpan kondisi unit"
      );
    } finally {
      setConditionSaving(false);
    }
  };

  const location = asset
    ? locations.find((l) => l.id === asset.locationId)
    : undefined;
  const categoryName =
    categories.find((c) => c.id === asset?.categoryId)?.name || "-";
  const activeBorrowers = history.filter((h) => !h.returnedAt);
  const pastHistory = history.filter((h) => h.returnedAt);
  const damagedCount = units.filter(isDamaged).length;

  const borrowerOfUnit = (u: AssetUnit) =>
    u.currentAssignmentHistoryId
      ? history.find((h) => h.id === u.currentAssignmentHistoryId)
      : undefined;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "detail", label: "Detail Aset" },
    { key: "units", label: "Daftar Unit" },
    { key: "assign", label: "Assign Aset" },
    { key: "borrowed", label: "Sedang Dipinjam", count: activeBorrowers.length },
    { key: "history", label: "History" },
  ];

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay gelap */}
      <div
        className={`absolute inset-0 bg-gray-900/40 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* panel dari kanan */}
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Detail Aset
            </p>
            <h2 className="truncate text-xl font-bold text-gray-900">
              {asset ? asset.name : "Memuat..."}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* tab */}
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-gray-200 px-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === t.key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.count ? (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* isi */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {loading && <p className="text-sm text-gray-500">Memuat...</p>}

          {!loading && !asset && (
            <p className="text-sm text-gray-500">Aset tidak ditemukan.</p>
          )}

          {!loading && asset && (
            <>
              {/* ===== TAB: Detail Aset ===== */}
              {tab === "detail" && (
                <div className={cardClass}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">
                      Informasi Aset
                    </h3>

                    {!editingStock ? (
                      <div className="flex items-center gap-2">
                        <Pill
                          tone={asset.availableQuantity > 0 ? "green" : "red"}
                        >
                          Stok: {asset.availableQuantity} / {asset.quantity}
                        </Pill>
                        <button
                          onClick={startEditStock}
                          title="Edit stok"
                          aria-label="Edit stok"
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={stockValue}
                          onChange={(e) => setStockValue(e.target.value)}
                          className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          onClick={saveStock}
                          disabled={stockSaving}
                          title="Simpan"
                          aria-label="Simpan"
                          className="rounded-lg p-1.5 text-green-600 transition hover:bg-green-50 disabled:opacity-50"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={cancelEditStock}
                          title="Batal"
                          aria-label="Batal"
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {!editingInfo ? (
                    <>
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                        <InfoItem label="Kategori">{categoryName}</InfoItem>
                        <InfoItem label="Jenis">{asset.type || "-"}</InfoItem>
                        <InfoItem label="Lokasi">
                          {location ? location.name : "-"}
                        </InfoItem>
                        <InfoItem label="Value">
                          {asset.value
                            ? `Rp ${asset.value.toLocaleString("id-ID")}`
                            : "-"}
                        </InfoItem>
                        <InfoItem label="Nomor Invoice">
                          {asset.invoiceNumber || "-"}
                        </InfoItem>
                        <InfoItem label="Vendor">
                          {asset.vendorName || "-"}
                        </InfoItem>
                        <InfoItem label="Nota / Invoice">
                          {asset.invoicePath ? (
                            <a
                              href={`${apiUrl}/uploads/${asset.invoicePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline"
                            >
                              <FileText size={14} />
                              Lihat nota
                            </a>
                          ) : (
                            "-"
                          )}
                        </InfoItem>
                      </dl>

                      <button
                        onClick={startEditInfo}
                        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
                      >
                        <Pencil size={14} />
                        Edit Info Aset
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className={labelClass}>Nama Aset</label>
                        <input
                          type="text"
                          value={infoName}
                          onChange={(e) => setInfoName(e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Kategori</label>
                        <select
                          value={infoCategoryId}
                          onChange={(e) => setInfoCategoryId(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">-- Pilih Kategori --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Lokasi</label>
                        <select
                          value={infoLocationId}
                          onChange={(e) => setInfoLocationId(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">-- Pilih Lokasi --</option>
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={cancelEditInfo}
                          className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
                        >
                          Batal
                        </button>
                        <button
                          onClick={saveInfo}
                          disabled={infoSaving}
                          className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {infoSaving ? "Menyimpan..." : "Simpan"}
                        </button>
                      </div>
                    </div>
                  )}

                  {damagedCount > 0 && (
                    <div className="mt-5 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>
                        {damagedCount} unit sedang rusak, jadi tidak dihitung di
                        stok tersedia. Stok tersedia {asset.availableQuantity}{" "}
                        dari {asset.quantity} unit.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ===== TAB: Daftar Unit ===== */}
              {tab === "units" && (
                <div className={cardClass}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">
                      Daftar Unit
                    </h3>
                    {damagedCount > 0 && (
                      <Pill tone="red">{damagedCount} unit rusak</Pill>
                    )}
                  </div>

                  {units.length === 0 && (
                    <div className="py-8 text-center">
                      <Box size={32} className="mx-auto text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">
                        Belum ada unit tercatat.
                      </p>
                    </div>
                  )}

                  {units.length > 0 && (
                    <>
                      <p className="mb-3 text-xs text-gray-400">
                        Klik unit untuk melihat detail dan kondisinya.
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {units.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => openUnit(u)}
                            className={`flex flex-col items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition hover:shadow-sm ${
                              isDamaged(u)
                                ? "border-red-200 bg-red-50/40 hover:border-red-300"
                                : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                            }`}
                          >
                            <span className="break-all font-mono text-xs font-medium text-gray-700">
                              {u.idNumber}
                            </span>
                            <span className="flex flex-wrap gap-1">
                              {isDamaged(u) && u.status === "available" ? (
                                <Pill tone="red">Sedang rusak</Pill>
                              ) : (
                                <>
                                  <Pill
                                    tone={
                                      u.status === "available"
                                        ? "green"
                                        : "amber"
                                    }
                                  >
                                    {u.status === "available"
                                      ? "Tersedia"
                                      : "Dipinjam"}
                                  </Pill>
                                  {isDamaged(u) && (
                                    <Pill tone="red">Rusak</Pill>
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
              )}

              {/* ===== TAB: Assign Aset ===== */}
              {tab === "assign" &&
                (asset.availableQuantity > 0 ? (
                  <form onSubmit={handleAssign} className={cardClass}>
                    <h3 className="mb-5 text-lg font-bold text-gray-900">
                      Assign Aset
                    </h3>

                    <div className="mb-4">
                      <label className={labelClass}>Karyawan</label>
                      <select
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        required
                        className={inputClass}
                      >
                        <option value="">-- Pilih Karyawan --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}{" "}
                            {emp.department ? `(${emp.department})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className={labelClass}>
                        Jumlah (sisa stok: {asset.availableQuantity})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={asset.availableQuantity}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        className={inputClass}
                      />
                    </div>

                    <div className="mb-5">
                      <label className={labelClass}>Catatan (opsional)</label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading ? "Memproses..." : "Assign Aset"}
                    </button>
                  </form>
                ) : (
                  <div className="flex gap-2 rounded-xl bg-red-50 p-5 text-sm text-red-700 ring-1 ring-red-100">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    Stok habis: semua unit sedang dipinjam atau rusak.
                  </div>
                ))}

              {/* ===== TAB: Sedang Dipinjam ===== */}
              {tab === "borrowed" && (
                <div className={cardClass}>
                  <h3 className="mb-4 text-lg font-bold text-gray-900">
                    Sedang Dipinjam
                  </h3>

                  {activeBorrowers.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-500">
                      Tidak ada yang sedang meminjam aset ini.
                    </p>
                  )}

                  {activeBorrowers.length > 0 && (
                    <div className="space-y-3">
                      {activeBorrowers.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-semibold text-amber-700">
                              {getInitials(h.employee.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {h.employee.name}{" "}
                                <span className="font-normal text-gray-400">
                                  ({h.employee.department || "-"})
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">
                                {h.quantity} unit &middot; Dipinjam{" "}
                                {formatDateTime(h.assignedAt)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleReturn(h.id)}
                            disabled={actionLoading}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <Undo2 size={14} />
                            Kembalikan
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ===== TAB: History Peminjaman ===== */}
              {tab === "history" && (
                <div className={cardClass}>
                  <h3 className="mb-4 text-lg font-bold text-gray-900">
                    History Peminjaman
                  </h3>

                  {pastHistory.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-500">
                      Belum ada history.
                    </p>
                  )}

                  {pastHistory.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          <tr>
                            <th className="py-2.5 pr-3">Karyawan</th>
                            <th className="py-2.5 pr-3">Divisi</th>
                            <th className="py-2.5 pr-3">Jumlah</th>
                            <th className="py-2.5 pr-3">Dipinjam</th>
                            <th className="py-2.5">Dikembalikan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pastHistory.map((h) => (
                            <tr key={h.id}>
                              <td className="py-2.5 pr-3 font-medium text-gray-900">
                                {h.employee.name}
                              </td>
                              <td className="py-2.5 pr-3 text-gray-500">
                                {h.employee.department || "-"}
                              </td>
                              <td className="py-2.5 pr-3 text-gray-500">
                                {h.quantity}
                              </td>
                              <td className="py-2.5 pr-3 text-gray-500">
                                {formatDateTime(h.assignedAt)}
                              </td>
                              <td className="py-2.5 text-gray-500">
                                {h.returnedAt
                                  ? formatDateTime(h.returnedAt)
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ===== Modal Kondisi Unit (di atas panel) ===== */}
      {selectedUnit && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={() => setSelectedUnit(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Detail Unit
                </p>
                <h3 className="break-all font-mono text-base font-bold text-gray-900">
                  {selectedUnit.idNumber}
                </h3>
                <p className="text-sm text-gray-500">{categoryName}</p>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {modalError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
                  {modalError}
                </div>
              )}

              <dl className="space-y-3">
                <InfoItem label="Status">
                  {isDamaged(selectedUnit) &&
                  selectedUnit.status === "available" ? (
                    <Pill tone="red">Sedang rusak (tidak bisa dipinjam)</Pill>
                  ) : (
                    <Pill
                      tone={
                        selectedUnit.status === "available" ? "green" : "amber"
                      }
                    >
                      {selectedUnit.status === "available"
                        ? "Tersedia"
                        : "Dipinjam"}
                    </Pill>
                  )}
                </InfoItem>

                {selectedUnit.status !== "available" &&
                  borrowerOfUnit(selectedUnit) && (
                    <InfoItem label="Dipinjam oleh">
                      {borrowerOfUnit(selectedUnit)!.employee.name}
                      <span className="text-gray-400">
                        {" "}
                        &middot;{" "}
                        {formatDateTime(
                          borrowerOfUnit(selectedUnit)!.assignedAt
                        )}
                      </span>
                    </InfoItem>
                  )}
              </dl>

              <div>
                <p className={labelClass}>Kondisi Barang</p>
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
              </div>

              {conditionEdit === "damaged" && (
                <>
                  <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-100">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    Unit rusak tidak dihitung di stok tersedia dan tidak akan
                    dipilih saat aset di-assign atau request disetujui.
                  </div>

                  <div>
                    <label className={labelClass}>Jenis Kerusakan</label>
                    <select
                      value={damageLevelEdit}
                      onChange={(e) => setDamageLevelEdit(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">-- Pilih Jenis Kerusakan --</option>
                      <option value="ringan">Ringan</option>
                      <option value="sedang">Sedang</option>
                      <option value="berat">Berat</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Urgensi</label>
                    <select
                      value={urgencyEdit}
                      onChange={(e) => setUrgencyEdit(e.target.value)}
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
                <label className={labelClass}>
                  Catatan kondisi (opsional)
                </label>
                <textarea
                  value={conditionNoteEdit}
                  onChange={(e) => setConditionNoteEdit(e.target.value)}
                  rows={3}
                  placeholder="Contoh: layar retak, tinta bocor"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-200 bg-gray-50/50 px-6 py-4">
              <button
                onClick={() => setSelectedUnit(null)}
                className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
              >
                Tutup
              </button>
              <button
                onClick={saveCondition}
                disabled={conditionSaving}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
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
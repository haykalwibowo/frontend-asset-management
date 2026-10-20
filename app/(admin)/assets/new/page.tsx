"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, UploadCloud, FileText, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function NewAssetPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assetType, setAssetType] = useState("");
  const [locationId, setLocationId] = useState("");
  const [value, setValue] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purchaseDate, setPurchaseDate] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        const [catRes, locRes] = await Promise.all([
          axios.get(`${apiUrl}/categories`, { headers }),
          axios.get(`${apiUrl}/locations`, { headers }),
        ]);
        setCategories(catRes.data);
        setLocations(locRes.data);
      } catch {
        setError("Gagal memuat data category/location");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setValue(digitsOnly);
  };

  const formattedValue = value ? Number(value).toLocaleString("id-ID") : "";

  const pickFile = (file: File | null) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Format nota harus PDF, JPG, atau PNG");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran nota maksimal 5 MB");
      return;
    }
    setError("");
    setInvoiceFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama aset wajib diisi");
      return;
    }
    if (!categoryId) {
      setError("Kategori wajib dipilih");
      return;
    }
    if (!assetType.trim()) {
      setError("Jenis wajib diisi");
      return;
    }
    if (!locationId) {
      setError("Lokasi wajib dipilih");
      return;
    }
    if (!quantity || Number(quantity) < 1) {
      setError("Jumlah minimal 1");
      return;
    }
    if (!value || Number(value) < 1) {
      setError("Harga per unit wajib diisi");
      return;
    }
    if (!purchaseDate) {
      setError("Tanggal pembelian wajib diisi");
      return;
    }
    if (!invoiceNumber.trim()) {
      setError("Nomor invoice wajib diisi");
      return;
    }
    if (!vendorName.trim()) {
      setError("Nama vendor wajib diisi");
      return;
    }
    if (!invoiceFile) {
      setError("Nota / invoice wajib diupload");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("type", assetType.trim());
      formData.append("categoryId", categoryId);
      formData.append("locationId", locationId);
      formData.append("quantity", quantity);
      formData.append("value", value);
      formData.append("purchaseDate", new Date(purchaseDate).toISOString());
      formData.append("invoiceNumber", invoiceNumber.trim());
      formData.append("vendorName", vendorName.trim());
      formData.append("invoice", invoiceFile);

      await axios.post(`${apiUrl}/assets`, formData, { headers });
      router.push("/assets");
    } catch (err: any) {
      const backendError =
        err?.response?.data?.message || err?.response?.data?.error;
      setError(backendError || "Gagal menyimpan aset");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Memuat...</p>
      </div>
    );
  }

  const totalHarga = (Number(quantity) || 0) * (Number(value) || 0);

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <Link
          href="/assets"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Kembali ke Daftar Aset
        </Link>

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Tambah Aset Baru
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Semua kolom wajib diisi. ID Number tiap unit akan dibuat otomatis.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bagian A */}
          <section className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                A
              </span>
              <h3 className="font-semibold text-gray-900">Data Aset</h3>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className={labelClass}>Nama aset</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Contoh: Laptop Dell Latitude"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className={inputClass}
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Jenis</label>
                  <input
                    type="text"
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    required
                    placeholder="Contoh: Laptop, Proyektor"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Lokasi</label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    required
                    className={inputClass}
                  >
                    <option value="">-- Pilih Lokasi --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Jumlah unit</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    placeholder="Contoh: 5"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Harga per unit</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formattedValue}
                      onChange={handleValueChange}
                      required
                      placeholder="Contoh: 3.500.000"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Tanggal pembelian</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {value && (
                <div className="rounded-lg bg-blue-50 p-4 ring-1 ring-blue-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Total Harga
                  </p>
                  <p className="mt-1 text-xl font-bold text-blue-900">
                    Rp {totalHarga.toLocaleString("id-ID")}
                  </p>
                  <p className="mt-0.5 text-xs text-blue-600">
                    {quantity || 0} unit &times; Rp{" "}
                    {(Number(value) || 0).toLocaleString("id-ID")}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Bagian B */}
          <section className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                B
              </span>
              <h3 className="font-semibold text-gray-900">Nota / Invoice</h3>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nomor invoice</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                    placeholder="Contoh: INV-2026-001"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Nama vendor</label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    required
                    placeholder="Nama toko / pemasok"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                  className="hidden"
                />

                {!invoiceFile ? (
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
                      pickFile(e.dataTransfer.files?.[0] || null);
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-9 text-center transition ${
                      dragging
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <UploadCloud size={22} strokeWidth={1.8} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      Klik untuk upload atau tarik file ke sini
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      PDF, JPG, atau PNG (maks. 5 MB)
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
                          {invoiceFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatSize(invoiceFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInvoiceFile(null)}
                      aria-label="Hapus file"
                      title="Hapus file"
                      className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Link
              href="/assets"
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Aset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
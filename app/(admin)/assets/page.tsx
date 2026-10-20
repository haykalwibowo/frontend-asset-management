"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  Plus,
  Search,
  MapPin,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  PackageSearch,
} from "lucide-react";
import AssetDetailDrawer from "./AssetDetailDrawer";

interface Asset {
  id: string;
  name: string;
  type?: string | null;
  status: string;
  categoryId: string;
  locationId: string;
  quantity?: number;
  availableQuantity?: number;
  borrowedQuantity?: number;
}

interface Option {
  id: string;
  name: string;
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

export default function AssetsPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  const loadData = async () => {
    try {
      const [assetsRes, locationsRes, categoriesRes] = await Promise.all([
        axios.get(`${apiUrl}/assets`, { headers }),
        axios.get(`${apiUrl}/locations`, { headers }),
        axios.get(`${apiUrl}/categories`, { headers }),
      ]);
      setAssets(assetsRes.data);
      setLocations(locationsRes.data);
      setCategories(categoriesRes.data);
    } catch (err: any) {
      console.error("Load assets error:", err);
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
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
  }, []);

  // kembali ke halaman 1 setiap filter berubah
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, typeFilter, locationFilter, statusFilter]);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Yakin mau hapus aset "${name}"? Aksi ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    try {
      await axios.delete(`${apiUrl}/assets/${id}`, { headers });
      loadData();
    } catch {
      alert("Gagal menghapus aset");
    }
  };

  const locationName = (id: string) =>
    locations.find((l) => l.id === id)?.name || "-";
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || "-";

  // daftar jenis unik, mengikuti kategori yang dipilih
  const typeOptions = Array.from(
    new Set(
      assets
        .filter((a) => (categoryFilter ? a.categoryId === categoryFilter : true))
        .map((a) => (a.type || "").trim())
        .filter((t) => t.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  // status ditentukan dari unit yang sedang dipinjam
  const getStatus = (a: Asset) =>
    (a.borrowedQuantity ?? 0) > 0 ? "in_use" : "available";

  const filteredAssets = assets.filter((asset) => {
    const keyword = search.toLowerCase();
    const matchesSearch = asset.name.toLowerCase().includes(keyword);
    const matchesCategory = categoryFilter
      ? asset.categoryId === categoryFilter
      : true;
    const matchesType = typeFilter
      ? (asset.type || "").trim() === typeFilter
      : true;
    const matchesLocation = locationFilter
      ? asset.locationId === locationFilter
      : true;
    const matchesStatus = statusFilter ? getStatus(asset) === statusFilter : true;
    return (
      matchesSearch &&
      matchesCategory &&
      matchesType &&
      matchesLocation &&
      matchesStatus
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedAssets = filteredAssets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const hasActiveFilter =
    search || categoryFilter || typeFilter || locationFilter || statusFilter;

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setTypeFilter("");
    setLocationFilter("");
    setStatusFilter("");
  };

  const selectClass =
    "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Daftar Aset
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {filteredAssets.length} aset ditemukan
            {locationFilter && ` di ${locationName(locationFilter)}`}
          </p>
        </div>
        <Link
          href="/assets/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={16} strokeWidth={2.5} />
          Tambah Aset
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="relative w-full max-w-[15rem]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama aset..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setTypeFilter("");
          }}
          className={selectClass}
        >
          <option value="" hidden>
            Kategori
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={selectClass}
        >
          <option value="" hidden>
            Jenis
          </option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className={selectClass}
        >
          <option value="" hidden>
            Lokasi
          </option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          <option value="" hidden>
            Status
          </option>
          <option value="available">Available</option>
          <option value="in_use">In Use</option>
        </select>

        {hasActiveFilter && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <FilterX size={16} />
            Reset filter
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Memuat data...</p>}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {!loading && !error && assets.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
          <PackageSearch size={36} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Belum ada data aset.</p>
        </div>
      )}

      {!loading && assets.length > 0 && filteredAssets.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
          <PackageSearch size={36} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            Tidak ada aset yang cocok dengan pencarian atau filter.
          </p>
        </div>
      )}

      {!loading && filteredAssets.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3.5">Nama Aset</th>
                  <th className="px-5 py-3.5">Kategori</th>
                  <th className="px-5 py-3.5">Jenis</th>
                  <th className="px-5 py-3.5">Lokasi</th>
                  <th className="px-5 py-3.5">Stok</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedAssets.map((asset) => {
                  const status = getStatus(asset);
                  return (
                    <tr key={asset.id} className="transition hover:bg-blue-50/40">
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSelectedAssetId(asset.id)}
                          className="text-left font-semibold text-gray-900 transition hover:text-blue-600"
                        >
                          {asset.name}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {categoryName(asset.categoryId)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {asset.type || "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-gray-700">
                          <MapPin size={14} className="text-gray-400" />
                          {locationName(asset.locationId)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-800">
                        {asset.availableQuantity !== undefined &&
                        asset.quantity !== undefined
                          ? `${asset.availableQuantity} / ${asset.quantity}`
                          : "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            status === "available"
                              ? "bg-green-50 text-green-700 ring-green-600/20"
                              : "bg-amber-50 text-amber-700 ring-amber-600/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              status === "available"
                                ? "bg-green-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {status === "available" ? "Available" : "In use"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(asset.id, asset.name)}
                          aria-label={`Hapus ${asset.name}`}
                          title="Hapus"
                          className="inline-flex rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/50 px-5 py-3">
              <p className="text-sm text-gray-500">
                Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, filteredAssets.length)} dari{" "}
                {filteredAssets.length} aset
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
      )}

      {selectedAssetId && (
        <AssetDetailDrawer
          assetId={selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
          onChanged={loadData}
        />
      )}
    </div>
  );
}
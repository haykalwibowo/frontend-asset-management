"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  MapPin,
  ChevronRight,
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  address: string | null;
}

interface Asset {
  id: string;
  locationId: string;
}

export default function LocationsPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [locations, setLocations] = useState<Location[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [search, setSearch] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  const handleAuthError = (err: any) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      router.push("/login");
      return true;
    }
    return false;
  };

  const loadData = async () => {
    try {
      const [locRes, assetRes] = await Promise.all([
        axios.get(`${apiUrl}/locations`, { headers }),
        axios.get(`${apiUrl}/assets`, { headers }),
      ]);
      setLocations(locRes.data);
      setAssets(assetRes.data);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError("Gagal memuat data lokasi");
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

  const assetCount = (locationId: string) =>
    assets.filter((a) => a.locationId === locationId).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await axios.post(
        `${apiUrl}/locations`,
        { name: name.trim(), address: address.trim() || null },
        { headers }
      );
      setName("");
      setAddress("");
      loadData();
    } catch (err) {
      if (!handleAuthError(err)) setError("Gagal menambah lokasi");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (l: Location) => {
    setEditingId(l.id);
    setEditName(l.name);
    setEditAddress(l.address || "");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setError("");
    try {
      await axios.put(
        `${apiUrl}/locations/${id}`,
        { name: editName.trim(), address: editAddress.trim() || null },
        { headers }
      );
      setEditingId(null);
      loadData();
    } catch (err) {
      if (!handleAuthError(err)) setError("Gagal mengubah lokasi");
    }
  };

  const handleDelete = async (id: string, label: string) => {
    const confirmed = window.confirm(
      `Yakin mau hapus lokasi "${label}"? Aksi ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;
    try {
      await axios.delete(`${apiUrl}/locations/${id}`, { headers });
      loadData();
    } catch (err) {
      if (!handleAuthError(err))
        alert("Gagal menghapus lokasi. Pastikan tidak ada aset di lokasi ini.");
    }
  };

  const keyword = search.toLowerCase();
  const filtered = locations.filter(
    (l) =>
      l.name.toLowerCase().includes(keyword) ||
      (l.address || "").toLowerCase().includes(keyword)
  );

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Master Data
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Location
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {filtered.length} lokasi ditemukan
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
      >
        <div className="w-full max-w-xs">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Nama Lokasi / PT
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: PT. ABU"
            required
            className={inputClass}
          />
        </div>
        <div className="w-full max-w-md">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Alamat
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Contoh: Jl. Sudirman No. 10, Jakarta"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} strokeWidth={2.5} />
          {saving ? "Menyimpan..." : "Tambah"}
        </button>
      </form>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="relative max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau alamat..."
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Memuat data...</p>}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {!loading && !error && locations.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
          <MapPin size={36} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Belum ada data lokasi.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3.5">Nama Lokasi</th>
                  <th className="px-5 py-3.5">Alamat</th>
                  <th className="px-5 py-3.5">Jumlah Aset</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="transition hover:bg-blue-50/40">
                    <td className="px-5 py-3.5">
                      {editingId === l.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        <Link
                          href={`/locations/${l.id}`}
                          className="group inline-flex items-center gap-1 font-semibold text-gray-900 transition hover:text-blue-600"
                        >
                          {l.name}
                          <ChevronRight
                            size={14}
                            className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                          />
                        </Link>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {editingId === l.id ? (
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        l.address || <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                        {assetCount(l.id)} jenis
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {editingId === l.id ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleUpdate(l.id)}
                            title="Simpan"
                            aria-label="Simpan"
                            className="rounded-lg p-2 text-green-600 transition hover:bg-green-50"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            title="Batal"
                            aria-label="Batal"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(l)}
                            title="Edit"
                            aria-label={`Edit ${l.name}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(l.id, l.name)}
                            title="Hapus"
                            aria-label={`Hapus ${l.name}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
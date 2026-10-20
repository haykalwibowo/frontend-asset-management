"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Pencil, Trash2, Check, X, Tags } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadCategories = () => {
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCategories(res.data))
      .catch(() => setError("Gagal memuat data category"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/categories`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setName("");
      loadCategories();
    } catch {
      setError("Gagal menyimpan category");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (id: string) => {
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/categories/${id}`,
        { name: editName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingId(null);
      setEditName("");
      loadCategories();
    } catch {
      alert("Gagal menyimpan perubahan");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Yakin mau hapus category "${name}"?`);
    if (!confirmed) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/categories/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadCategories();
    } catch {
      alert("Gagal menghapus category");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Master Data
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Category
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {categories.length} category terdaftar
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-4 flex max-w-2xl items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
      >
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Nama Category
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Contoh: Laptop, Monitor, Printer"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} strokeWidth={2.5} />
          {submitting ? "Menyimpan..." : "Tambah"}
        </button>
      </form>

      {error && (
        <div className="mb-4 max-w-2xl rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Memuat data...</p>}

      {!loading && categories.length === 0 && (
        <div className="max-w-2xl rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
          <Tags size={36} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            Belum ada data category.
          </p>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="max-w-2xl overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Nama Category</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="transition hover:bg-blue-50/40">
                  {editingId === cat.id ? (
                    <>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={inputClass}
                          autoFocus
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => saveEdit(cat.id)}
                            title="Simpan"
                            aria-label="Simpan"
                            className="rounded-lg p-2 text-green-600 transition hover:bg-green-50"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            title="Batal"
                            aria-label="Batal"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {cat.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(cat)}
                            title="Edit"
                            aria-label={`Edit ${cat.name}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            title="Hapus"
                            aria-label={`Hapus ${cat.name}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
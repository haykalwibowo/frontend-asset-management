"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Pencil, Trash2, Check, X, Building2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
  headId: string | null;
  head: { id: string; name: string } | null;
  _count: { employees: number };
}

interface EmployeeOption {
  id: string;
  name: string;
  position: string | null;
}

const apiMessage = (err: unknown, fallback: string): string =>
  (axios.isAxiosError(err) && err.response?.data?.message) || fallback;

export default function DepartmentsPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [headId, setHeadId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHeadId, setEditHeadId] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  const handleAuthError = (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      localStorage.removeItem("token");
      router.push("/login");
      return true;
    }
    return false;
  };

  const loadData = () => {
    Promise.all([
      axios.get(`${apiUrl}/departments`, { headers }),
      axios.get(`${apiUrl}/employees`, { headers }),
    ])
      .then(([deptRes, empRes]) => {
        setDepartments(deptRes.data);
        setEmployees(empRes.data);
      })
      .catch((err) => {
        if (!handleAuthError(err)) setError("Gagal memuat data departemen");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      await axios.post(
        `${apiUrl}/departments`,
        { name: name.trim(), headId: headId || null },
        { headers }
      );
      setName("");
      setHeadId("");
      loadData();
    } catch (err) {
      if (!handleAuthError(err)) setError(apiMessage(err, "Gagal menyimpan departemen"));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditHeadId(dept.headId || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditHeadId("");
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await axios.put(
        `${apiUrl}/departments/${id}`,
        { name: editName.trim(), headId: editHeadId || null },
        { headers }
      );
      cancelEdit();
      loadData();
    } catch (err) {
      if (!handleAuthError(err)) alert(apiMessage(err, "Gagal menyimpan perubahan"));
    }
  };

  const handleDelete = async (dept: Department) => {
    const extra =
      dept._count.employees > 0
        ? `\n\n${dept._count.employees} karyawan di departemen ini akan menjadi tanpa departemen.`
        : "";
    const confirmed = window.confirm(`Yakin mau hapus departemen "${dept.name}"?${extra}`);
    if (!confirmed) return;
    try {
      await axios.delete(`${apiUrl}/departments/${dept.id}`, { headers });
      loadData();
    } catch (err) {
      if (!handleAuthError(err)) alert(apiMessage(err, "Gagal menghapus departemen"));
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";

  const headSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">- Belum ada -</option>
      {employees.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
          {e.position ? ` (${e.position})` : ""}
        </option>
      ))}
    </select>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Master Data
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Department
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {departments.length} departemen terdaftar. Kepala departemen menjadi
          approver untuk karyawan yang tidak punya atasan langsung.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-4 flex max-w-3xl flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
      >
        <div className="min-w-[12rem] flex-1">
          <label className={labelClass}>Nama Departemen</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Contoh: Operation, Finance, GA"
            className={inputClass}
          />
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className={labelClass}>Kepala Departemen (opsional)</label>
          {headSelect(headId, setHeadId)}
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
        <div className="mb-4 max-w-3xl rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Memuat data...</p>}

      {!loading && departments.length === 0 && (
        <div className="max-w-3xl rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
          <Building2 size={36} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Belum ada data departemen.</p>
        </div>
      )}

      {!loading && departments.length > 0 && (
        <div className="max-w-3xl overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Nama Departemen</th>
                <th className="px-5 py-3.5">Kepala Departemen</th>
                <th className="px-5 py-3.5">Karyawan</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((dept) =>
                editingId === dept.id ? (
                  <tr key={dept.id} className="bg-blue-50/40">
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={inputClass}
                        autoFocus
                      />
                    </td>
                    <td className="px-5 py-3">{headSelect(editHeadId, setEditHeadId)}</td>
                    <td className="px-5 py-3 text-gray-600">{dept._count.employees}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => saveEdit(dept.id)}
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
                  </tr>
                ) : (
                  <tr key={dept.id} className="transition hover:bg-blue-50/40">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{dept.name}</td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {dept.head?.name || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{dept._count.employees}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => startEdit(dept)}
                          title="Edit"
                          aria-label={`Edit ${dept.name}`}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(dept)}
                          title="Hapus"
                          aria-label={`Hapus ${dept.name}`}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

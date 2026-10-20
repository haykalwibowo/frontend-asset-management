"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  KeyRound,
  Users,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  department: string | null;
  user: { email: string } | null;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function EmployeesPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");

  const [accountTargetId, setAccountTargetId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState("");

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

  const loadEmployees = () => {
    axios
      .get(`${apiUrl}/employees`, { headers })
      .then((res) => setEmployees(res.data))
      .catch((err) => {
        if (!handleAuthError(err)) setError("Gagal memuat data karyawan");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await axios.post(
        `${apiUrl}/employees`,
        { name: name.trim(), department: department.trim() || null },
        { headers }
      );
      setName("");
      setDepartment("");
      loadEmployees();
    } catch (err) {
      if (!handleAuthError(err)) setError("Gagal menambah karyawan");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditDepartment(emp.department || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDepartment("");
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await axios.put(
        `${apiUrl}/employees/${id}`,
        { name: editName.trim(), department: editDepartment.trim() || null },
        { headers }
      );
      cancelEdit();
      loadEmployees();
    } catch (err) {
      if (!handleAuthError(err)) alert("Gagal menyimpan perubahan");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Yakin mau hapus karyawan "${name}"?`);
    if (!confirmed) return;
    try {
      await axios.delete(`${apiUrl}/employees/${id}`, { headers });
      loadEmployees();
    } catch (err) {
      if (!handleAuthError(err)) alert("Gagal menghapus karyawan");
    }
  };

  const openAccountForm = (id: string) => {
    setAccountTargetId(id);
    setAccountEmail("");
    setAccountPassword("");
    setAccountError("");
  };

  const closeAccountForm = () => {
    setAccountTargetId(null);
    setAccountError("");
  };

  const handleCreateAccount = async (id: string) => {
    if (!accountEmail.trim() || !accountPassword.trim()) {
      setAccountError("Email dan password wajib diisi");
      return;
    }
    setAccountSaving(true);
    setAccountError("");
    try {
      await axios.post(
        `${apiUrl}/employees/${id}/create-account`,
        { email: accountEmail.trim(), password: accountPassword },
        { headers }
      );
      closeAccountForm();
      loadEmployees();
    } catch (err: any) {
      setAccountError(err?.response?.data?.message || "Gagal membuat akun");
    } finally {
      setAccountSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Master Data
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Employee
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {employees.length} karyawan terdaftar
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
      >
        <div className="w-full max-w-xs">
          <label className={labelClass}>Nama Karyawan</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Arif Rahman"
            required
            className={inputClass}
          />
        </div>
        <div className="w-full max-w-xs">
          <label className={labelClass}>Departemen (opsional)</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Contoh: HR, Finance, IT"
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

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Memuat data...</p>}

      {!loading && employees.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
          <Users size={36} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            Belum ada data karyawan.
          </p>
        </div>
      )}

      {!loading && employees.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3.5">Nama</th>
                  <th className="px-5 py-3.5">Departemen</th>
                  <th className="px-5 py-3.5">Akun Staff</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="transition hover:bg-blue-50/40">
                    <td className="px-5 py-3.5">
                      {editingId === emp.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                            {getInitials(emp.name)}
                          </div>
                          <span className="font-semibold text-gray-900">
                            {emp.name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {editingId === emp.id ? (
                        <input
                          type="text"
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        emp.department || (
                          <span className="text-gray-400">-</span>
                        )
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {emp.user ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          {emp.user.email}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          Belum ada akun
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {editingId === emp.id ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => saveEdit(emp.id)}
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
                      ) : (
                        <div className="flex justify-end gap-1">
                          {!emp.user && (
                            <button
                              onClick={() => openAccountForm(emp.id)}
                              title="Buat Akun"
                              aria-label={`Buat akun ${emp.name}`}
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <KeyRound size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(emp)}
                            title="Edit"
                            aria-label={`Edit ${emp.name}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id, emp.name)}
                            title="Hapus"
                            aria-label={`Hapus ${emp.name}`}
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

      {/* Modal buat akun staff */}
      {accountTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={closeAccountForm}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Employee
                </p>
                <h3 className="text-lg font-bold text-gray-900">
                  Buat Akun Staff
                </h3>
              </div>
              <button
                onClick={closeAccountForm}
                aria-label="Tutup"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  className={inputClass}
                  placeholder="nama@email.com"
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Minimal 6 karakter"
                />
              </div>

              {accountError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
                  {accountError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/50 px-6 py-4">
              <button
                onClick={closeAccountForm}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleCreateAccount(accountTargetId)}
                disabled={accountSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                {accountSaving ? "Menyimpan..." : "Buat Akun"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  KeyRound,
  Users,
  AlertTriangle,
} from "lucide-react";
import { ROLE_OPTIONS, roleLabel } from "@/lib/roles";

interface Ref {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  departmentId: string | null;
  supervisorId: string | null;
  department: (Ref & { head: Ref | null }) | null;
  supervisor: Ref | null;
  approver: (Ref & { source: "supervisor" | "department_head" }) | null;
  user: { id: string; email: string; role: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface EmployeeForm {
  name: string;
  position: string;
  phone: string;
  departmentId: string;
  supervisorId: string;
}

const emptyForm: EmployeeForm = {
  name: "",
  position: "",
  phone: "",
  departmentId: "",
  supervisorId: "",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const apiMessage = (err: unknown, fallback: string): string =>
  (axios.isAxiosError(err) && err.response?.data?.message) || fallback;

export default function EmployeesPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal tambah / edit karyawan. editingId null = tambah baru
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Modal buat akun
  const [accountTarget, setAccountTarget] = useState<Employee | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountRole, setAccountRole] = useState("staff");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState("");

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
      axios.get(`${apiUrl}/employees`, { headers }),
      axios.get(`${apiUrl}/departments`, { headers }),
    ])
      .then(([empRes, deptRes]) => {
        setEmployees(empRes.data);
        setDepartments(deptRes.data);
      })
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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Tambah / edit karyawan =====
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      position: emp.position || "",
      phone: emp.phone || "",
      departmentId: emp.departmentId || "",
      supervisorId: emp.supervisorId || "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormError("");
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Nama karyawan wajib diisi");
      return;
    }
    setFormSaving(true);
    setFormError("");
    // string kosong dikirim apa adanya; backend mengubahnya jadi null
    const payload = { ...form, name: form.name.trim() };
    try {
      if (editingId) {
        await axios.put(`${apiUrl}/employees/${editingId}`, payload, { headers });
      } else {
        await axios.post(`${apiUrl}/employees`, payload, { headers });
      }
      closeForm();
      loadData();
    } catch (err) {
      if (!handleAuthError(err))
        setFormError(apiMessage(err, "Gagal menyimpan karyawan"));
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    const confirmed = window.confirm(`Yakin mau hapus karyawan "${emp.name}"?`);
    if (!confirmed) return;
    try {
      await axios.delete(`${apiUrl}/employees/${emp.id}`, { headers });
      loadData();
    } catch (err) {
      if (!handleAuthError(err)) alert(apiMessage(err, "Gagal menghapus karyawan"));
    }
  };

  // ===== Akun =====
  const openAccountForm = (emp: Employee) => {
    setAccountTarget(emp);
    setAccountEmail("");
    setAccountPassword("");
    setAccountRole("staff");
    setAccountError("");
  };

  const closeAccountForm = () => {
    setAccountTarget(null);
    setAccountError("");
  };

  const handleCreateAccount = async () => {
    if (!accountTarget) return;
    if (!accountEmail.trim() || !accountPassword.trim()) {
      setAccountError("Email dan password wajib diisi");
      return;
    }
    setAccountSaving(true);
    setAccountError("");
    try {
      await axios.post(
        `${apiUrl}/employees/${accountTarget.id}/create-account`,
        {
          email: accountEmail.trim(),
          password: accountPassword,
          role: accountRole,
        },
        { headers }
      );
      closeAccountForm();
      loadData();
    } catch (err) {
      setAccountError(apiMessage(err, "Gagal membuat akun"));
    } finally {
      setAccountSaving(false);
    }
  };

  const handleChangeRole = async (emp: Employee, role: string) => {
    if (!emp.user || role === emp.user.role) return;
    const confirmed = window.confirm(
      `Ubah role ${emp.name} dari ${roleLabel(emp.user.role)} menjadi ${roleLabel(role)}?`
    );
    if (!confirmed) return;
    try {
      await axios.put(`${apiUrl}/users/${emp.user.id}/role`, { role }, { headers });
      loadData();
    } catch (err) {
      if (!handleAuthError(err)) alert(apiMessage(err, "Gagal mengubah role"));
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";

  // Kandidat atasan: semua karyawan selain dirinya sendiri
  const supervisorOptions = employees.filter((e) => e.id !== editingId);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
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
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={16} strokeWidth={2.5} />
          Tambah Karyawan
        </button>
      </div>

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
                  <th className="px-5 py-3.5">Approver Pengadaan</th>
                  <th className="px-5 py-3.5">Akun</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="transition hover:bg-blue-50/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                          {getInitials(emp.name)}
                        </div>
                        <div className="min-w-0 leading-tight">
                          <p className="font-semibold text-gray-900">
                            {emp.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {[emp.position, emp.phone].filter(Boolean).join(" · ") ||
                              "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {emp.department?.name || (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {emp.approver ? (
                        <div className="leading-tight">
                          <p className="text-gray-800">{emp.approver.name}</p>
                          <p className="text-xs text-gray-400">
                            {emp.approver.source === "supervisor"
                              ? "Atasan langsung"
                              : "Kepala departemen"}
                          </p>
                        </div>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs text-amber-700"
                          title="Atur atasan langsung, atau kepala departemen di Master Department"
                        >
                          <AlertTriangle size={14} />
                          Belum ada approver
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {emp.user ? (
                        <div className="leading-tight">
                          <p className="text-xs text-gray-600">{emp.user.email}</p>
                          <select
                            value={emp.user.role}
                            onChange={(e) => handleChangeRole(emp, e.target.value)}
                            aria-label={`Role ${emp.name}`}
                            className="mt-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {roleLabel(r)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          Belum ada akun
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        {!emp.user && (
                          <button
                            onClick={() => openAccountForm(emp)}
                            title="Buat Akun"
                            aria-label={`Buat akun ${emp.name}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <KeyRound size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(emp)}
                          title="Edit"
                          aria-label={`Edit ${emp.name}`}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          title="Hapus"
                          aria-label={`Hapus ${emp.name}`}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal tambah / edit karyawan */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={closeForm}
        >
          <form
            onSubmit={handleSaveForm}
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Employee
                </p>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Karyawan" : "Tambah Karyawan"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Tutup"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nama Karyawan</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Arif Rahman"
                  required
                  autoFocus
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Jabatan (opsional)</label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="Contoh: System Administrator Staff"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>No. Telepon (opsional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Contoh: 0812-3456-7890"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Departemen</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">- Tanpa departemen -</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Atasan Langsung</label>
                <select
                  value={form.supervisorId}
                  onChange={(e) => setForm({ ...form, supervisorId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">- Tidak ada -</option>
                  {supervisorOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                      {e.position ? ` (${e.position})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 sm:col-span-2">
                Request pengadaan akan di-approve oleh atasan langsung. Kalau
                tidak diisi, approver-nya kepala departemen.
              </p>

              {formError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100 sm:col-span-2">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/50 px-6 py-4">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                {formSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal buat akun */}
      {accountTarget && (
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
                  {accountTarget.name}
                </p>
                <h3 className="text-lg font-bold text-gray-900">Buat Akun</h3>
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
              <div>
                <label className={labelClass}>Role</label>
                <select
                  value={accountRole}
                  onChange={(e) => setAccountRole(e.target.value)}
                  className={inputClass}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-gray-500">
                  Atasan tidak perlu role khusus: cukup diatur sebagai atasan
                  langsung atau kepala departemen.
                </p>
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
                onClick={handleCreateAccount}
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

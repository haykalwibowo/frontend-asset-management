"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { UserCheck, ArrowRight } from "lucide-react";
import { roleLabel } from "@/lib/roles";
import {
  apiUrl,
  authHeaders,
  apiMessage,
  isUnauthorized,
  formatDateOnly,
  todayInput,
} from "@/lib/purchase";

interface Person {
  id: string;
  name: string;
  role: string;
  position: string | null;
}

interface Delegation {
  id: string;
  delegator: Person;
  delegate: Person;
  startDate: string;
  endDate: string;
  note: string | null;
  state: "active" | "scheduled" | "expired" | "cancelled";
}

const STATE_STYLE: Record<Delegation["state"], [string, string]> = {
  active: ["Aktif", "bg-green-50 text-green-700 ring-green-600/20"],
  scheduled: ["Terjadwal", "bg-blue-50 text-blue-700 ring-blue-600/20"],
  expired: ["Selesai", "bg-gray-50 text-gray-500 ring-gray-500/20"],
  cancelled: ["Dibatalkan", "bg-gray-50 text-gray-400 ring-gray-500/20"],
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";

const personText = (p: Person) =>
  `${p.name}${p.position ? ` (${p.position})` : ` (${roleLabel(p.role)})`}`;

// adminMode: Super Admin melihat semua delegasi & bisa membuat atas nama siapa pun
export default function DelegationManager({ adminMode = false }: { adminMode?: boolean }) {
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [rows, setRows] = useState<Delegation[] | null>(null);
  const [candidates, setCandidates] = useState<Person[]>([]);
  const [error, setError] = useState("");

  const [delegatorId, setDelegatorId] = useState("");
  const [delegateId, setDelegateId] = useState("");
  const [startDate, setStartDate] = useState(todayInput);
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      axios.get(`${apiUrl}/delegations`, {
        params: adminMode ? { all: 1 } : {},
        headers: authHeaders(),
      }),
      axios.get(`${apiUrl}/delegations/candidates`, { headers: authHeaders() }),
    ])
      .then(([d, c]) => {
        setRows(d.data);
        setCandidates(c.data);
      })
      .catch((err) => {
        if (isUnauthorized(err)) return router.push("/login");
        setError(apiMessage(err, "Gagal memuat delegasi"));
      });
  }, [adminMode, router]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMyId(JSON.parse(localStorage.getItem("user") || "{}").id ?? null);
    } catch {
      setMyId(null);
    }
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (adminMode && !delegatorId) return setFormError("Pilih pemberi delegasi.");
    if (!delegateId) return setFormError("Pilih pengganti.");
    if (!startDate || !endDate) return setFormError("Isi tanggal mulai dan selesai.");
    setSaving(true);
    try {
      await axios.post(
        `${apiUrl}/delegations`,
        {
          delegatorUserId: adminMode ? delegatorId : undefined,
          delegateUserId: delegateId,
          startDate,
          endDate,
          note: note.trim() || undefined,
        },
        { headers: authHeaders() }
      );
      setDelegateId("");
      setEndDate("");
      setNote("");
      load();
    } catch (err) {
      setFormError(apiMessage(err, "Gagal menyimpan delegasi"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (d: Delegation) => {
    if (!window.confirm(`Batalkan delegasi ${d.delegator.name} → ${d.delegate.name}?`)) return;
    try {
      await axios.delete(`${apiUrl}/delegations/${d.id}`, { headers: authHeaders() });
      load();
    } catch (err) {
      alert(apiMessage(err, "Gagal membatalkan delegasi"));
    }
  };

  const received = rows?.filter((d) => d.delegate.id === myId && d.state === "active") ?? [];
  const delegateOptions = candidates.filter(
    (c) => c.id !== (adminMode ? delegatorId : myId)
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Delegasi Approval</h2>
        <p className="mt-1 text-sm text-gray-500">
          {adminMode
            ? "Atur pengganti approval untuk siapa pun, mis. saat ada yang cuti."
            : "Tunjuk pengganti yang bisa approve pengajuan atas nama Anda selama periode tertentu (mis. saat cuti)."}{" "}
          Di dokumen akan tercatat sebagai &ldquo;Pengganti a.n. Anda&rdquo;.
        </p>
      </div>

      {!adminMode && received.length > 0 && (
        <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-100">
          Anda sedang mewakili:{" "}
          {received.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}
              <b>{d.delegator.name}</b> sampai {formatDateOnly(d.endDate)}
            </span>
          ))}
          . Pengajuan yang menunggu mereka muncul di menu Perlu Tindakan.
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:grid-cols-2 lg:grid-cols-4"
      >
        {adminMode && (
          <div className="sm:col-span-2 lg:col-span-2">
            <label className={labelClass}>Pemberi Delegasi</label>
            <select
              value={delegatorId}
              onChange={(e) => setDelegatorId(e.target.value)}
              className={inputClass}
            >
              <option value="">- Pilih -</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {personText(c)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={adminMode ? "sm:col-span-2 lg:col-span-2" : "sm:col-span-2"}>
          <label className={labelClass}>Pengganti</label>
          <select
            value={delegateId}
            onChange={(e) => setDelegateId(e.target.value)}
            className={inputClass}
          >
            <option value="">- Pilih -</option>
            {delegateOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {personText(c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Mulai</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Selesai</label>
          <input
            type="date"
            value={endDate}
            min={startDate || todayInput()}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelClass}>Catatan (opsional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Contoh: Cuti tahunan"
            className={inputClass}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <UserCheck size={16} />
            {saving ? "Menyimpan..." : "Simpan Delegasi"}
          </button>
        </div>
        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100 sm:col-span-2 lg:col-span-4">
            {formError}
          </p>
        )}
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}
      {!rows && !error && <p className="text-sm text-gray-500">Memuat...</p>}
      {rows && rows.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
          Belum ada delegasi.
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3.5">Pemberi → Pengganti</th>
                  <th className="px-5 py-3.5">Periode</th>
                  <th className="px-5 py-3.5">Catatan</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((d) => {
                  const [label, style] = STATE_STYLE[d.state];
                  const cancellable =
                    (d.state === "active" || d.state === "scheduled") &&
                    (adminMode || d.delegator.id === myId);
                  return (
                    <tr key={d.id}>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex flex-wrap items-center gap-1.5 font-medium text-gray-900">
                          {d.delegator.name}
                          <ArrowRight size={14} className="text-gray-400" />
                          {d.delegate.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">
                        {formatDateOnly(d.startDate)} – {formatDateOnly(d.endDate)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{d.note ?? "-"}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {cancellable && (
                          <button
                            onClick={() => handleCancel(d)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Batalkan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Plus, Trash2, UploadCloud, FileText, X, Send, Info } from "lucide-react";
import {
  apiUrl,
  authHeaders,
  apiMessage,
  isUnauthorized,
  formatRupiah,
  todayInput,
  REQUIREMENT_TYPES,
  REQUIREMENT_ACTIONS,
  REQUIREMENT_SCOPES,
} from "@/lib/purchase";

interface Me {
  email: string;
  employee: {
    name: string;
    position: string | null;
    phone: string | null;
    department: { name: string } | null;
  } | null;
  approver: { name: string; source: "supervisor" | "department_head" } | null;
}

interface ItemRow {
  key: number;
  description: string;
  quantity: string;
  estimatedPrice: string;
  referenceLink: string;
}

const MAX_FILE = 5 * 1024 * 1024;
const ALLOWED_FILES = ["application/pdf", "image/jpeg", "image/png"];

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";
const cardClass = "rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200";

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              value === o.value
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

let nextKey = 1;
const newRow = (): ItemRow => ({
  key: nextKey++,
  description: "",
  quantity: "1",
  estimatedPrice: "",
  referenceLink: "",
});

const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [requirementType, setRequirementType] = useState("");
  const [requirementAction, setRequirementAction] = useState("");
  const [requirementScope, setRequirementScope] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemRow[]>(() => [newRow()]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get(`${apiUrl}/me`, { headers: authHeaders() })
      .then((res) => setMe(res.data))
      .catch((err) => {
        if (isUnauthorized(err)) router.push("/login");
      });
  }, [router]);

  const updateItem = (key: number, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const subtotal = (r: ItemRow) => (Number(r.quantity) || 0) * (Number(r.estimatedPrice) || 0);
  const total = items.reduce((s, r) => s + subtotal(r), 0);

  const pickFile = (f: File | null) => {
    setError("");
    if (!f) return setFile(null);
    if (!ALLOWED_FILES.includes(f.type)) return setError("Dokumen harus PDF, JPG, atau PNG");
    if (f.size > MAX_FILE) return setError("Ukuran dokumen maksimal 5 MB");
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!requirementType || !requirementAction || !requirementScope) {
      return setError("Lengkapi Requirement Type (jenis, kategori, dan Internal/External).");
    }
    if (!dueDate) return setError("Due date wajib diisi.");
    if (!purpose.trim()) return setError("Purpose wajib diisi.");
    for (const [i, r] of items.entries()) {
      if (!r.description.trim()) return setError(`Deskripsi barang no. ${i + 1} wajib diisi.`);
      if (!Number.isInteger(Number(r.quantity)) || Number(r.quantity) < 1)
        return setError(`Jumlah barang no. ${i + 1} minimal 1.`);
      if (r.estimatedPrice === "" || Number(r.estimatedPrice) < 0)
        return setError(`Estimasi harga barang no. ${i + 1} wajib diisi.`);
      if (r.referenceLink.trim() && !isHttpUrl(r.referenceLink.trim()))
        return setError(`Link pembelian barang no. ${i + 1} harus diawali http:// atau https://`);
    }

    const fd = new FormData();
    fd.append("requirementType", requirementType);
    fd.append("requirementAction", requirementAction);
    fd.append("requirementScope", requirementScope);
    fd.append("purpose", purpose.trim());
    fd.append("dueDate", dueDate);
    if (note.trim()) fd.append("note", note.trim());
    fd.append(
      "items",
      JSON.stringify(
        items.map((r) => ({
          description: r.description.trim(),
          quantity: Number(r.quantity),
          estimatedPrice: Number(r.estimatedPrice),
          referenceLink: r.referenceLink.trim() || undefined,
        }))
      )
    );
    if (file) fd.append("attachment", file);

    setSubmitting(true);
    try {
      const res = await axios.post(`${apiUrl}/purchase-requests`, fd, { headers: authHeaders() });
      router.push(`/pengadaan/${res.data.id}`);
    } catch (err) {
      if (isUnauthorized(err)) return router.push("/login");
      setError(apiMessage(err, "Gagal mengirim pengajuan"));
      setSubmitting(false);
    }
  };

  const emp = me?.employee;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link
          href="/pengadaan"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={14} /> Kembali
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Pengajuan Pengadaan Aset</h2>
        <p className="mt-1 text-sm text-gray-500">
          Setiap permintaan wajib dilengkapi deskripsi, jumlah kebutuhan, estimasi biaya, dan
          alasan pengadaan. Dokumen pendukung (quotation / vendor) opsional.
        </p>
      </div>

      {/* Alur approval */}
      {me && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-100">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            {me.approver ? (
              <>
                Pengajuan akan di-approve oleh <b>{me.approver.name}</b> (
                {me.approver.source === "supervisor" ? "atasan langsung" : "kepala departemen"}),
                lalu GA dan Finance.
              </>
            ) : (
              <>Anda tidak memiliki atasan, jadi pengajuan langsung diteruskan ke GA lalu Finance.</>
            )}
          </p>
        </div>
      )}

      {/* Requestor */}
      <div className={cardClass}>
        <p className="mb-3 text-sm font-semibold text-gray-900">Requestor</p>
        <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ["Nama", emp?.name],
            ["Jabatan", emp?.position],
            ["Departemen", emp?.department?.name],
            ["Email", me?.email],
            ["Telepon", emp?.phone],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="w-24 shrink-0 text-gray-500">{label}</span>
              <span className="text-gray-900">{value || "-"}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Diambil dari data karyawan. Hubungi Super Admin kalau ada yang salah.
        </p>
      </div>

      {/* Requirement type */}
      <div className={`${cardClass} space-y-4`}>
        <ChoiceGroup
          label="Requirement Type"
          options={REQUIREMENT_TYPES}
          value={requirementType}
          onChange={setRequirementType}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ChoiceGroup
            label="Jenis"
            options={REQUIREMENT_ACTIONS}
            value={requirementAction}
            onChange={setRequirementAction}
          />
          <ChoiceGroup
            label="Lingkup"
            options={REQUIREMENT_SCOPES}
            value={requirementScope}
            onChange={setRequirementScope}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Purpose / Alasan Pengadaan</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Contoh: Monitor di gedung CD lt. 1"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              min={todayInput()}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className={`${cardClass} p-0`}>
        <p className="px-5 pt-5 text-sm font-semibold text-gray-900">
          Product / Service Specification
        </p>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-10 px-3 py-2.5 text-center">No.</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="w-24 px-3 py-2.5">Qty</th>
                <th className="w-44 px-3 py-2.5">Estimasi Harga (Rp)</th>
                <th className="w-36 px-3 py-2.5 text-right">Subtotal</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r, i) => (
                <tr key={r.key}>
                  <td className="px-3 py-2 pt-4 text-center align-top text-gray-500">{i + 1}</td>
                  <td className="space-y-1.5 px-3 py-2">
                    <input
                      type="text"
                      value={r.description}
                      onChange={(e) => updateItem(r.key, { description: e.target.value })}
                      placeholder="Contoh: Kabel HDMI 2M - Merk Vention"
                      maxLength={1000}
                      aria-label={`Deskripsi barang ${i + 1}`}
                      className={inputClass}
                    />
                    <input
                      type="url"
                      value={r.referenceLink}
                      onChange={(e) => updateItem(r.key, { referenceLink: e.target.value })}
                      placeholder="Link pembelian (opsional), mis. https://tokopedia.com/..."
                      maxLength={2000}
                      aria-label={`Link pembelian barang ${i + 1}`}
                      className={`${inputClass} text-xs`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={r.quantity}
                      onChange={(e) => updateItem(r.key, { quantity: e.target.value })}
                      aria-label={`Jumlah barang ${i + 1}`}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={r.estimatedPrice}
                      onChange={(e) => updateItem(r.key, { estimatedPrice: e.target.value })}
                      placeholder="40000"
                      aria-label={`Estimasi harga barang ${i + 1}`}
                      className={inputClass}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900">
                    {formatRupiah(subtotal(r))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setItems((rows) => rows.filter((x) => x.key !== r.key))}
                      disabled={items.length === 1}
                      aria-label={`Hapus barang ${i + 1}`}
                      title="Hapus baris"
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={2} className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setItems((rows) => [...rows, newRow()])}
                    disabled={items.length >= 50}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40"
                  >
                    <Plus size={16} /> Tambah barang
                  </button>
                </td>
                <td colSpan={2} className="px-3 py-2.5 text-right font-semibold text-gray-700">
                  Total
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-gray-900">
                  {formatRupiah(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Catatan & lampiran */}
      <div className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
        <div>
          <label className={labelClass}>Catatan (opsional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={2000}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Dokumen Pendukung (opsional)</label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0] || null);
              e.target.value = "";
            }}
          />
          {!file ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-4 py-6 text-center transition hover:border-blue-300 hover:bg-gray-50"
            >
              <UploadCloud size={22} className="text-blue-600" />
              <span className="mt-1 text-sm font-semibold text-gray-800">
                Upload quotation / penawaran vendor
              </span>
              <span className="text-xs text-gray-500">PDF, JPG, atau PNG · maks 5 MB</span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={18} className="shrink-0 text-blue-600" />
                <span className="truncate text-sm text-gray-900">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Hapus file"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href="/pengadaan"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={16} />
          {submitting ? "Mengirim..." : "Kirim Pengajuan"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import axios from "axios";
import {
  Store,
  Link2,
  Save,
  CheckCircle2,
  UploadCloud,
  FileText,
  X,
  Send,
  Ban,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  apiUrl,
  authHeaders,
  apiMessage,
  formatRupiah,
  type PurchaseDetail,
} from "@/lib/purchase";

interface Row {
  id: string;
  purchaseMethod: "vendor" | "link" | "";
  vendorName: string;
  vendorContact: string;
  poNumber: string;
  purchaseLink: string;
  finalPrice: string;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500";
const ALLOWED_FILES = ["application/pdf", "image/jpeg", "image/png"];

const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

// Panel kerja tim Procurement: pilih vendor / link per barang, harga final, lalu selesai.
export default function ProcurementPanel({
  detail,
  onDone,
}: {
  detail: PurchaseDetail;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>(() =>
    detail.items.map((it) => ({
      id: it.id,
      purchaseMethod: it.purchaseMethod ?? "",
      vendorName: it.vendorName ?? "",
      vendorContact: it.vendorContact ?? "",
      poNumber: it.poNumber ?? "",
      purchaseLink: it.purchaseLink ?? it.referenceLink ?? "",
      finalPrice: it.finalPrice === null ? "" : String(it.finalPrice),
    }))
  );
  const [estimatedArrival, setEstimatedArrival] = useState(dateInput(detail.estimatedArrival));
  const [varianceNote, setVarianceNote] = useState(detail.priceVarianceNote ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Kabari pemohon / batalkan
  const [message, setMessage] = useState("");
  const [msgBusy, setMsgBusy] = useState<"note" | "cancel" | null>(null);
  const [msgError, setMsgError] = useState("");
  const [msgInfo, setMsgInfo] = useState("");

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const qty = (id: string) => detail.items.find((it) => it.id === id)?.quantity ?? 0;
  const allPriced = rows.every((r) => r.finalPrice !== "");
  const totalFinal = rows.reduce((s, r) => s + (Number(r.finalPrice) || 0) * qty(r.id), 0);
  const overBudget = allPriced && totalFinal > detail.totalEstimate;

  const save = async (submit: boolean) => {
    setError("");
    setSavedAt(null);
    if (submit) {
      if (
        !window.confirm(
          `Selesaikan procurement ${detail.docNumber}? Data vendor & harga dikunci dan pengajuan lanjut ke tahap Payment.`
        )
      )
        return;
    }
    const fd = new FormData();
    fd.append(
      "items",
      JSON.stringify(
        rows.map((r) => ({
          ...r,
          purchaseMethod: r.purchaseMethod || null,
          finalPrice: r.finalPrice === "" ? null : Number(r.finalPrice),
        }))
      )
    );
    fd.append("submit", String(submit));
    if (estimatedArrival) fd.append("estimatedArrival", estimatedArrival);
    if (varianceNote.trim()) fd.append("priceVarianceNote", varianceNote.trim());
    if (file) fd.append("quotation", file);

    setSaving(submit ? "submit" : "draft");
    try {
      await axios.post(`${apiUrl}/purchase-requests/${detail.id}/procurement`, fd, {
        headers: authHeaders(),
      });
      setFile(null);
      if (submit) onDone();
      else {
        setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
        onDone();
      }
    } catch (err) {
      setError(apiMessage(err, "Gagal menyimpan data procurement"));
      if (axios.isAxiosError(err) && err.response?.status === 409) onDone();
    } finally {
      setSaving(null);
    }
  };

  const sendMessage = async (kind: "note" | "cancel") => {
    setMsgError("");
    setMsgInfo("");
    if (!message.trim()) {
      setMsgError(kind === "note" ? "Tulis pesan update dulu." : "Tulis alasan pembatalan dulu.");
      return;
    }
    if (
      kind === "cancel" &&
      !window.confirm(`Batalkan pengajuan ${detail.docNumber}? Pembatalan bersifat final.`)
    )
      return;
    setMsgBusy(kind);
    try {
      await axios.post(
        `${apiUrl}/purchase-requests/${detail.id}/procurement/${kind}`,
        { note: message.trim() },
        { headers: authHeaders() }
      );
      setMessage("");
      if (kind === "note") setMsgInfo("Update terkirim ke pemohon.");
      onDone();
    } catch (err) {
      setMsgError(apiMessage(err, "Gagal mengirim"));
    } finally {
      setMsgBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border-l-4 border-amber-400 bg-white shadow-sm ring-1 ring-gray-200">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">Proses Procurement</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Pilih cara pembelian tiap barang: <b>Vendor</b> untuk barang besar / mahal (laptop,
            bangku, AC), atau <b>Link</b> untuk pembelian online. Data bisa disimpan sebagai draft
            dulu.
            {detail.permissions.procureOnBehalfOf && (
              <> Anda memproses a.n. <b>{detail.permissions.procureOnBehalfOf.name}</b>.</>
            )}
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {detail.items.map((it) => {
            const r = rows.find((x) => x.id === it.id)!;
            const sub = (Number(r.finalPrice) || 0) * it.quantity;
            const itemOver = r.finalPrice !== "" && Number(r.finalPrice) > it.estimatedPrice;
            return (
              <div key={it.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {it.lineNo}. {it.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {it.quantity} unit · estimasi {formatRupiah(it.estimatedPrice)}/unit
                      {it.referenceLink && (
                        <>
                          {" · "}
                          <a
                            href={it.referenceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                          >
                            link dari pemohon <ExternalLink size={11} />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
                    {(
                      [
                        ["vendor", "Vendor", Store],
                        ["link", "Link", Link2],
                      ] as const
                    ).map(([value, label, Icon]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update(it.id, { purchaseMethod: value })}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                          r.purchaseMethod === value
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        <Icon size={13} /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {r.purchaseMethod === "vendor" && (
                    <>
                      <div>
                        <label className={labelClass}>Nama Vendor</label>
                        <input
                          value={r.vendorName}
                          onChange={(e) => update(it.id, { vendorName: e.target.value })}
                          maxLength={190}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Kontak Vendor</label>
                        <input
                          value={r.vendorContact}
                          onChange={(e) => update(it.id, { vendorContact: e.target.value })}
                          maxLength={190}
                          placeholder="Telp / email / sales"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>No. PO (opsional)</label>
                        <input
                          value={r.poNumber}
                          onChange={(e) => update(it.id, { poNumber: e.target.value })}
                          maxLength={100}
                          className={inputClass}
                        />
                      </div>
                    </>
                  )}
                  {r.purchaseMethod === "link" && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className={labelClass}>Link Pembelian</label>
                      <input
                        type="url"
                        value={r.purchaseLink}
                        onChange={(e) => update(it.id, { purchaseLink: e.target.value })}
                        maxLength={2000}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                  )}
                  {r.purchaseMethod === "" && (
                    <p className="self-center text-xs text-gray-400 sm:col-span-2 lg:col-span-3">
                      Pilih Vendor atau Link dulu.
                    </p>
                  )}
                  <div>
                    <label className={labelClass}>Harga Final / Unit</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={r.finalPrice}
                      onChange={(e) => update(it.id, { finalPrice: e.target.value })}
                      className={`${inputClass} ${itemOver ? "border-orange-300" : ""}`}
                    />
                    <p className={`mt-1 text-xs ${itemOver ? "text-orange-600" : "text-gray-400"}`}>
                      Subtotal {formatRupiah(sub)}
                      {itemOver && " · di atas estimasi"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 border-t border-gray-100 px-5 py-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Perkiraan Barang Datang</label>
            <input
              type="date"
              value={estimatedArrival}
              onChange={(e) => setEstimatedArrival(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quotation / Penawaran (opsional)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (!f) return;
                if (!ALLOWED_FILES.includes(f.type)) return setError("Quotation harus PDF, JPG, atau PNG");
                if (f.size > 5 * 1024 * 1024) return setError("Ukuran quotation maksimal 5 MB");
                setFile(f);
              }}
            />
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <FileText size={16} className="shrink-0 text-blue-600" />
                  <span className="truncate">{file.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Hapus file"
                  className="text-gray-400 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-300 hover:bg-gray-50"
              >
                <UploadCloud size={16} />
                {detail.quotationName ? `Ganti (${detail.quotationName})` : "Upload PDF / JPG / PNG"}
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-gray-500">
              Total estimasi <b className="text-gray-800">{formatRupiah(detail.totalEstimate)}</b>
            </span>
            <span className={overBudget ? "text-orange-600" : "text-gray-700"}>
              Total final{" "}
              <b>{allPriced ? formatRupiah(totalFinal) : "belum lengkap"}</b>
              {overBudget && ` (+${formatRupiah(totalFinal - detail.totalEstimate)})`}
            </span>
          </div>
          {overBudget && (
            <div className="mt-3">
              <label className={`${labelClass} text-orange-700`}>
                <AlertTriangle size={12} className="mr-1 inline" />
                Catatan selisih harga untuk Finance (wajib)
              </label>
              <textarea
                value={varianceNote}
                onChange={(e) => setVarianceNote(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Contoh: Harga laptop naik dari estimasi karena stok model lama habis"
                className={`${inputClass} border-orange-300`}
              />
            </div>
          )}
          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}
          {savedAt && <p className="mt-3 text-xs text-green-700">Draft tersimpan pukul {savedAt}.</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving !== null}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              <Save size={16} /> {saving === "draft" ? "Menyimpan..." : "Simpan Draft"}
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {saving === "submit" ? "Memproses..." : "Selesai, Lanjut ke Payment"}
            </button>
          </div>
        </div>
      </div>

      {/* Kabari pemohon / batalkan */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <p className="text-sm font-semibold text-gray-900">Kabari Pemohon</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Kirim update progres (mis. &ldquo;barang masih dicari&rdquo;), atau batalkan pengajuan
          kalau barang tidak tersedia.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={1000}
          className={`${inputClass} mt-3`}
          placeholder="Tulis pesan untuk pemohon"
        />
        {msgError && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
            {msgError}
          </p>
        )}
        {msgInfo && <p className="mt-2 text-xs text-green-700">{msgInfo}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => sendMessage("note")}
            disabled={msgBusy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={15} /> {msgBusy === "note" ? "Mengirim..." : "Kirim Update"}
          </button>
          <button
            type="button"
            onClick={() => sendMessage("cancel")}
            disabled={msgBusy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
          >
            <Ban size={15} /> {msgBusy === "cancel" ? "Memproses..." : "Batalkan Pengajuan"}
          </button>
        </div>
      </div>
    </div>
  );
}

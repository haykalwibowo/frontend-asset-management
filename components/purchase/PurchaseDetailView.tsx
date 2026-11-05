"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Printer,
  FileText,
  Check,
  X,
  Clock,
  Minus,
  Circle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import {
  apiUrl,
  authHeaders,
  apiMessage,
  isUnauthorized,
  formatDateOnly,
  formatDateTime,
  formatRupiah,
  optionLabel,
  REQUIREMENT_TYPES,
  REQUIREMENT_ACTIONS,
  REQUIREMENT_SCOPES,
  STEP_LABEL,
  type FlowStep,
  type PurchaseDetail,
} from "@/lib/purchase";

const cardClass = "rounded-xl bg-white shadow-sm ring-1 ring-gray-200";

function StepIcon({ state }: { state: FlowStep["state"] }) {
  const base = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full";
  switch (state) {
    case "done":
      return (
        <span className={`${base} bg-green-500 text-white`}>
          <Check size={15} strokeWidth={3} />
        </span>
      );
    case "rejected":
      return (
        <span className={`${base} bg-red-500 text-white`}>
          <X size={15} strokeWidth={3} />
        </span>
      );
    case "current":
      return (
        <span className={`${base} bg-amber-100 text-amber-600 ring-2 ring-amber-400`}>
          <Clock size={15} strokeWidth={2.5} />
        </span>
      );
    case "skipped":
      return (
        <span className={`${base} bg-gray-100 text-gray-400`}>
          <Minus size={15} strokeWidth={3} />
        </span>
      );
    default:
      return (
        <span className={`${base} bg-white text-gray-300 ring-1 ring-gray-200`}>
          <Circle size={10} />
        </span>
      );
  }
}

function actorText(log: NonNullable<FlowStep["log"]>) {
  if (!log.actorName) return null;
  return log.onBehalfOfName ? `${log.actorName} a.n. ${log.onBehalfOfName}` : log.actorName;
}

function Timeline({ flow }: { flow: FlowStep[] }) {
  return (
    <ol className="relative">
      {flow.map((step, i) => {
        const muted = step.state === "upcoming" || step.state === "cancelled";
        const log = step.log;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {i < flow.length - 1 && (
              <span
                className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 ${
                  step.state === "done" ? "bg-green-300" : "bg-gray-200"
                }`}
              />
            )}
            <StepIcon state={step.state} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={`text-sm font-semibold ${muted ? "text-gray-400" : "text-gray-900"}`}>
                {step.label}
              </p>
              {step.state === "current" && (
                <p className="text-xs font-medium text-amber-700">
                  Menunggu {step.waitingFor ?? ""}
                </p>
              )}
              {step.state === "skipped" && (
                <p className="text-xs text-gray-500">{log?.note ?? "Dilewati"}</p>
              )}
              {step.state === "cancelled" && (
                <p className="text-xs text-gray-400">Tidak dilanjutkan</p>
              )}
              {log && (step.state === "done" || step.state === "rejected") && (
                <div className="mt-0.5 text-xs text-gray-500">
                  {actorText(log) && (
                    <p>
                      {step.state === "rejected" ? "Ditolak oleh " : ""}
                      <span className="font-medium text-gray-700">{actorText(log)}</span>
                      {log.actorPosition ? ` · ${log.actorPosition}` : ""}
                    </p>
                  )}
                  <p className="text-gray-400">{formatDateTime(log.createdAt)}</p>
                  {log.note && (
                    <p
                      className={`mt-1 rounded-md px-2 py-1.5 ${
                        step.state === "rejected"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      “{log.note}”
                    </p>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ActionPanel({
  detail,
  onDone,
}: {
  detail: PurchaseDetail;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const { step, onBehalfOf } = detail.permissions;

  const submit = async (action: "approve" | "reject") => {
    setError("");
    if (action === "reject" && !note.trim()) {
      setError("Isi catatan alasan penolakan dulu.");
      return;
    }
    const confirmText =
      action === "approve"
        ? `Approve pengajuan ${detail.docNumber}?`
        : `Tolak pengajuan ${detail.docNumber}? Penolakan bersifat final.`;
    if (!window.confirm(confirmText)) return;

    setSaving(action);
    try {
      await axios.post(
        `${apiUrl}/purchase-requests/${detail.id}/${action}`,
        { note: note.trim() || undefined },
        { headers: authHeaders() }
      );
      setNote("");
      onDone();
    } catch (err) {
      setError(apiMessage(err, "Gagal memproses pengajuan"));
      // data mungkin sudah berubah (diproses orang lain), muat ulang
      if (axios.isAxiosError(err) && err.response?.status === 409) onDone();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className={`${cardClass} border-l-4 border-amber-400 p-5`}>
      <p className="text-sm font-semibold text-gray-900">
        Menunggu keputusan Anda sebagai {STEP_LABEL[step ?? ""] ?? step}
      </p>
      {onBehalfOf && (
        <p className="mt-0.5 text-xs text-gray-500">
          Anda memproses atas nama (a.n.){" "}
          <span className="font-medium text-gray-700">{onBehalfOf.name}</span>
          {onBehalfOf.position ? ` · ${onBehalfOf.position}` : ""}
        </p>
      )}
      <label className="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        Catatan <span className="font-normal normal-case">(wajib kalau menolak)</span>
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Contoh: Disetujui, mohon diproses minggu ini"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => submit("approve")}
          disabled={saving !== null}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          {saving === "approve" ? "Memproses..." : "Approve"}
        </button>
        <button
          onClick={() => submit("reject")}
          disabled={saving !== null}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
        >
          <XCircle size={16} />
          {saving === "reject" ? "Memproses..." : "Tolak"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-0.5 text-sm text-gray-900">{children}</div>
    </div>
  );
}

export default function PurchaseDetailView({
  id,
  backHref,
  backLabel,
}: {
  id: string;
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    axios
      .get(`${apiUrl}/purchase-requests/${id}`, { headers: authHeaders() })
      .then((res) => {
        setDetail(res.data);
        setError("");
      })
      .catch((err) => {
        if (isUnauthorized(err)) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError(apiMessage(err, "Gagal memuat pengajuan"));
      });
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <p className="text-sm text-red-600">{error}</p>
        <Link href={backHref} className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          {backLabel}
        </Link>
      </div>
    );
  }

  if (!detail) return <p className="text-sm text-gray-500">Memuat...</p>;

  const r = detail.requester;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={14} /> {backLabel}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              {detail.docNumber}
            </h2>
            <StatusBadge status={detail.status} label={detail.statusLabel} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Diajukan {formatDateTime(detail.createdAt)} oleh {r.name}
          </p>
        </div>
        <a
          href={`/cetak/pengadaan/${detail.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <Printer size={16} /> Cetak / PDF
        </a>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Info pengajuan */}
          <div className={`${cardClass} p-5`}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Requirement Type">
                {optionLabel(REQUIREMENT_TYPES, detail.requirementType)}
              </Field>
              <Field label="Jenis">
                {optionLabel(REQUIREMENT_ACTIONS, detail.requirementAction)}
              </Field>
              <Field label="Lingkup">
                {optionLabel(REQUIREMENT_SCOPES, detail.requirementScope)}
              </Field>
              <Field label="Due Date">{formatDateOnly(detail.dueDate)}</Field>
              <Field label="Date Form">{formatDateOnly(detail.createdAt)}</Field>
              <Field label="Dokumen Pendukung">
                {detail.attachmentPath ? (
                  <a
                    href={`${apiUrl}/uploads/${detail.attachmentPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <FileText size={14} />
                    <span className="truncate">{detail.attachmentName ?? "Lihat dokumen"}</span>
                  </a>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </Field>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <Field label="Purpose">
                <p className="whitespace-pre-line">{detail.purpose}</p>
              </Field>
            </div>
          </div>

          {/* Pemohon */}
          <div className={`${cardClass} p-5`}>
            <p className="mb-3 text-sm font-semibold text-gray-900">Data Pemohon</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nama">{r.name}</Field>
              <Field label="Jabatan">{r.position ?? "-"}</Field>
              <Field label="Departemen">{r.department ?? "-"}</Field>
              <Field label="Email">{r.email ?? "-"}</Field>
              <Field label="Telepon">{r.phone ?? "-"}</Field>
              <Field label="Approver Atasan">
                {detail.supervisorApprover?.name ?? (
                  <span className="text-gray-400">Tidak ada (dilewati)</span>
                )}
              </Field>
            </div>
          </div>

          {/* Barang */}
          <div className={`${cardClass} overflow-hidden`}>
            <p className="px-5 pt-5 text-sm font-semibold text-gray-900">
              Product / Service Specification
            </p>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full text-left text-sm">
                <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-12 px-5 py-3">No.</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3 text-right">Estimasi Harga</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-5 py-3 text-gray-500">{it.lineNo}</td>
                      <td className="px-5 py-3 text-gray-900">{it.description}</td>
                      <td className="px-5 py-3 text-right">{it.quantity}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        {formatRupiah(it.estimatedPrice)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-medium">
                        {formatRupiah(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-5 py-3 text-right font-semibold text-gray-700">
                      Total
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-gray-900">
                      {formatRupiah(detail.totalEstimate)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {detail.note && (
              <div className="border-t border-gray-100 px-5 py-4">
                <Field label="Catatan">
                  <p className="whitespace-pre-line">{detail.note}</p>
                </Field>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {detail.permissions.canAct && <ActionPanel detail={detail} onDone={load} />}
          <div className={`${cardClass} p-5`}>
            <p className="mb-4 text-sm font-semibold text-gray-900">Progress</p>
            <Timeline flow={detail.flow} />
          </div>
        </div>
      </div>
    </div>
  );
}

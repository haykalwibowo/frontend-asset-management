"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Printer } from "lucide-react";
import {
  apiUrl,
  authHeaders,
  apiMessage,
  formatDateOnly,
  formatDateTime,
  formatRupiah,
  REQUIREMENT_TYPES,
  REQUIREMENT_ACTIONS,
  REQUIREMENT_SCOPES,
  type FlowStep,
  type PurchaseDetail,
} from "@/lib/purchase";

// Nama perusahaan di kop dokumen (opsional), mis. NEXT_PUBLIC_COMPANY_NAME="PT Contoh"
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "";

const cell = "border border-black px-2 py-1";

function CheckList({
  options,
  value,
}: {
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      {options.map((o) => (
        <div key={o.value} className="flex items-center gap-2">
          <span
            className={`inline-block h-3.5 w-8 border border-black ${
              o.value === value ? "bg-black" : ""
            }`}
          />
          <span>{o.label}</span>
        </div>
      ))}
    </div>
  );
}

// Kotak tanda tangan -> approval digital
function SignBox({ title, step }: { title: string; step: FlowStep | undefined }) {
  const log = step?.log;
  let stamp: React.ReactNode;
  switch (step?.state) {
    case "done":
      stamp = <span className="text-green-700">✓ {step.key === "SUBMIT" ? "Diajukan" : "Disetujui"} secara digital</span>;
      break;
    case "rejected":
      stamp = <span className="font-bold text-red-700">✗ DITOLAK</span>;
      break;
    case "skipped":
      stamp = <span className="text-gray-500">— Dilewati</span>;
      break;
    case "current":
      stamp = <span className="text-gray-500">Menunggu</span>;
      break;
    default:
      stamp = <span className="text-gray-400">-</span>;
  }
  const name = log?.actorName
    ? log.onBehalfOfName
      ? `${log.actorName} a.n. ${log.onBehalfOfName}`
      : log.actorName
    : null;
  const position = log?.onBehalfOfName ? log.onBehalfOfPosition : log?.actorPosition;

  return (
    <div className="flex flex-col">
      <p className="font-bold">{title}</p>
      <div className="flex h-16 items-center text-xs">{stamp}</div>
      <table className="text-xs">
        <tbody>
          <tr>
            <td className="w-16 align-top">Nama</td>
            <td className="align-top">: {name ?? ""}</td>
          </tr>
          <tr>
            <td className="align-top">Position</td>
            <td className="align-top">: {position ?? ""}</td>
          </tr>
          <tr>
            <td className="align-top">Date</td>
            <td className="align-top">: {log && step?.state !== "skipped" ? formatDateTime(log.createdAt) : ""}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function PrintPurchaseRequest({ id }: { id: string }) {
  const [d, setD] = useState<PurchaseDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${apiUrl}/purchase-requests/${id}`, { headers: authHeaders() })
      .then((res) => setD(res.data))
      .catch((err) => setError(apiMessage(err, "Gagal memuat dokumen. Pastikan sudah login.")));
  }, [id]);

  useEffect(() => {
    if (d) document.title = `${d.docNumber} - Formulir Pengadaan`;
  }, [d]);

  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (!d) return <p className="p-8 text-sm text-gray-500">Memuat...</p>;

  const step = (key: string) => d.flow.find((f) => f.key === key);
  const notes = d.logs.filter((l) => l.note && l.action !== "SKIPPED");

  return (
    <div className="min-h-screen bg-gray-200 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <Printer size={16} /> Cetak / Simpan PDF
        </button>
      </div>

      <div className="mx-auto max-w-[210mm] bg-white p-[12mm] text-[12px] leading-snug text-black shadow print:max-w-none print:p-0 print:shadow-none">
        {/* Kop */}
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={`${cell} w-1/4 text-center font-bold`} rowSpan={2}>
                FORMULIR
                {COMPANY && <p className="mt-2 font-semibold tracking-widest">{COMPANY}</p>}
              </td>
              <td className={`${cell} text-center`} colSpan={2}>
                <p className="font-bold">INTERNAL</p>
                <p className="italic">Akses Dibatasi Hanya Untuk Internal</p>
              </td>
            </tr>
            <tr>
              <td className={`${cell} text-center font-bold`}>PERMINTAAN PENGADAAN</td>
              <td className="w-[38%] p-0 align-top">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className={`${cell} font-bold`}>No. Dokumen</td>
                      <td className={cell}>{d.docNumber}</td>
                    </tr>
                    <tr>
                      <td className={`${cell} font-bold`}>Due Date</td>
                      <td className={cell}>{formatDateOnly(d.dueDate)}</td>
                    </tr>
                    <tr>
                      <td className={`${cell} font-bold`}>Date Form</td>
                      <td className={cell}>{formatDateOnly(d.createdAt)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Requirement type */}
        <p className="mb-1 mt-4 font-bold">Requirement Type</p>
        <div className="flex gap-12">
          <CheckList options={REQUIREMENT_TYPES} value={d.requirementType} />
          <CheckList options={REQUIREMENT_ACTIONS} value={d.requirementAction} />
          <CheckList options={REQUIREMENT_SCOPES} value={d.requirementScope} />
        </div>

        {/* Requestor */}
        <div className="mt-4 flex items-start justify-between gap-6">
          <div className="w-[55%]">
            <p className="mb-1 font-bold">Requestor Fields</p>
            <table className="w-full border-collapse">
              <tbody>
                {[
                  ["Name", d.requester.name],
                  ["Position", d.requester.position],
                  ["Department", d.requester.department],
                  ["Email", d.requester.email],
                  ["Phone", d.requester.phone],
                  ["Purpose", d.purpose],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className={`${cell} w-28 font-bold`}>{k}</td>
                    <td className={`${cell} whitespace-pre-line`}>{v ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 w-[40%] border border-black p-2 text-center">
            Setiap permintaan pengadaan wajib dilengkapi dengan Deskripsi Request, jumlah
            kebutuhan, estimasi biaya, alasan pengadaan, dan opsional dokumen pendukung
            (quotation/vendor) agar proses evaluasi, persetujuan, dan pembelian dapat dilakukan
            sesuai.
          </div>
        </div>

        {/* Items */}
        <p className="mb-1 mt-4 font-bold">Product/Service Specification</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-center font-bold">
              <td className={`${cell} w-10`}>No.</td>
              <td className={cell}>Description</td>
              <td className={`${cell} w-16`}>Quantity</td>
              <td className={`${cell} w-28`}>Estimation Price</td>
              <td className={`${cell} w-28`}>Subtotal</td>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it) => (
              <tr key={it.id}>
                <td className={`${cell} text-center`}>{it.lineNo}</td>
                <td className={cell}>{it.description}</td>
                <td className={`${cell} text-center`}>{it.quantity}</td>
                <td className={`${cell} text-right`}>{formatRupiah(it.estimatedPrice)}</td>
                <td className={`${cell} text-right`}>{formatRupiah(it.subtotal)}</td>
              </tr>
            ))}
            <tr>
              <td className={`${cell} font-bold`} colSpan={4}>
                Total
              </td>
              <td className={`${cell} text-right font-bold`}>{formatRupiah(d.totalEstimate)}</td>
            </tr>
            <tr>
              <td className={`${cell} h-20 align-top`} colSpan={5}>
                <span className="font-bold">Catatan :</span>
                {d.note && <p className="whitespace-pre-line">{d.note}</p>}
                {notes.map((l) => (
                  <p key={l.id}>
                    [{l.action === "REJECTED" ? "Ditolak" : "Catatan"} {l.actorName}
                    {l.onBehalfOfName ? ` a.n. ${l.onBehalfOfName}` : ""}] {l.note}
                  </p>
                ))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Approval */}
        <div className="mt-6 grid grid-cols-4 gap-4 break-inside-avoid">
          <SignBox title="Requested By" step={step("SUBMIT")} />
          <SignBox title="Acknowledge By" step={step("SUPERVISOR")} />
          <SignBox title="Acknowledge By" step={step("GA")} />
          <SignBox title="Verified By" step={step("FINANCE")} />
        </div>

        <p className="mt-8 border-t border-gray-300 pt-2 text-[10px] text-gray-500">
          Dokumen ini dibuat oleh sistem Asset Management. Persetujuan tercatat secara digital
          (pengganti tanda tangan basah). Status saat dicetak: {d.statusLabel}. Dicetak{" "}
          {formatDateTime(new Date().toISOString())}.
        </p>
      </div>
    </div>
  );
}

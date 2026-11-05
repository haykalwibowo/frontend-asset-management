import axios from "axios";

// ===== Tipe data dari API /purchase-requests =====

export interface PurchaseSummary {
  id: string;
  docNumber: string | null;
  createdAt: string;
  dueDate: string;
  requesterName: string;
  requesterDepartment: string | null;
  purpose: string;
  totalEstimate: number;
  itemCount: number;
  status: string;
  statusLabel: string;
  // hanya ada di scope "processed": keputusan terakhir user yang login
  myAction?: PurchaseLog | null;
}

export interface PurchaseLog {
  id: string;
  step: string;
  action: "SUBMITTED" | "APPROVED" | "REJECTED" | "SKIPPED";
  actorName: string | null;
  actorPosition: string | null;
  onBehalfOfName: string | null;
  onBehalfOfPosition: string | null;
  note: string | null;
  createdAt: string;
}

export type FlowState = "done" | "skipped" | "rejected" | "current" | "upcoming" | "cancelled";

export interface FlowStep {
  key: string;
  label: string;
  state: FlowState;
  waitingFor: string | null;
  log: PurchaseLog | null;
}

export interface PurchaseDetail {
  id: string;
  docNumber: string | null;
  createdAt: string;
  dueDate: string;
  requester: {
    id: string;
    name: string;
    position: string | null;
    department: string | null;
    email: string | null;
    phone: string | null;
  };
  requirementType: string;
  requirementAction: string;
  requirementScope: string;
  purpose: string;
  note: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  totalEstimate: number;
  status: string;
  statusLabel: string;
  supervisorApprover: { id: string; name: string; position: string | null } | null;
  items: {
    id: string;
    lineNo: number;
    description: string;
    quantity: number;
    estimatedPrice: number;
    subtotal: number;
  }[];
  logs: PurchaseLog[];
  flow: FlowStep[];
  permissions: {
    canAct: boolean;
    step: string | null;
    onBehalfOf: { name: string; position: string | null } | null;
  };
}

// ===== Label =====

export const REQUIREMENT_TYPES = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "ticket", label: "Ticket" },
  { value: "material", label: "Material" },
  { value: "other", label: "Other" },
];

export const REQUIREMENT_ACTIONS = [
  { value: "new", label: "New" },
  { value: "upgrade", label: "Upgrade" },
  { value: "downgrade", label: "Downgrade" },
  { value: "additional", label: "Additional" },
];

export const REQUIREMENT_SCOPES = [
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
];

export const optionLabel = (list: { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value;

export const STEP_LABEL: Record<string, string> = {
  SUPERVISOR: "Atasan",
  GA: "GA",
  FINANCE: "Finance",
};

export type Tone = "amber" | "blue" | "green" | "red" | "gray";

export const statusTone = (status: string): Tone => {
  if (status === "REJECTED") return "red";
  if (status === "COMPLETED") return "green";
  if (status.startsWith("PENDING_")) return "amber";
  return "blue";
};

// ===== Format =====

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
export const formatRupiah = (n: number) => rupiah.format(n);

// Tanggal "YYYY-MM-DD" (kolom date) -> "5 Oktober 2026". Dibaca sebagai UTC supaya tidak bergeser.
export const formatDateOnly = (value: string) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Tanggal hari ini (lokal) dalam format input date
export const todayInput = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ===== API helper =====

export const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const authHeaders = () => ({
  Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
});

export const apiMessage = (err: unknown, fallback: string): string =>
  (axios.isAxiosError(err) && err.response?.data?.message) || fallback;

export const isUnauthorized = (err: unknown) =>
  axios.isAxiosError(err) && err.response?.status === 401;

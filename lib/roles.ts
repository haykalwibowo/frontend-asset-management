// Harus sama dengan backend: src/roles.ts
export const ROLE_LABELS: Record<string, string> = {
  admin: "Super Admin",
  staff: "Staff",
  finance: "Finance",
  ga: "General Affair",
  procurement: "Procurement",
};

// Urutan pilihan role di form akun
export const ROLE_OPTIONS = ["staff", "finance", "ga", "procurement", "admin"] as const;

export const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

export const isAdmin = (role?: string | null) => role === "admin";

// Halaman awal setelah login sesuai role
export const homePathFor = (role?: string | null) =>
  isAdmin(role) ? "/dashboard" : "/staff";

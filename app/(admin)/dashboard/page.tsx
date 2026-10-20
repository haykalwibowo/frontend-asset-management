"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Boxes,
  Layers,
  ArrowRightLeft,
  Hourglass,
  History,
  BarChart3,
  ChevronRight,
  X,
  type LucideIcon,
} from "lucide-react";

interface RecentHistoryItem {
  id: string;
  employeeName: string;
  assetName: string;
  quantity: number;
  assignedAt: string;
  returnedAt: string | null;
}

interface ActiveBorrowItem {
  id: string;
  employeeName: string;
  department: string | null;
  assetName: string;
  quantity: number;
  assignedAt: string;
}

interface DashboardStats {
  totalAssets: number;
  totalStock: number;
  totalBorrowed: number;
  pendingRequests: number;
  perCategory: { name: string; count: number }[];
  recentHistory: RecentHistoryItem[];
  activeBorrows?: ActiveBorrowItem[];
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tint: string; // kelas warna latar + ikon
  hint: string;
}

function StatCardBody({ label, value, icon: Icon, tint, hint }: StatCardProps) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}
        >
          <Icon size={22} strokeWidth={1.8} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-gray-400 transition group-hover:text-blue-600">
        {hint}
        <ChevronRight
          size={14}
          className="transition group-hover:translate-x-0.5"
        />
      </div>
    </>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showBorrowed, setShowBorrowed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const loadDashboardData = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStats(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const openBorrowed = () => {
    setShowBorrowed(true);
    requestAnimationFrame(() => setDrawerVisible(true));
  };

  const closeBorrowed = () => {
    setDrawerVisible(false);
    setTimeout(() => setShowBorrowed(false), 300);
  };

  useEffect(() => {
    if (!showBorrowed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBorrowed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showBorrowed]);

  const cardClass =
    "group block w-full rounded-xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-blue-300";

  const panelClass = "rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200";

  const activeBorrows = stats?.activeBorrows ?? [];

  // kategori diurutkan dari yang terbanyak
  const categoryData = stats
    ? [...stats.perCategory].sort((a, b) => b.count - a.count)
    : [];
  const categoryTotal = categoryData.reduce((sum, c) => sum + c.count, 0);
  const maxCount = categoryData.length > 0 ? categoryData[0].count : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Ringkasan aset, peminjaman, dan permintaan terbaru.
        </p>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/assets" className={cardClass}>
            <StatCardBody
              label="Total Aset"
              value={stats.totalAssets}
              icon={Boxes}
              tint="bg-blue-50 text-blue-600"
              hint="Lihat daftar aset"
            />
          </Link>

          <Link href="/inventory" className={cardClass}>
            <StatCardBody
              label="Total Stok"
              value={stats.totalStock}
              icon={Layers}
              tint="bg-indigo-50 text-indigo-600"
              hint="Lihat inventaris"
            />
          </Link>

          <button type="button" onClick={openBorrowed} className={cardClass}>
            <StatCardBody
              label="Sedang Dipinjam"
              value={stats.totalBorrowed}
              icon={ArrowRightLeft}
              tint="bg-amber-50 text-amber-600"
              hint="Lihat peminjam"
            />
          </button>

          <Link href="/requests" className={cardClass}>
            <StatCardBody
              label="Request Pending"
              value={stats.pendingRequests}
              icon={Hourglass}
              tint="bg-rose-50 text-rose-600"
              hint="Proses request"
            />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* History peminjaman */}
        <div className={`${panelClass} lg:col-span-2`}>
          <div className="mb-4 flex items-center gap-2">
            <History size={18} className="text-gray-400" strokeWidth={1.8} />
            <h3 className="font-semibold text-gray-900">History Peminjaman</h3>
          </div>

          {(!stats || stats.recentHistory.length === 0) && (
            <p className="py-8 text-center text-sm text-gray-400">
              Belum ada history peminjaman.
            </p>
          )}

          {stats && stats.recentHistory.length > 0 && (
            <div className="max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
              {stats.recentHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex gap-3 rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                    {getInitials(h.employeeName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {h.employeeName}
                      </p>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                          h.returnedAt
                            ? "bg-green-50 text-green-700 ring-green-600/20"
                            : "bg-amber-50 text-amber-700 ring-amber-600/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            h.returnedAt ? "bg-green-500" : "bg-amber-500"
                          }`}
                        />
                        {h.returnedAt ? "Dikembalikan" : "Dipinjam"}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-600">
                      {h.assetName} &middot; {h.quantity} unit
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      Dipinjam {formatDateTime(h.assignedAt)}
                    </p>
                    {h.returnedAt && (
                      <p className="text-[11px] text-gray-400">
                        Kembali {formatDateTime(h.returnedAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aset per kategori */}
        {stats && categoryData.length > 0 && (
          <div className={`${panelClass} lg:col-span-3`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3
                  size={18}
                  className="text-gray-400"
                  strokeWidth={1.8}
                />
                <h3 className="font-semibold text-gray-900">
                  Jumlah Aset per Kategori
                </h3>
              </div>
              <p className="text-xs text-gray-400">
                {categoryTotal} aset &middot; {categoryData.length} kategori
              </p>
            </div>

            <div className="max-h-[340px] space-y-5 overflow-y-auto pr-1">
              {categoryData.map((c) => (
                <div key={c.name}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      {c.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-gray-900">
                      {c.count}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: `${
                          maxCount > 0
                            ? Math.max((c.count / maxCount) * 100, 3)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawer: Sedang Dipinjam */}
      {showBorrowed && (
        <div className="fixed inset-0 z-50">
          <div
            onClick={closeBorrowed}
            className={`absolute inset-0 bg-gray-900/40 transition-opacity duration-300 ${
              drawerVisible ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
              drawerVisible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Dashboard
                </p>
                <h3 className="text-xl font-bold text-gray-900">
                  Sedang Dipinjam
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeBorrows.length} peminjaman aktif
                </p>
              </div>
              <button
                onClick={closeBorrowed}
                aria-label="Tutup"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
              {activeBorrows.length === 0 ? (
                <p className="mt-10 text-center text-sm text-gray-500">
                  Tidak ada aset yang sedang dipinjam.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeBorrows.map((b) => (
                    <div
                      key={b.id}
                      className="flex gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-semibold text-amber-700">
                        {getInitials(b.employeeName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {b.employeeName}
                          {b.department && (
                            <span className="ml-1 font-normal text-gray-400">
                              ({b.department})
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-700">
                          {b.assetName} &middot; {b.quantity} unit
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Dipinjam {formatDateTime(b.assignedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
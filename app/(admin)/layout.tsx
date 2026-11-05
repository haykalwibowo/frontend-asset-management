"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { isAdmin, roleLabel } from "@/lib/roles";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  Warehouse,
  Tags,
  MapPin,
  Users,
  Building2,
  ShoppingCart,
  UserCheck,
  LogOut,
  type LucideIcon,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface NavItem {
  href: string;
  title: string;
  icon: LucideIcon;
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Utama",
    items: [
      { href: "/dashboard", title: "Dashboard", icon: LayoutDashboard },
      { href: "/assets", title: "Daftar Aset", icon: Boxes },
      { href: "/requests", title: "Request Aset", icon: ClipboardList },
      { href: "/inventory", title: "Inventaris", icon: Warehouse },
    ],
  },
  {
    label: "Pengadaan",
    items: [
      { href: "/purchase-requests", title: "Pengadaan Aset", icon: ShoppingCart },
      { href: "/delegations", title: "Delegasi Approval", icon: UserCheck },
    ],
  },
  {
    label: "Master Data",
    items: [
      { href: "/categories", title: "Master Category", icon: Tags },
      { href: "/locations", title: "Master Location", icon: MapPin },
      { href: "/departments", title: "Master Department", icon: Building2 },
      { href: "/employees", title: "Master Employee", icon: Users },
    ],
  },
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(userData);
    if (!isAdmin(parsed.role)) {
      router.push("/staff");
      return;
    }

    setUser(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadPending = () => {
      const token = localStorage.getItem("token");
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/requests`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const pending = res.data.filter((r: any) => r.status === "pending");
          setPendingCount(pending.length);
        })
        .catch(() => {});
    };

    loadPending();
    const interval = setInterval(loadPending, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-gray-200 bg-white">
        {/* Brand (selebar sidebar) */}
        <div className="flex h-full w-64 shrink-0 items-center gap-3 border-r border-gray-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Boxes size={20} strokeWidth={2} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">Asset Management</p>
            <p className="text-[11px] text-gray-400">Sistem Inventaris</p>
          </div>
        </div>

        {/* Sisi kanan */}
        <div className="flex flex-1 items-center justify-end gap-3 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {getInitials(user.name)}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-400">
                {roleLabel(user.role)}
              </p>
            </div>
          </div>

          <span className="mx-1 h-6 w-px bg-gray-200" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut size={16} strokeWidth={1.8} />
            Logout
          </button>
        </div>
      </header>

      {/* Sidebar permanen */}
      <aside className="fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r border-gray-200 bg-white">
        <nav className="flex flex-col gap-6 px-3 py-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
                      )}
                      <Icon
                        size={18}
                        strokeWidth={active ? 2.2 : 1.8}
                        className={active ? "text-blue-600" : "text-gray-400"}
                      />
                      <span className="flex-1">{item.title}</span>
                      {item.href === "/requests" && pendingCount > 0 && (
                        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Konten halaman */}
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)]">{children}</main>
    </div>
  );
}
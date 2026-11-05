"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  Boxes,
  LogOut,
  ArrowRightLeft,
  ShoppingCart,
  ClipboardCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { isAdmin, roleLabel } from "@/lib/roles";
import { apiUrl, authHeaders } from "@/lib/purchase";

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
  badge?: "inbox";
}

const navItems: NavItem[] = [
  { href: "/staff", title: "Peminjaman Aset", icon: ArrowRightLeft },
  { href: "/pengadaan", title: "Pengadaan Aset", icon: ShoppingCart },
  { href: "/pengadaan/inbox", title: "Perlu Tindakan", icon: ClipboardCheck, badge: "inbox" },
  { href: "/delegasi", title: "Delegasi", icon: UserCheck },
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Layout portal karyawan: semua role selain Super Admin
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/login");
      return;
    }
    const parsed: UserData = JSON.parse(userData);
    if (isAdmin(parsed.role)) {
      router.push("/dashboard");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(parsed);
  }, [router]);

  // Badge "Perlu Tindakan", diperbarui berkala
  useEffect(() => {
    if (!user) return;
    const load = () =>
      axios
        .get(`${apiUrl}/purchase-requests/counts`, { headers: authHeaders() })
        .then((res) => setInboxCount(res.data.inbox))
        .catch((err) => {
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            localStorage.removeItem("token");
            router.push("/login");
          }
        });
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [user, router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Memuat...</p>
      </div>
    );
  }

  // Item paling spesifik yang cocok dengan URL yang aktif
  const activeHref = navItems
    .map((n) => n.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <Boxes size={22} strokeWidth={1.8} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">Asset Management</p>
              <p className="text-[11px] text-gray-400">Portal Karyawan</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                {getInitials(user.name)}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-[11px] text-gray-400">{roleLabel(user.role)}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {navItems.map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                {item.title}
                {item.badge === "inbox" && inboxCount > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                    {inboxCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  );
}

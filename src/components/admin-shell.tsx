"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Home,
  LayoutDashboard,
  MessageSquareText,
  Search,
  Settings,
  Tags,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { label: "Site home", icon: Home, href: "/" },
  { label: "Overview", icon: LayoutDashboard, href: "/admin" },
  { label: "Weekly planner", icon: CalendarDays, href: "/admin/schedule" },
  { label: "Reviews", icon: MessageSquareText, href: "/admin/reviews" },
  { label: "Food library", icon: ClipboardList, href: "/admin/food" },
  { label: "Tables & tags", icon: Tags, href: "/admin/tables" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#f8f6f7] text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink/8 bg-white p-5 lg:flex lg:flex-col">
        <div className="px-2 py-2">
          <BrandMark />
        </div>
        <nav className="mt-10 space-y-1" aria-label="Admin navigation">
          {navigation.map((item) => {
            const active =
              !item.href.includes("#") &&
              (item.href === "/" || item.href === "/admin"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition " +
                  (active
                    ? "bg-moss text-white"
                    : "text-ink/55 hover:bg-cream hover:text-ink")
                }
              >
                <item.icon size={19} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-cream p-4">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-moss">Pilot workspace</p>
          <p className="mt-2 text-sm font-bold">Kingsway College</p>
          <p className="mt-1 text-xs text-ink/45">Main cafeteria</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-ink/8 bg-white/85 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-5 sm:px-8 lg:px-10">
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <div className="hidden items-center gap-2 text-sm font-semibold text-ink/55 lg:flex">
              Kingsway College
              <ChevronDown size={15} />
            </div>
            <div className="flex items-center gap-3">
              <button
                className="grid h-10 w-10 place-items-center rounded-full border border-ink/8 bg-white text-ink/55"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
              <button
                className="relative grid h-10 w-10 place-items-center rounded-full border border-ink/8 bg-white text-ink/55"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-tomato" />
              </button>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-sun text-sm font-bold">AK</div>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-5 pb-3 lg:hidden" aria-label="Mobile admin navigation">
            {navigation.slice(0, 6).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="shrink-0 rounded-full border border-ink/8 bg-white px-3 py-2 text-xs font-bold"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}

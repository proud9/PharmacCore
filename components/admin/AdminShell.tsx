"use client";

import { usePathname } from "next/navigation";
import { BookOpen, Building2, CreditCard, Inbox, LayoutDashboard, LogOut, Megaphone, ScrollText } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/demo-requests", label: "Demo requests", icon: Inbox },
  { href: "/admin/activity", label: "Team activity", icon: ScrollText },
  { href: "/admin/guide", label: "Guide", icon: BookOpen },
];

/** The Parallax team's frame. No business data is reachable from here. */
export function AdminShell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  const active = NAV.filter((item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <SidebarLayout subtitle="Team" items={NAV} activeHref={active}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pine-900/10 bg-white/70 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs text-pine-700/70">Parallax team</p>
          <p>{name}</p>
        </div>
        <button onClick={logout} className="btn btn-ghost">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>
      <main className="px-6 py-6">{children}</main>
    </SidebarLayout>
  );
}

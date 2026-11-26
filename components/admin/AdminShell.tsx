"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Inbox, LayoutDashboard, LogOut, Megaphone, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/demo-requests", label: "Demo requests", icon: Inbox },
  { href: "/admin/activity", label: "Team activity", icon: ScrollText },
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
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-pine-950 text-parchment lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1">
            <img src="/brand/parallax-logo-96.png" alt="" width={32} height={32} className="h-8 w-8" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-none">Parallax</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-sage-300">Team</p>
          </div>
        </div>
        <nav aria-label="Main" className="space-y-0.5 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  item.href === active ? "bg-white/10 text-white" : "text-sage-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pine-900/10 bg-white/70 px-6 py-4">
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
      </div>
    </div>
  );
}

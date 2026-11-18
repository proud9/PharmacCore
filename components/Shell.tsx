"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Pill,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  BarChart3,
  Stethoscope,
  ScrollText,
  Warehouse,
  Building2,
  PackagePlus,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderSearch } from "@/components/search/HeaderSearch";

const COLLAPSE_KEY = "pharmacore:sidebar-collapsed";

const RETAIL_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/pos", label: "Sales counter", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/stock-take", label: "Stock take", icon: ClipboardCheck },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/purchases", label: "Purchases", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/staff", label: "Staff", icon: Stethoscope },
  { href: "/audit", label: "Activity log", icon: ScrollText },
  { href: "/settings", label: "Pharmacy details", icon: Settings },
];

const WHOLESALE_NAV = [
  { href: "/wholesale", label: "Wholesale orders", icon: Warehouse },
  { href: "/wholesale/accounts", label: "Buyers", icon: Building2 },
];

const WHOLESALE_ADMIN_NAV = [
  { href: "/wholesale", label: "Wholesale orders", icon: Warehouse },
  { href: "/wholesale/accounts", label: "Buyers", icon: Building2 },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/audit", label: "Activity log", icon: ScrollText },
  { href: "/settings", label: "Pharmacy details", icon: Settings },
];

const BUYER_NAV = [
  { href: "/portal", label: "My orders", icon: Warehouse },
  { href: "/portal/new", label: "New order", icon: PackagePlus },
];

function navFor(role: string) {
  if (role === "BUYER") return BUYER_NAV;
  if (role === "WHOLESALE_ADMIN") return WHOLESALE_ADMIN_NAV;
  if (role === "ADMIN") return [...WHOLESALE_NAV, ...RETAIL_NAV];
  return RETAIL_NAV;
}

export function Shell({
  children,
  name,
  role,
  roleCode,
  pharmacy,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  roleCode: string;
  pharmacy: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = navFor(roleCode);
  // Desktop: collapsed to an icon rail (remembered per browser). Mobile: menu opens as a drawer.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Preference is a convenience only.
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage being unavailable.
      }
      return next;
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      className={cn(
        "min-h-screen lg:grid lg:transition-[grid-template-columns] lg:duration-200",
        collapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[260px_1fr]",
      )}
    >
      <aside className="bg-pine-950 text-parchment lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div
          className={cn(
            "flex items-center gap-3 border-b border-white/10 py-4 lg:py-5",
            collapsed ? "px-5 lg:justify-center lg:px-0" : "px-5",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brass text-pine-950">
            <Pill className="h-5 w-5" />
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="font-display text-lg leading-none">Pharmacy</p>
            <p className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-sage-300">{pharmacy}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-sage-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="side-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <nav
          id="side-menu"
          aria-label="Main"
          className={cn("space-y-0.5 p-3 lg:block lg:flex-1 lg:overflow-y-auto", mobileOpen ? "block" : "hidden")}
        >
          {nav.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/portal" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  collapsed && "lg:justify-center lg:px-0 lg:py-2.5",
                  active ? "bg-white/10 text-white" : "text-sage-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(collapsed && "lg:sr-only")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/10 p-3 lg:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sage-300 transition hover:bg-white/5 hover:text-white",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {collapsed ? null : <span>Collapse menu</span>}
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pine-900/10 bg-white/70 px-6 py-4 backdrop-blur">
          <div className="min-w-[160px]">
            <p className="text-xs text-pine-700/70">{roleCode === "BUYER" ? "Buyer portal" : "Staff"}</p>
            <p className="font-medium">
              {name} · {role}
            </p>
          </div>
          <div className="min-w-[220px] flex-1">
            <HeaderSearch />
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

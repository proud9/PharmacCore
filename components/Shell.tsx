"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
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
  Inbox,
  Wallet,
  Factory,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderSearch } from "@/components/search/HeaderSearch";

const COLLAPSE_KEY = "pharmacore:sidebar-collapsed";

type NavItem = { href: string; label: string; icon: typeof Boxes };

const HOME: NavItem = { href: "/dashboard", label: "Home", icon: LayoutDashboard };
const ORDERS: NavItem = { href: "/wholesale", label: "Wholesale orders", icon: Warehouse };
const PAYMENTS: NavItem = { href: "/wholesale/payments", label: "Payments", icon: Wallet };
const BUYERS: NavItem = { href: "/wholesale/accounts", label: "Buyers", icon: Building2 };
const POS: NavItem = { href: "/pos", label: "Sales counter", icon: ShoppingCart };
const INVENTORY: NavItem = { href: "/inventory", label: "Inventory", icon: Boxes };
const STOCK_TAKE: NavItem = { href: "/stock-take", label: "Stock take", icon: ClipboardCheck };
const PATIENTS: NavItem = { href: "/patients", label: "Patients", icon: Users };
const PRESCRIPTIONS: NavItem = { href: "/prescriptions", label: "Prescriptions", icon: FileText };
const SALES: NavItem = { href: "/sales", label: "Sales", icon: Receipt };
const PURCHASES: NavItem = { href: "/purchases", label: "Purchases", icon: Truck };
const REPORTS: NavItem = { href: "/reports", label: "Reports", icon: BarChart3 };
const MAKERS: NavItem = { href: "/purchases/manufacturers", label: "Manufacturers", icon: Factory };
const STAFF: NavItem = { href: "/staff", label: "Staff", icon: Stethoscope };
const AUDIT: NavItem = { href: "/audit", label: "Activity log", icon: ScrollText };
const COMPANY: NavItem = { href: "/settings", label: "Company details", icon: Settings };
const DEMOS: NavItem = { href: "/demo-requests", label: "Demo requests", icon: Inbox };

/** Sidebar per role. Page and API guards in lib/auth.ts are what actually enforce access. */
const NAV: Record<string, NavItem[]> = {
  ADMIN: [HOME, ORDERS, PAYMENTS, BUYERS, POS, INVENTORY, STOCK_TAKE, PATIENTS, PRESCRIPTIONS, SALES, PURCHASES, MAKERS, REPORTS, STAFF, AUDIT, COMPANY, DEMOS],
  FINANCE: [PAYMENTS, ORDERS, HOME, SALES, PURCHASES, MAKERS, REPORTS, INVENTORY, AUDIT, COMPANY],
  SALES: [ORDERS, HOME, BUYERS, POS, INVENTORY, STOCK_TAKE, PATIENTS, PRESCRIPTIONS, SALES, PURCHASES, MAKERS, AUDIT],
  BUYER: [
    { href: "/portal", label: "My orders", icon: Warehouse },
    { href: "/portal/new", label: "New order", icon: PackagePlus },
  ],
  MANUFACTURER: [{ href: "/supplier", label: "Orders", icon: Truck }],
};

function navFor(role: string) {
  return NAV[role] ?? [];
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
  const nav = navFor(roleCode);
  // The longest matching link wins, so /wholesale/payments doesn't also light up /wholesale.
  const activeHref = nav
    .filter((item) => pathname === item.href || (item.href !== "/portal" && pathname.startsWith(`${item.href}/`)))
    .sort((x, y) => y.href.length - x.href.length)[0]?.href;
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
    // A full load on purpose: it empties the client page cache, so the next person to sign in on
    // this computer never sees the previous user's pages.
    window.location.assign("/login");
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1">
            <img src="/brand/parallax-logo-96.png" alt="" width={32} height={32} className="h-8 w-8" />
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="font-display text-lg font-semibold leading-none">Parallax</p>
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
            const active = item.href === activeHref;
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
            <p>
              {name} · {role}
            </p>
          </div>
          <div className="min-w-[220px] flex-1">
            <HeaderSearch
              placeholder={
                roleCode === "BUYER"
                  ? "Search orders, wholesalers…"
                  : roleCode === "FINANCE"
                    ? "Search orders, invoices, products…"
                    : "Search products, patients, orders…"
              }
            />
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

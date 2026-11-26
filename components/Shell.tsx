"use client";

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
  BookOpen,
  CreditCard,
  ScrollText,
  Building2,
  Bell,
  Search,
  PackagePlus,
  Inbox,
  Wallet,
  Factory,
} from "lucide-react";
import type { Capability } from "@/lib/capabilities";
import { format } from "date-fns";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import { SidebarLayout } from "@/components/SidebarLayout";

type NavItem = { href: string; label: string; icon: typeof Boxes; cap?: Capability | Capability[]; notCap?: Capability };

const HOME: NavItem = { href: "/dashboard", label: "Home", icon: LayoutDashboard };
const ORDERS: NavItem = { href: "/orders", label: "Orders", icon: Inbox, cap: "sell" };
const PURCHASES: NavItem = { href: "/purchases", label: "Purchases", icon: Truck, cap: "buy" };
const PAYMENTS: NavItem = { href: "/payments", label: "Payments", icon: Wallet, cap: ["sell", "buy"] };
const CUSTOMERS: NavItem = { href: "/customers", label: "Customers", icon: Building2, cap: "sell" };
const SUPPLIERS: NavItem = { href: "/suppliers", label: "Suppliers", icon: Factory, cap: "buy" };
const DIRECTORY: NavItem = { href: "/directory", label: "Find businesses", icon: Search };
const ITEMS: NavItem = { href: "/items", label: "Items", icon: PackagePlus, cap: "catalog", notCap: "inventory" };
const INVENTORY: NavItem = { href: "/inventory", label: "Inventory", icon: Boxes, cap: "inventory" };
const STOCK_TAKE: NavItem = { href: "/stock-take", label: "Stock take", icon: ClipboardCheck, cap: "inventory" };
const POS: NavItem = { href: "/pos", label: "Sales counter", icon: ShoppingCart, cap: "counter" };
const SALES: NavItem = { href: "/sales", label: "Counter sales", icon: Receipt, cap: "counter" };
const PATIENTS: NavItem = { href: "/patients", label: "Patients", icon: Users, cap: "counter" };
const PRESCRIPTIONS: NavItem = { href: "/prescriptions", label: "Prescriptions", icon: FileText, cap: "counter" };
const REPORTS: NavItem = { href: "/reports", label: "Reports", icon: BarChart3, cap: "counter" };
const AUDIT: NavItem = { href: "/audit", label: "Activity log", icon: ScrollText };
const COMPANY: NavItem = { href: "/settings", label: "Business details", icon: Settings };
const BILLING: NavItem = { href: "/billing", label: "Billing", icon: CreditCard, cap: "billing" };
const GUIDE: NavItem = { href: "/guide", label: "Guide", icon: BookOpen };

/** The sidebar, filtered by what this business can do. Page and API guards (lib/tenant.ts) enforce it. */
const NAV: NavItem[] = [
  HOME,
  ORDERS,
  PURCHASES,
  PAYMENTS,
  CUSTOMERS,
  SUPPLIERS,
  DIRECTORY,
  ITEMS,
  INVENTORY,
  STOCK_TAKE,
  POS,
  SALES,
  PATIENTS,
  PRESCRIPTIONS,
  REPORTS,
  AUDIT,
  BILLING,
  COMPANY,
  GUIDE,
];

function navFor(caps: Capability[]) {
  return NAV.filter((item) => {
    const needed = item.cap === undefined ? [] : Array.isArray(item.cap) ? item.cap : [item.cap];
    if (needed.length && !needed.some((cap) => caps.includes(cap))) return false;
    if (item.notCap && caps.includes(item.notCap)) return false;
    return true;
  });
}

type SubscriptionBanner = { state: string; daysLeft: number | null; readOnlyOn: string | null };

export function Shell({
  children,
  name,
  orgName,
  kindLabel,
  caps,
  unread,
  subscription,
}: {
  children: React.ReactNode;
  name: string;
  orgName: string;
  kindLabel: string;
  caps: Capability[];
  unread: number;
  subscription: SubscriptionBanner;
}) {
  const pathname = usePathname();
  const nav = navFor(caps);
  // The longest matching link wins.
  const activeHref = nav
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((x, y) => y.href.length - x.href.length)[0]?.href;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // A full load on purpose: it empties the client page cache, so the next person to sign in on
    // this computer never sees the previous user's pages.
    window.location.assign("/login");
  }

  return (
    <SidebarLayout subtitle={orgName} items={nav} activeHref={activeHref}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pine-900/10 bg-white/70 px-6 py-4 backdrop-blur">
        <div className="min-w-[160px]">
          <p className="text-xs text-pine-700/70">{kindLabel}</p>
          <p>
            {name} · {orgName}
          </p>
        </div>
        <div className="min-w-[220px] flex-1">
          <HeaderSearch placeholder={caps.includes("counter") ? "Search items, patients, orders…" : "Search items, orders, documents…"} />
        </div>
        <Link
          href="/notifications"
          className="relative rounded-xl p-2 text-pine-800 transition hover:bg-pine-900/5"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unread ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-rust px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Link>
        <button onClick={logout} className="btn btn-ghost">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>
      <SubscriptionNotice subscription={subscription} />
      <main className="px-6 py-6">{children}</main>
    </SidebarLayout>
  );
}

/** Trial, payment-due and read-only reminders. Clients (free) and paid-up accounts see nothing. */
function SubscriptionNotice({ subscription }: { subscription: SubscriptionBanner }) {
  const { state, daysLeft, readOnlyOn } = subscription;
  if (state === "READ_ONLY") {
    return (
      <div role="status" className="border-b border-rust/20 bg-rust/10 px-6 py-3 text-sm text-rust">
        Your Parallax subscription has lapsed, so this account is read-only: you can view and download, but not create or
        change anything. <Link href="/billing" className="font-semibold underline underline-offset-2">See billing</Link> to renew.
      </div>
    );
  }
  if (state === "GRACE") {
    return (
      <div role="status" className="border-b border-brass/30 bg-brass/10 px-6 py-3 text-sm text-pine-900">
        Your Parallax subscription payment is due. The account becomes read-only
        {readOnlyOn ? ` on ${format(new Date(readOnlyOn), "dd MMM yyyy")}` : " soon"}. <Link href="/billing" className="font-semibold underline underline-offset-2">See billing</Link>.
      </div>
    );
  }
  if (state === "TRIAL" && daysLeft !== null && daysLeft <= 7) {
    return (
      <div role="status" className="border-b border-pine-900/10 bg-sage-100 px-6 py-2 text-sm text-pine-800">
        Your free trial ends in {daysLeft} {daysLeft === 1 ? "day" : "days"}. <Link href="/billing" className="font-semibold underline underline-offset-2">See billing</Link> to subscribe.
      </div>
    );
  }
  return null;
}

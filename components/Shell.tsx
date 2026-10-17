"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Command", icon: LayoutDashboard },
  { href: "/pos", label: "Dispense desk", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/stock-take", label: "Stock take", icon: ClipboardCheck },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/sales", label: "Sales ledger", icon: Receipt },
  { href: "/purchases", label: "Purchasing", icon: Truck },
  { href: "/reports", label: "Statistics", icon: BarChart3 },
  { href: "/staff", label: "Staff", icon: Stethoscope },
  { href: "/audit", label: "Audit trail", icon: ScrollText },
  { href: "/settings", label: "Pharmacy", icon: Settings },
];

export function Shell({
  children,
  name,
  role,
  pharmacy,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  pharmacy: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-pine-950 text-parchment">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass text-pine-950">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg leading-none">PharmaCore</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-sage-300">{pharmacy}</p>
          </div>
        </div>
        <nav className="space-y-0.5 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  active ? "bg-white/10 text-white" : "text-sage-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-pine-900/10 bg-white/70 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-pine-700/70">Signed in remotely</p>
            <p className="font-medium">
              {name} · {role.replace("_", " ")}
            </p>
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

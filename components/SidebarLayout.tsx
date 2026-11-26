"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "pharmacore:sidebar-collapsed";

export type SideItem = { href: string; label: string; icon: LucideIcon };

/**
 * The dark sidebar + content column shared by the business Shell and the team's AdminShell.
 * On lg+ it collapses to a 72px icon rail (remembered per browser). Padding never changes between
 * the two states, so icons and the logo stay exactly where they are and only the labels fade:
 * rail centre 36px = nav p-3 (12) + link px-4 (16) + half an icon (8) = header px-4 (16) + half the logo tile (20).
 * Below lg the sidebar is a top bar whose menu opens as a drawer and closes on navigation.
 */
export function SidebarLayout({
  subtitle,
  items,
  activeHref,
  children,
}: {
  subtitle: string;
  items: SideItem[];
  activeHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
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

  // Labels stay in the DOM (they name the links for screen readers) and fade out on the rail.
  const fade = cn("whitespace-nowrap transition-opacity duration-200", collapsed && "lg:pointer-events-none lg:opacity-0");

  return (
    <div
      className={cn(
        "min-h-screen lg:grid lg:transition-[grid-template-columns] lg:duration-200",
        collapsed ? "lg:grid-cols-[72px_1fr]" : "lg:grid-cols-[260px_1fr]",
      )}
    >
      <aside className="bg-pine-950 text-parchment lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4 lg:py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1">
            <img src="/brand/parallax-logo-96.png" alt="" width={32} height={32} className="h-8 w-8" />
          </div>
          <div className={cn("min-w-0 flex-1", fade)}>
            <p className="font-display text-lg font-semibold leading-none">Parallax</p>
            <p className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-sage-300">{subtitle}</p>
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
          className={cn(
            "space-y-0.5 p-3 lg:block lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden",
            mobileOpen ? "block" : "hidden",
          )}
        >
          {items.map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 overflow-hidden rounded-xl px-4 py-2 text-sm transition-colors",
                  active ? "bg-white/10 text-white" : "text-sage-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={fade}>{item.label}</span>
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
            className="flex w-full items-center gap-3 overflow-hidden rounded-xl px-4 py-2 text-sm text-sage-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className={fade} aria-hidden="true">
              Collapse menu
            </span>
          </button>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

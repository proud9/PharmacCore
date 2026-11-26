"use client";

import {
  Archive,
  BadgeCheck,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Hourglass,
  Lock,
  PackageCheck,
  PackageOpen,
  Pill,
  Receipt,
  RefreshCw,
  ShoppingBasket,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayToggle } from "./PlayToggle";
import { useCycle } from "./useCycle";

/** Icons a station may use (names, so server components can pass them). */
const ICONS = {
  archive: Archive,
  badge: BadgeCheck,
  boxes: Boxes,
  calendar: CalendarClock,
  check: ClipboardCheck,
  list: ClipboardList,
  card: CreditCard,
  file: FileText,
  hourglass: Hourglass,
  lock: Lock,
  packageCheck: PackageCheck,
  packageOpen: PackageOpen,
  pill: Pill,
  receipt: Receipt,
  refresh: RefreshCw,
  basket: ShoppingBasket,
  truck: Truck,
  user: UserRound,
} satisfies Record<string, LucideIcon>;

export type StationIcon = keyof typeof ICONS;
export type Station = { title: string; text: string; icon: StationIcon; tone?: "good" | "warn" | "bad" };

const TONE = {
  good: "bg-dispensary text-white border-dispensary",
  warn: "bg-brass text-pine-950 border-brass",
  bad: "bg-rust text-white border-rust",
};

/**
 * A short process drawn as stations on a track. A marker travels from station to station and the
 * panel below explains the current one. Click a station to stop on it.
 */
export function FlowStrip({ label, stations }: { label: string; stations: Station[] }) {
  const { index, choose, playing, reduced, toggle, hover } = useCycle(stations.length, 2800);
  const current = stations[index];
  const span = stations.length - 1 || 1;

  return (
    <figure className="my-6 rounded-2xl border border-rule bg-shelf/60 p-4 sm:p-5" {...hover}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <figcaption className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine-700/80">{label}</figcaption>
        <PlayToggle playing={playing} reduced={reduced} onToggle={toggle} />
      </div>

      {/* Wide screens: stations on a horizontal track */}
      <div className="relative hidden md:block">
        <div className="absolute left-[calc(50%/var(--n))] right-[calc(50%/var(--n))] top-5 h-0.5 bg-rule" style={{ ["--n" as string]: stations.length }}>
          <div
            className="h-full bg-pine-700 transition-[width] duration-700 ease-out"
            style={{ width: `${(index / span) * 100}%` }}
          />
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dispensary shadow-[0_0_0_4px_rgba(18,140,94,0.18)] transition-[left] duration-700 ease-out"
            style={{ left: `${(index / span) * 100}%` }}
            aria-hidden="true"
          />
        </div>
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${stations.length}, minmax(0, 1fr))` }}>
          {stations.map((station, i) => {
            const Icon = ICONS[station.icon];
            const active = i === index;
            const done = i < index;
            return (
              <li key={station.title} className="flex flex-col items-center px-1 text-center">
                <button
                  type="button"
                  onClick={() => choose(i)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition duration-300",
                    active
                      ? cn(station.tone ? TONE[station.tone] : "border-pine-800 bg-pine-800 text-white", "scale-110 shadow-panel")
                      : done
                        ? "border-pine-700 bg-white text-pine-700"
                        : "border-rule bg-white text-foil hover:border-pine-700/50",
                  )}
                  aria-label={station.title}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className={cn("mt-2 text-xs font-semibold leading-tight transition-colors", active ? "text-pine-900" : "text-ink/60")}>
                  {station.title}
                </span>
              </li>
            );
          })}
        </ol>
        <p key={index} className="guide-fade mt-4 min-h-[3rem] rounded-xl bg-white px-4 py-3 text-sm text-ink shadow-sm" aria-live="polite">
          <span className="font-semibold text-pine-900">{current.title}.</span> {current.text}
        </p>
      </div>

      {/* Narrow screens: a vertical list */}
      <ol className="space-y-2 md:hidden">
        {stations.map((station, i) => {
          const Icon = ICONS[station.icon];
          const active = i === index;
          return (
            <li key={station.title}>
              <button
                type="button"
                onClick={() => choose(i)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                  active ? "border-pine-700/40 bg-white shadow-sm" : "border-transparent",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                    active ? (station.tone ? TONE[station.tone] : "border-pine-800 bg-pine-800 text-white") : "border-rule bg-white text-foil",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm">
                  <span className="font-semibold text-pine-900">{station.title}</span>
                  {active || reduced ? <span className="mt-0.5 block text-ink/80">{station.text}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

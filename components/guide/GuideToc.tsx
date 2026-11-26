"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** The guide's table of contents. Highlights the section being read. */
export function GuideToc({ items }: { items: { id: string; title: string }[] }) {
  const [current, setCurrent] = useState(items[0]?.id);

  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting);
        const first = items.find((item) => seen.get(item.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Guide contents" className="sticky top-6">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-pine-700/70">In this guide</p>
      <ol className="space-y-0.5 border-l border-rule">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={current === item.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l-2 py-1.5 pl-3 text-sm transition-colors",
                current === item.id
                  ? "border-dispensary font-semibold text-pine-900"
                  : "border-transparent text-ink/65 hover:border-pine-700/30 hover:text-pine-900",
              )}
            >
              <span className="mr-1.5 tabular-nums text-foil">{i + 1}.</span>
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

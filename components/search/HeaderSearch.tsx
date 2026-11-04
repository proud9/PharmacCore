"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "./SearchInput";

type Hit = { href: string; title: string; detail: string; group: string };

export function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) return;
      const data = await response.json();
      setHits(data.hits ?? []);
      setOpen(true);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-lg">
      <SearchInput value={query} onChange={setQuery} placeholder="Search products, patients, orders…" />
      {open && query.trim().length >= 2 ? (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-pine-900/10 bg-white py-1 shadow-panel">
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink/60">No results for “{query.trim()}”.</p>
          ) : (
            hits.map((hit) => (
              <button
                key={`${hit.group}-${hit.href}-${hit.title}`}
                type="button"
                onClick={() => go(hit.href)}
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-sage-100/80"
              >
                <span className="text-[10px] uppercase tracking-wide text-pine-700/70">{hit.group}</span>
                <span className="text-sm font-medium">{hit.title}</span>
                <span className="text-xs text-ink/60">{hit.detail}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { SearchInput } from "./SearchInput";

export function SearchScope({
  placeholder,
  children,
}: {
  placeholder: string;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [empty, setEmpty] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const needle = query.trim().toLowerCase();
    const targets = [...root.querySelectorAll<HTMLElement>("[data-search]")];
    let visible = 0;
    for (const el of targets) {
      const match = !needle || (el.dataset.search ?? "").includes(needle);
      el.hidden = !match;
      if (match) visible += 1;
    }
    setEmpty(targets.length > 0 && visible === 0);
  }, [query]);

  return (
    <div>
      <div className="mb-3 max-w-md">
        <SearchInput value={query} onChange={setQuery} placeholder={placeholder} />
      </div>
      <div ref={rootRef}>{children}</div>
      {empty ? <p className="px-3 py-6 text-center text-sm text-ink/60">No matching records.</p> : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export type LookupKind = "products" | "patients" | "businesses";

/**
 * Fetches matches as the user types (debounced): items and patients from /api/lookup, businesses
 * (Parallax team only) from /api/admin/businesses. `params` adds filters such as
 * `{ rx: "1" }`. Call `reload()` after a change that alters the results, e.g. stock after a sale.
 */
export function useLookup<T>(
  kind: LookupKind,
  query: string,
  params: Record<string, string> = {},
  enabled = true,
) {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const paramKey = JSON.stringify(params);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const q = query.trim();
    setLoading(true);
    const timer = setTimeout(
      async () => {
        try {
          const url =
            kind === "businesses"
              ? `/api/admin/businesses?${new URLSearchParams({ q })}`
              : `/api/lookup?${new URLSearchParams({ kind, q, ...JSON.parse(paramKey) })}`;
          const response = await fetch(url, { signal: controller.signal });
          const data = await response.json();
          if (response.ok) setResults(data.results ?? []);
        } catch {
          // Aborted or offline: keep the last results.
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      q ? 200 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, query, paramKey, enabled, version]);

  return { results, loading, reload: () => setVersion((v) => v + 1) };
}

"use client";

import { useEffect, useState } from "react";

/**
 * Fetches matches from /api/lookup as the user types (debounced). `params` adds filters such as
 * `{ rx: "1" }`. Call `reload()` after a change that alters the results, e.g. stock after a sale.
 */
export function useLookup<T>(
  kind: "products" | "patients",
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
          const search = new URLSearchParams({ kind, q, ...JSON.parse(paramKey) });
          const response = await fetch(`/api/lookup?${search}`, { signal: controller.signal });
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

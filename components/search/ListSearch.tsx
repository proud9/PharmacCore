"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "./SearchInput";

/**
 * Search box for server-paged lists: typing updates `?q=` in the address bar (after a short
 * pause) and goes back to page 1; the page then loads only the matching rows.
 * `param` lets one page have more than one (e.g. `?type=`).
 */
export function ListSearch({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(param) ?? "");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set(param, value.trim());
      else next.delete(param);
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <SearchInput value={value} onChange={setValue} placeholder={placeholder} />;
}

/** A select that sets one URL parameter (e.g. type=OTC) and returns to page 1. */
export function ListFilter({
  param,
  label,
  options,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? "";
  return (
    <select
      aria-label={label}
      value={current}
      onChange={(event) => {
        const next = new URLSearchParams(params.toString());
        if (event.target.value) next.set(param, event.target.value);
        else next.delete(param);
        next.delete("page");
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

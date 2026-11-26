"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLookup, type LookupKind } from "./useLookup";

export type Picked = { id: string; name: string; detail?: string };

/**
 * A searchable picker that replaces a long <select>: shows the chosen record's name, and on focus
 * searches the server as you type. `emptyLabel` adds a first option that clears the choice
 * (e.g. "Walk-in"). Arrow keys move, Enter picks.
 */
export function LookupPicker<T extends Picked>({
  kind,
  value,
  onChange,
  params,
  placeholder = "Type to search…",
  emptyLabel,
  id,
  describe,
}: {
  kind: LookupKind;
  value: T | null;
  onChange: (value: T | null) => void;
  params?: Record<string, string>;
  placeholder?: string;
  emptyLabel?: string;
  id?: string;
  describe?: (item: T) => string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { results, loading } = useLookup<T>(kind, query, params, open);
  const options: (T | null)[] = emptyLabel ? [null, ...results] : results;

  function pick(item: T | null) {
    onChange(item);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        value={open ? query : (value?.name ?? (emptyLabel ?? ""))}
        placeholder={value ? value.name : placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setActive(0);
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (options.length) pick(options[Math.min(active, options.length - 1)]);
          } else if (e.key === "Escape") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {open ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-pine-900/10 bg-white py-1 shadow-panel"
        >
          {options.map((item, index) => (
            <li
              key={item?.id ?? "__empty"}
              role="option"
              aria-selected={index === active}
              // mousedown, not click, so the pick lands before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn("cursor-pointer px-3 py-2 text-sm", index === active && "bg-sage-100")}
            >
              {item ? (
                <>
                  <span>{item.name}</span>
                  {(describe?.(item) ?? item.detail) ? (
                    <span className="ml-2 text-xs text-ink/55">{describe?.(item) ?? item.detail}</span>
                  ) : null}
                </>
              ) : (
                <span className="text-ink/70">{emptyLabel}</span>
              )}
            </li>
          ))}
          {!loading && results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink/55">{query ? "No matches." : "Nothing to show."}</li>
          ) : null}
          {loading && results.length === 0 ? <li className="px-3 py-2 text-sm text-ink/55">Searching…</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

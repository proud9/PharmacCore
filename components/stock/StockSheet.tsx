"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import type { DrugType } from "@/lib/stocksheet";
import { cn, money } from "@/lib/utils";

export type SheetRow = {
  id: string;
  sku: string;
  categoryNo: string | null;
  name: string;
  type: DrugType;
  unit: string;
  price: number;
  openQty: number;
  expiryLabel: string | null;
  expired: boolean;
};

const DRAFT_KEY = "pharmacore:stock-sheet-draft";

/**
 * The stock take count, laid out like the pharmacy's Excel stock sheet.
 * Open qty is current stock; close qty is the count. Sold = open − close; amount = sold × price.
 * Close quantities are kept as a draft in this browser until the sheet is finished.
 * Items are added and edited in Inventory, not here.
 */
export function StockSheet({ rows, canEdit }: { rows: SheetRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | DrugType>("ALL");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        setCounts(saved.counts ?? {});
        setNotes(saved.notes ?? "");
      }
    } catch {
      // Draft is a convenience only.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ counts, notes }));
    } catch {
      // Ignore storage being unavailable.
    }
  }, [counts, notes]);

  function closeOf(row: SheetRow) {
    const value = counts[row.id];
    return value === undefined || value === "" ? row.openQty : Number(value);
  }

  const lines = rows.map((row, index) => {
    const close = closeOf(row);
    const sold = row.openQty - close;
    return { row, index: index + 1, close, sold, amount: sold * row.price };
  });
  const needle = query.trim().toLowerCase();
  const visible = lines.filter(
    ({ row }) =>
      (typeFilter === "ALL" || row.type === typeFilter) &&
      (!needle || `${row.sku} ${row.name} ${row.categoryNo ?? ""}`.toLowerCase().includes(needle)),
  );
  const total = visible.reduce((sum, line) => sum + line.amount, 0);
  const counted = rows.filter((row) => counts[row.id] !== undefined && counts[row.id] !== "").length;

  async function finish() {
    setMessage("");
    if (!confirm("Finish this stock take? Stock for every item will be set to its close qty.")) return;
    const response = await fetch("/api/stock-take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        applyAdjustments: true,
        items: lines.map(({ row, close }) => ({ productId: row.id, countedQty: close })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not finish the stock take");
      return;
    }
    setCounts({});
    setNotes("");
    setMessage(`Stock take saved: ${data.reference}`);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-pine-900">Stock sheet</h2>
          <p className="text-sm text-ink/70">
            {rows.length} items · {counted} counted
          </p>
        </div>
        <p className="text-sm text-ink/60">
          New items, deliveries and stock corrections are entered in{" "}
          <Link href="/inventory" className="font-medium text-pine-700 underline-offset-2 hover:underline">
            Inventory
          </Link>
          .
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_1fr]">
        <div>
          <label htmlFor="sheet-search">Search</label>
          <input
            id="sheet-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Code, description, or category no."
          />
        </div>
        <div>
          <label htmlFor="sheet-type">Type</label>
          <select id="sheet-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "ALL" | DrugType)}>
            <option value="ALL">All</option>
            <option value="OTC">OTC</option>
            <option value="DDA">DDA</option>
          </select>
        </div>
        <div>
          <label htmlFor="sheet-notes">Notes</label>
          <input id="sheet-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Month-end count" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="table-grid min-w-[1100px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Stock code</th>
              <th>Ctg no.</th>
              <th>Description</th>
              <th>Type</th>
              <th>Unit sale</th>
              <th className="text-right">Price</th>
              <th className="text-right">Open qty</th>
              <th>Close qty</th>
              <th className="text-right">Sold</th>
              <th className="text-right">Amount</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ row, index, close, sold, amount }) => (
              <tr key={row.id}>
                <td className="text-ink/50">{index}</td>
                <td className="whitespace-nowrap font-mono text-xs">{row.sku}</td>
                <td>{row.categoryNo ?? "—"}</td>
                <td>{row.name}</td>
                <td>
                  <Badge tone={row.type === "DDA" ? "bad" : "neutral"}>{row.type}</Badge>
                </td>
                <td>{row.unit}</td>
                <td className="text-right tabular-nums">{money(row.price)}</td>
                <td className="text-right tabular-nums">{row.openQty}</td>
                <td>
                  {canEdit ? (
                    <input
                      className="w-24"
                      type="number"
                      min={0}
                      aria-label={`Close qty for ${row.name}`}
                      value={counts[row.id] ?? String(row.openQty)}
                      onChange={(e) => setCounts((current) => ({ ...current, [row.id]: e.target.value }))}
                    />
                  ) : (
                    close
                  )}
                </td>
                <td className={cn("text-right tabular-nums", sold < 0 && "font-semibold text-rust")}>{sold}</td>
                <td className={cn("text-right tabular-nums", amount < 0 && "text-rust")}>{money(amount)}</td>
                <td className={cn("whitespace-nowrap", row.expired && "font-semibold text-rust")}>
                  {row.expiryLabel ?? "—"}
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-6 text-center text-ink/60">
                  No items match. Items are added in Inventory.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={10} className="border-t border-pine-900/20 px-3 py-3 text-right font-semibold">
                Total
              </td>
              <td className="border-t border-pine-900/20 px-3 py-3 text-right font-display text-lg tabular-nums text-pine-900">
                {money(total)}
              </td>
              <td className="border-t border-pine-900/20" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink/60">
        Sold = open qty − close qty. A negative sold (in red) means more was counted than the system holds.
      </p>

      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      {canEdit ? (
        <button className="btn btn-primary mt-4" onClick={finish} disabled={rows.length === 0}>
          Finish stock take and set stock to close qty
        </button>
      ) : null}
    </section>
  );
}

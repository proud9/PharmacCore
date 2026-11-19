"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
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

/** A counted item, remembered across pages: its close qty plus what it needs for the totals. */
type Count = { close: string; open: number; price: number };

const DRAFT_KEY = "pharmacore:stock-sheet-draft";

function readDraft(): { counts: Record<string, Count>; notes: string } {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return { counts: {}, notes: "" };
    const counts: Record<string, Count> = {};
    for (const [id, value] of Object.entries(saved.counts ?? {})) {
      // Older drafts stored just the close qty; those can't be totalled, so start them fresh.
      if (value && typeof value === "object" && "close" in (value as object)) counts[id] = value as Count;
    }
    return { counts, notes: typeof saved.notes === "string" ? saved.notes : "" };
  } catch {
    return { counts: {}, notes: "" };
  }
}

/**
 * The stock take count, laid out like the pharmacy's Excel stock sheet, one page at a time.
 * Open qty is current stock; close qty is the count. Sold = open − close; amount = sold × price.
 * Counts are kept as a draft in this browser across pages until the sheet is finished; items
 * not counted keep their current stock. Items are added and edited in Inventory, not here.
 */
export function StockSheet({
  rows,
  canEdit,
  total,
  offset,
  pager,
}: {
  rows: SheetRow[];
  canEdit: boolean;
  total: number;
  offset: number;
  pager?: React.ReactNode;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, Count>>({});
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const draft = readDraft();
    setCounts(draft.counts);
    setNotes(draft.notes);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ counts, notes }));
    } catch {
      // Ignore storage being unavailable.
    }
  }, [counts, notes]);

  function setClose(row: SheetRow, value: string) {
    setCounts((current) => {
      const next = { ...current };
      if (value === "") delete next[row.id];
      else next[row.id] = { close: value, open: row.openQty, price: row.price };
      return next;
    });
  }

  const lines = rows.map((row, index) => {
    const entry = counts[row.id];
    const close = entry ? Number(entry.close) : row.openQty;
    const sold = row.openQty - close;
    return { row, index: offset + index + 1, close, sold, amount: sold * row.price };
  });
  const pageTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const countedEntries = Object.entries(counts);
  const countedAmount = countedEntries.reduce((sum, [, c]) => sum + (c.open - Number(c.close)) * c.price, 0);

  async function finish() {
    setMessage("");
    const confirmText =
      countedEntries.length === 0
        ? "Finish this stock take with nothing counted? Every item keeps its current stock."
        : `Finish this stock take? ${countedEntries.length} counted item(s) will be set to their close qty; all other items keep their current stock.`;
    if (!confirm(confirmText)) return;
    setFinishing(true);
    const response = await fetch("/api/stock-take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        applyAdjustments: true,
        items: countedEntries.map(([productId, c]) => ({ productId, countedQty: Number(c.close) })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setFinishing(false);
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
            {total.toLocaleString()} items · {countedEntries.length.toLocaleString()} counted · sold so far{" "}
            <span className="font-semibold text-pine-800">{money(countedAmount)}</span>
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
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-pine-700/80">Search</span>
          <ListSearch placeholder="Code, description, or category no." />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-pine-700/80">Type</span>
          <ListFilter
            param="type"
            label="Type"
            options={[
              { value: "", label: "All" },
              { value: "OTC", label: "OTC" },
              { value: "DDA", label: "DDA" },
            ]}
          />
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
            {lines.map(({ row, index, close, sold, amount }) => (
              <tr key={row.id} className={cn(counts[row.id] && "bg-dispensary-soft/40")}>
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
                      value={counts[row.id]?.close ?? String(row.openQty)}
                      onChange={(e) => setClose(row, e.target.value)}
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
            {lines.length === 0 ? (
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
                Total on this page
              </td>
              <td className="border-t border-pine-900/20 px-3 py-3 text-right font-display text-lg tabular-nums text-pine-900">
                {money(pageTotal)}
              </td>
              <td className="border-t border-pine-900/20" />
            </tr>
          </tfoot>
        </table>
      </div>
      {pager}
      <p className="mt-2 text-xs text-ink/60">
        Sold = open qty − close qty. A negative sold (in red) means more was counted than the system holds. Counted rows are
        tinted and remembered as you move between pages.
      </p>

      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      {canEdit ? (
        <button className="btn btn-primary mt-4" onClick={finish} disabled={total === 0 || finishing}>
          {finishing ? "Saving…" : "Finish stock take and set counted stock"}
        </button>
      ) : null}
    </section>
  );
}

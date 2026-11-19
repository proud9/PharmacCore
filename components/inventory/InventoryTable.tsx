"use client";

import { ChangeEvent, FormEvent, Fragment, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/Badge";
import { EditItemRow } from "@/components/inventory/EditItemRow";
import { DeleteItemDialog } from "@/components/inventory/DeleteItemDialog";
import { LineDefaults, SheetLineFields, readLineFields } from "@/components/inventory/SheetLineFields";
import type { DrugType } from "@/lib/stocksheet";
import { cn, money } from "@/lib/utils";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";

export type InventoryRow = {
  id: string;
  sku: string;
  categoryNo: string | null;
  /** Lot/batch number of the batch shown under Entered/Expiry (earliest expiry with stock). */
  batchNo: string | null;
  /** Other batches with stock besides the one shown. */
  otherBatches: number;
  name: string;
  type: DrugType;
  unit: string;
  price: number;
  requiresRx: boolean;
  onHand: number;
  reorderLevel: number;
  expiry: string | null;
  expiryLabel: string | null;
  /** Date the batch shown under Expiry was entered (received). */
  enteredLabel: string | null;
  /** yyyy-mm-dd of the same batch, for the edit form. */
  entered: string | null;
  expired: boolean;
  nearExpiry: boolean;
};

type ItemResult = { row: number; productId: string; status: "created" | "updated"; stockIgnored?: boolean };
type ItemError = { row: number; message: string };

const COLUMNS = 14;

/**
 * Inventory list in the stock sheet layout. This is where items are added (form or CSV)
 * and edited, including their current stock.
 */
export function InventoryTable({
  rows,
  canEdit,
  total,
  offset,
  pager,
}: {
  rows: InventoryRow[];
  canEdit: boolean;
  /** All matching items (the table shows one page of them). */
  total: number;
  /** Row number of the first row on this page, minus one. */
  offset: number;
  pager?: React.ReactNode;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ key: number; values: LineDefaults }>({ key: 0, values: {} });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importReport, setImportReport] = useState<{ summary: string; errors: ItemError[] } | null>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<InventoryRow | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const bySku = useMemo(() => new Map(rows.map((row) => [row.sku.toUpperCase(), row])), [rows]);
  // Search and type filtering happen on the server (URL ?q= and ?type=); rows is one page.
  const visible = rows;
  const columns = canEdit ? COLUMNS : COLUMNS - 1;

  async function sendItems(payload: { row: number; input: Record<string, unknown> }[]) {
    const response = await fetch("/api/inventory/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Could not save");
    return data as { results: ItemResult[]; errors: ItemError[] };
  }

  function prefillFromCode(code: string) {
    const match = bySku.get(code.toUpperCase());
    if (!match) return;
    setPrefill({
      key: prefill.key + 1,
      values: {
        stockCode: match.sku,
        categoryNo: match.categoryNo,
        description: match.name,
        type: match.type,
        unit: match.unit,
        price: match.price,
        requiresRx: match.requiresRx,
      },
    });
  }

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const { results, errors } = await sendItems([{ row: 1, input: readLineFields(new FormData(event.currentTarget)) }]);
      if (errors.length) {
        setFormError(errors[0].message);
        return;
      }
      const result = results[0];
      setMessage(
        result?.status === "created"
          ? "Item added."
          : result?.stockIgnored
            ? "Item details updated. Its stock wasn't changed; use the pencil to adjust stock."
            : "Item details updated.",
      );
      setPrefill({ key: prefill.key + 1, values: {} });
      setFormOpen(false);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportReport(null);
    setMessage("");
    setSaving(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/inventory/import", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      const { results, errors } = data as { results: ItemResult[]; errors: ItemError[] };
      const created = results.filter((r) => r.status === "created").length;
      const ignored = results.filter((r) => r.stockIgnored).length;
      setImportReport({
        summary: [
          `${file.name}: ${created} added, ${results.length - created} updated`,
          errors.length ? `, ${errors.length} need fixing` : "",
          ".",
          ignored ? ` Opening stock was ignored for ${ignored} existing item${ignored === 1 ? "" : "s"}.` : "",
        ].join(""),
        errors,
      });
      router.refresh();
    } catch (err) {
      setImportReport({ summary: err instanceof Error ? err.message : "Upload failed", errors: [] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-pine-900">Items</h2>
          <p className="text-sm text-ink/70">{total.toLocaleString()} items</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              onClick={() => {
                setFormOpen((open) => !open);
                setFormError("");
              }}
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
            <button className="btn btn-ghost" onClick={() => fileInput.current?.click()} disabled={saving}>
              <Upload className="h-4 w-4" />
              {saving ? "Uploading…" : "Upload sheet"}
            </button>
            <a className="btn btn-ghost" href="/api/inventory/template" download>
              <Download className="h-4 w-4" />
              Excel template
            </a>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={onUpload}
            />
          </div>
        ) : null}
      </div>

      {formOpen ? (
        <form onSubmit={onAdd} className="mt-4 rounded-xl border border-pine-900/10 bg-sage-100/40 p-4">
          <p className="mb-3 text-sm text-ink/70">
            An existing stock code updates that item&apos;s details. For a new item, opening stock needs an expiry.
          </p>
          <SheetLineFields key={prefill.key} mode="add" defaults={prefill.values} onStockCodeBlur={prefillFromCode} />
          {formError ? <p className="mt-2 text-sm text-rust">{formError}</p> : null}
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save item"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {importReport ? (
        <div className="mt-4 rounded-xl border border-pine-900/10 p-3 text-sm">
          <p>{importReport.summary}</p>
          {importReport.errors.length ? (
            <ul className="mt-2 space-y-0.5 text-rust">
              {importReport.errors.slice(0, 20).map((error) => (
                <li key={error.row}>
                  Row {error.row}: {error.message}
                </li>
              ))}
              {importReport.errors.length > 20 ? <li>…and {importReport.errors.length - 20} more.</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-pine-700/80">Search</span>
          <ListSearch placeholder="Code, description, category or batch no." />
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
      </div>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="table-grid min-w-[1360px]">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th className="min-w-[7rem] whitespace-nowrap">Stock code</th>
              <th className="min-w-[5rem] whitespace-nowrap">Ctg no.</th>
              <th className="min-w-[7rem] whitespace-nowrap">Batch no.</th>
              <th className="min-w-[16rem]">Description</th>
              <th className="min-w-[4.5rem]">Type</th>
              <th className="min-w-[6rem] whitespace-nowrap">Unit sale</th>
              <th className="min-w-[5.5rem] text-right">Price</th>
              <th className="min-w-[5.5rem] whitespace-nowrap text-right">On hand</th>
              <th className="min-w-[6.5rem]">Entered</th>
              <th className="min-w-[6.5rem]">Expiry</th>
              <th className="min-w-[8rem]" title="Prescription required">Prescription</th>
              <th className="min-w-[9rem]">Status</th>
              {canEdit ? <th className="sr-only !px-1">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <Fragment key={row.id}>
                {editingId === row.id ? (
                  <EditItemRow
                    row={row}
                    index={offset + index + 1}
                    colSpan={columns}
                    onDone={(saved) => {
                      setEditingId(null);
                      if (saved) setMessage(`${row.name} updated.`);
                    }}
                  />
                ) : (
                <tr>
                  <td className="text-ink/50">{offset + index + 1}</td>
                  <td className="whitespace-nowrap font-mono text-xs">{row.sku}</td>
                  <td className="whitespace-nowrap">{row.categoryNo ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    <span className="font-mono text-xs">{row.batchNo ?? "—"}</span>
                    {row.otherBatches > 0 ? (
                      <Link
                        href={`/inventory/${row.id}`}
                        className="ml-1.5 text-xs text-pine-700 hover:underline"
                        title="See all batches"
                      >
                        +{row.otherBatches} more
                      </Link>
                    ) : null}
                  </td>
                  <td>
                    <Link href={`/inventory/${row.id}`} className="hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td>
                    <Badge tone={row.type === "DDA" ? "bad" : "neutral"}>{row.type}</Badge>
                  </td>
                  <td className="whitespace-nowrap">{row.unit}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{money(row.price)}</td>
                  <td
                    className={cn(
                      "text-right tabular-nums",
                      row.onHand <= row.reorderLevel && "font-semibold text-rust",
                    )}
                  >
                    {row.onHand}
                  </td>
                  <td className="whitespace-nowrap">{row.enteredLabel ?? "—"}</td>
                  <td className={cn("whitespace-nowrap", row.expired && "font-semibold text-rust")}>
                    {row.expiryLabel ?? "—"}
                  </td>
                  <td className="whitespace-nowrap">
                    {row.requiresRx ? (
                      <Badge tone="brass">Required</Badge>
                    ) : (
                      <span className="text-ink/50">Not required</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 whitespace-nowrap">
                      {row.onHand <= row.reorderLevel ? <Badge tone="warn">Reorder</Badge> : null}
                      {row.expired ? (
                        <Badge tone="bad">Expired</Badge>
                      ) : row.nearExpiry ? (
                        <Badge tone="warn">Near expiry</Badge>
                      ) : null}
                    </div>
                  </td>
                  {canEdit ? (
                    <td className="whitespace-nowrap !px-1 text-right">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-pine-700 transition hover:bg-sage-100"
                        aria-label={`Edit ${row.name}`}
                        title="Edit item and current stock"
                        onClick={() => setEditingId((current) => (current === row.id ? null : row.id))}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-rust transition hover:bg-rust/10"
                        aria-label={`Delete ${row.name}`}
                        title="Delete item"
                        onClick={() => setDeleting(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  ) : null}
                </tr>
                )}
              </Fragment>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns} className="py-6 text-center text-ink/60">
                  No items match. Add an item or upload the Excel template.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pager}
      <DeleteItemDialog
        item={deleting}
        onClose={(deleted) => {
          if (deleted && deleting) setMessage(`${deleting.name} moved to the delete queue.`);
          setDeleting(null);
        }}
      />
    </section>
  );
}

"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/Badge";
import { readLineFields } from "@/components/inventory/SheetLineFields";
import type { InventoryRow } from "@/components/inventory/InventoryTable";
import { DRUG_TYPES, RX_OPTIONS } from "@/lib/stocksheet";

/** Compact inputs that fit inside a table cell. */
const cellInput = "h-8 rounded-md px-2 py-1 text-xs";

/**
 * Inline editor: the inventory row's cells become inputs in place, and a single row below
 * asks for the reason and saves. Batch no., Entered and Expiry apply to the batch shown
 * (earliest expiry with stock), or to the new batch when stock is added to an empty item.
 */
export function EditItemRow({
  row,
  index,
  colSpan,
  onDone,
}: {
  row: InventoryRow;
  index: number;
  colSpan: number;
  onDone: (saved: boolean) => void;
}) {
  const router = useRouter();
  const formId = `edit-${row.id}`;
  const firstInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    firstInput.current?.focus();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    // FormData includes the row's inputs, which join this form via their `form` attribute.
    const fields = readLineFields(new FormData(event.currentTarget));
    const response = await fetch(`/api/inventory/items/${row.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save this item");
      return;
    }
    onDone(true);
    router.refresh();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && !saving) onDone(false);
  }

  const field = (name: string, label: string) => ({ form: formId, name, "aria-label": `${label} for ${row.name}` });

  return (
    <>
      <tr className="bg-sage-100/50 [&>td]:py-2" onKeyDown={onKeyDown}>
        <td className="text-ink/50">{index}</td>
        <td>
          <input
            ref={firstInput}
            {...field("stockCode", "Stock code")}
            required
            defaultValue={row.sku}
            className={`${cellInput} font-mono`}
          />
        </td>
        <td>
          <input {...field("categoryNo", "Category no.")} defaultValue={row.categoryNo ?? ""} className={cellInput} />
        </td>
        <td>
          <input
            {...field("batchNo", "Batch no.")}
            defaultValue={row.batchNo ?? ""}
            placeholder={row.batchNo ? undefined : "New batch"}
            className={`${cellInput} font-mono`}
          />
        </td>
        <td>
          <input
            {...field("description", "Description")}
            required
            minLength={2}
            defaultValue={row.name}
            className={cellInput}
          />
        </td>
        <td>
          <select {...field("type", "Type")} defaultValue={row.type} className={`${cellInput} min-w-[5rem] pr-7`}>
            {DRUG_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </td>
        <td>
          <input {...field("unit", "Unit sale")} required defaultValue={row.unit} className={cellInput} />
        </td>
        <td>
          <input
            {...field("price", "Price")}
            type="number"
            step="any"
            min={0}
            required
            defaultValue={row.price}
            className={`${cellInput} text-right`}
          />
        </td>
        <td>
          <input
            {...field("currentStock", "Current stock")}
            type="number"
            min={0}
            step={1}
            required
            defaultValue={row.onHand}
            className={`${cellInput} text-right`}
          />
        </td>
        <td>
          <input {...field("entered", "Entered")} type="date" defaultValue={row.entered ?? ""} className={cellInput} />
        </td>
        <td>
          <input {...field("expiry", "Expiry")} type="date" defaultValue={row.expiry ?? ""} className={cellInput} />
        </td>
        <td>
          <select
            {...field("requiresRx", "Prescription")}
            defaultValue={row.requiresRx ? RX_OPTIONS[1] : RX_OPTIONS[0]}
            className={`${cellInput} min-w-[8rem] pr-7`}
          >
            {RX_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
        <td className="whitespace-nowrap !px-1 text-right">
          <button
            type="submit"
            form={formId}
            disabled={saving}
            className="rounded-lg p-1.5 text-pine-700 transition hover:bg-sage-100"
            aria-label={`Save ${row.name}`}
            title="Save changes"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDone(false)}
            disabled={saving}
            className="rounded-lg p-1.5 text-ink/60 transition hover:bg-sage-100"
            aria-label="Cancel editing"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </td>
      </tr>
      <tr className="bg-sage-100/50" onKeyDown={onKeyDown}>
        <td colSpan={colSpan} className="!border-t-0 pb-3 pt-0">
          <form
            id={formId}
            onSubmit={onSubmit}
            className="sticky left-0 flex w-[calc(100vw-8rem)] max-w-3xl flex-wrap items-end gap-3 lg:w-[calc(100vw-23rem)]"
          >
            <div className="min-w-[14rem] flex-1">
              <label htmlFor={`${formId}-reason`}>Reason for change</label>
              <input
                id={`${formId}-reason`}
                name="reason"
                required
                minLength={3}
                placeholder="e.g. Price update from supplier, counted 2 damaged"
              />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => onDone(false)} disabled={saving}>
                Cancel
              </button>
            </div>
            <p className="basis-full text-xs text-ink/60">
              Changes to current stock apply straight away; every change is recorded in the activity log.
              {row.otherBatches > 0
                ? ` Batch no., Entered and Expiry apply to the batch expiring first (${row.otherBatches} more on the item's page).`
                : ""}
            </p>
            {error ? <p className="basis-full text-sm text-rust">{error}</p> : null}
          </form>
        </td>
      </tr>
    </>
  );
}

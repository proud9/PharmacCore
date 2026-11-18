"use client";

import { ReactNode, useId } from "react";
import { DRUG_TYPES, DRUG_TYPE_LABEL, RX_OPTIONS } from "@/lib/stocksheet";

export type LineDefaults = {
  stockCode?: string;
  categoryNo?: string | null;
  batchNo?: string;
  description?: string;
  type?: "OTC" | "DDA";
  unit?: string;
  price?: number;
  requiresRx?: boolean;
  openingStock?: number;
  quantity?: number;
  lotNumber?: string;
  entered?: string;
  expiry?: string;
  currentStock?: number;
};

/**
 * Inventory item fields, shared by "Add item" (mode "add": opening stock),
 * and completing a delivered line (mode "intake": quantity received, lot, required expiry).
 * Editing happens inline in the table (EditItemRow).
 */
export function SheetLineFields({
  mode,
  defaults = {},
  onStockCodeBlur,
}: {
  mode: "add" | "intake";
  defaults?: LineDefaults;
  onStockCodeBlur?: (code: string) => void;
}) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const stockTitle = mode === "add" ? "Opening stock" : "Delivery";
  return (
    <div className="w-full space-y-4">
      <Group title="Item">
        <Field span="col-span-1 lg:col-span-3">
          <label htmlFor={id("stockCode")}>Stock code</label>
          <input
            id={id("stockCode")}
            name="stockCode"
            required
            defaultValue={defaults.stockCode}
            placeholder="AS01"
            onBlur={(e) => onStockCodeBlur?.(e.target.value.trim())}
          />
        </Field>
        <Field span="col-span-1 lg:col-span-3">
          <label htmlFor={id("categoryNo")}>Category no.</label>
          <input id={id("categoryNo")} name="categoryNo" defaultValue={defaults.categoryNo ?? ""} placeholder="24" />
        </Field>
        <Field span="col-span-2 lg:col-span-6">
          <label htmlFor={id("description")}>Description</label>
          <input
            id={id("description")}
            name="description"
            required
            minLength={2}
            defaultValue={defaults.description}
            placeholder="OLIVER OIL 100MLS"
          />
        </Field>
      </Group>

      <Group title="Type and price">
        <Field span="col-span-2 lg:col-span-4">
          <label htmlFor={id("type")}>Type</label>
          <select id={id("type")} name="type" defaultValue={defaults.type ?? "OTC"}>
            {DRUG_TYPES.map((type) => (
              <option key={type} value={type}>
                {DRUG_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </Field>
        {mode !== "intake" ? (
          <Field span="col-span-1 lg:col-span-3">
            <label htmlFor={id("requiresRx")}>Prescription</label>
            <select id={id("requiresRx")} name="requiresRx" defaultValue={defaults.requiresRx ? RX_OPTIONS[1] : RX_OPTIONS[0]}>
              {RX_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field span="col-span-1 lg:col-span-3">
          <label htmlFor={id("unit")}>Unit sale</label>
          <input id={id("unit")} name="unit" required defaultValue={defaults.unit} placeholder="1 BTL" />
        </Field>
        <Field span="col-span-1 lg:col-span-2">
          <label htmlFor={id("price")}>Price (ZMW)</label>
          <input id={id("price")} name="price" type="number" step="any" min={0} required defaultValue={defaults.price} />
        </Field>
      </Group>

      <Group title={stockTitle}>
        {mode === "add" ? (
          <>
            <Field span="col-span-1 lg:col-span-2">
              <label htmlFor={id("openingStock")}>Quantity</label>
              <input id={id("openingStock")} name="openingStock" type="number" min={0} step={1} defaultValue={defaults.openingStock} />
            </Field>
            <BatchNo id={id("batchNo")} defaultValue={defaults.batchNo} span="lg:col-span-4" />
            <Field span="col-span-1 lg:col-span-3">
              <label htmlFor={id("entered")}>Entered</label>
              <input id={id("entered")} name="entered" type="date" defaultValue={defaults.entered ?? todayIso()} />
            </Field>
            <Field span="col-span-1 lg:col-span-3">
              <label htmlFor={id("expiry")}>Expiry</label>
              <input id={id("expiry")} name="expiry" type="date" defaultValue={defaults.expiry} />
            </Field>
          </>
        ) : (
          <>
            <Field span="col-span-1 lg:col-span-2">
              <label htmlFor={id("quantity")}>Qty received</label>
              <input
                id={id("quantity")}
                name="quantity"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={defaults.quantity}
              />
            </Field>
            <Field span="col-span-1 lg:col-span-4">
              <label htmlFor={id("lotNumber")}>Lot / batch no.</label>
              <input id={id("lotNumber")} name="lotNumber" defaultValue={defaults.lotNumber} placeholder="From the pack" />
            </Field>
            <Field span="col-span-2 lg:col-span-3">
              <label htmlFor={id("expiry")}>Expiry</label>
              <input id={id("expiry")} name="expiry" type="date" required defaultValue={defaults.expiry} />
            </Field>
          </>
        )}
      </Group>
    </div>
  );
}

/** A titled block of related fields on a 12-column grid (2 columns on phones). */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-pine-900/10 bg-white/70 px-4 pb-4 pt-2">
      <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-pine-700/70">{title}</legend>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-12">{children}</div>
    </fieldset>
  );
}

function Field({ span, children }: { span: string; children: ReactNode }) {
  return <div className={span}>{children}</div>;
}

function BatchNo({ id, defaultValue, title, span }: { id: string; defaultValue?: string; title?: string; span: string }) {
  return (
    <Field span={`col-span-2 ${span}`}>
      <label htmlFor={id} title={title}>
        Batch no.
      </label>
      <input id={id} name="batchNo" defaultValue={defaultValue} placeholder="From the pack" />
    </Field>
  );
}

/** Today as yyyy-mm-dd in local time, for date inputs. */
function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Reads the shared fields back out of a submitted form. Blank numbers stay undefined. */
export function readLineFields(form: FormData) {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
  };
  const number = (key: string) => {
    const value = text(key);
    return value === undefined ? undefined : Number(value);
  };
  const rx = text("requiresRx");
  return {
    stockCode: text("stockCode") ?? "",
    categoryNo: text("categoryNo"),
    description: text("description") ?? "",
    type: text("type") ?? "OTC",
    unit: text("unit") ?? "",
    price: number("price") ?? 0,
    requiresRx: rx === undefined ? undefined : rx === RX_OPTIONS[1],
    openingStock: number("openingStock"),
    quantity: number("quantity"),
    lotNumber: text("lotNumber"),
    batchNo: text("batchNo"),
    currentStock: number("currentStock"),
    reason: text("reason"),
    entered: text("entered"),
    expiry: text("expiry"),
  };
}

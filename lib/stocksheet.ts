import { z } from "zod";

/**
 * Item and stock sheet rules shared by Inventory (adding/editing items, CSV import,
 * delivery queue) and Stock take (close qty count, reports). Used by the client and the
 * API, so it must not import the database.
 *
 * Sheet columns: stock code, category no., description, type (OTC/DDA), unit sale, price,
 * open qty, close qty, sold (open − close), amount (sold × price), expiry.
 */

export const DRUG_TYPES = ["OTC", "DDA"] as const;
export type DrugType = (typeof DRUG_TYPES)[number];

export const DRUG_TYPE_LABEL: Record<DrugType, string> = {
  OTC: "OTC — over the counter",
  DDA: "DDA — Dangerous Drugs Act (controlled)",
};

/** DDA items are the products flagged `controlled`. */
export function drugTypeOf(controlled: boolean): DrugType {
  return controlled ? "DDA" : "OTC";
}

/** Prescription options, as shown in the site form and the Excel template's dropdown. */
export const RX_OPTIONS = ["Not required", "Required"] as const;

/**
 * Inventory import columns (Excel template and CSV), in order. `batch_no`, `opening_stock`,
 * `entered` and `expiry` only apply to new items: they become the item's first batch.
 */
export const IMPORT_COLUMNS = [
  { key: "stock_code", header: "Stock code", required: true },
  { key: "category_no", header: "Ctg no.", required: false },
  { key: "batch_no", header: "Batch no.", required: false },
  { key: "description", header: "Description", required: true },
  { key: "type", header: "Type", required: true },
  { key: "unit_sale", header: "Unit sale", required: true },
  { key: "price", header: "Price", required: true },
  { key: "prescription", header: "Prescription", required: false },
  { key: "opening_stock", header: "Opening stock", required: false },
  { key: "entered", header: "Entered", required: false },
  { key: "expiry", header: "Expiry", required: false },
] as const;

export type ImportKey = (typeof IMPORT_COLUMNS)[number]["key"];

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const quantity = z.coerce.number().int("Quantities must be whole numbers.").min(0, "Quantities can't be negative.");

const optionalDate = (message: string) =>
  optionalText.refine((value) => value === undefined || parseExpiry(value) !== null, { message });

/** Reads "Required"/"Not required" (or yes/no, y/n, true/false); blank leaves it unchanged. */
const prescription = z.preprocess((value) => {
  if (typeof value === "boolean" || value === undefined || value === null) return value ?? undefined;
  const text = String(value).trim().toLowerCase();
  if (text === "") return undefined;
  if (["required", "yes", "y", "true", "rx"].includes(text)) return true;
  if (["not required", "no", "n", "false", "otc"].includes(text)) return false;
  return text;
}, z.boolean({ invalid_type_error: "Prescription must be Required or Not required." }).optional());

/** One item, as entered in Inventory's "Add item" form or read from an import row. */
export const itemSchema = z.object({
  stockCode: z.string().trim().min(1, "Stock code is required."),
  categoryNo: optionalText,
  description: z.string().trim().min(2, "Description is required."),
  type: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.enum(DRUG_TYPES, { errorMap: () => ({ message: "Type must be OTC or DDA." }) })),
  unit: z.string().trim().min(1, "Unit sale is required."),
  price: z.preprocess(
    (value) =>
      value === undefined || value === null || (typeof value === "string" && value.trim() === "")
        ? undefined
        : Number(value),
    z
      .number({ required_error: "Price is required.", invalid_type_error: "Price must be a number." })
      .min(0, "Price can't be negative."),
  ),
  batchNo: optionalText,
  openingStock: quantity.optional(),
  entered: optionalDate("Entered must be a date like 2026-05-01 or 01/05/2026."),
  expiry: optionalDate("Expiry must be a date like 2026-05-01 or 01/05/2026."),
  /** Blank in an import leaves an existing item's setting unchanged. */
  requiresRx: prescription,
});

export type ItemInput = z.input<typeof itemSchema>;

/** Details entered for a delivered line before it is added to stock. */
export const intakeSchema = z.object({
  stockCode: z.string().trim().min(1, "Stock code is required."),
  categoryNo: optionalText,
  description: z.string().trim().min(2, "Description is required."),
  type: z.enum(DRUG_TYPES, { errorMap: () => ({ message: "Type must be OTC or DDA." }) }),
  unit: z.string().trim().min(1, "Unit sale is required."),
  price: z.coerce.number().min(0, "Price can't be negative."),
  quantity: quantity.refine((value) => value > 0, "Quantity received must be more than zero."),
  lotNumber: optionalText,
  expiry: z.string().trim().refine((value) => parseExpiry(value) !== null, "Enter the expiry date."),
});

/** Editing an item in Inventory: its details plus the current stock on hand. */
export const editItemSchema = z.object({
  stockCode: z.string().trim().min(1, "Stock code is required."),
  categoryNo: optionalText,
  description: z.string().trim().min(2, "Description is required."),
  type: z.enum(DRUG_TYPES, { errorMap: () => ({ message: "Type must be OTC or DDA." }) }),
  unit: z.string().trim().min(1, "Unit sale is required."),
  price: z.coerce.number().min(0, "Price can't be negative."),
  currentStock: quantity,
  requiresRx: z.boolean().optional(),
  expiry: optionalText.refine((value) => value === undefined || parseExpiry(value) !== null, {
    message: "Expiry must be a valid date.",
  }),
  reason: z.string().trim().min(3, "Enter a reason for the change."),
  batchNo: optionalText,
  entered: optionalDate("Entered must be a valid date."),
});

/**
 * Accepts 2026-05-01, 01/05/2026 (day first, as used in Zambia) or an Excel date serial
 * such as 46143. Returns null when the value isn't a usable date.
 */
export function parseExpiry(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;
  let date: Date | null = null;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  } else if ((match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) {
    date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  } else if (/^\d{5}$/.test(text)) {
    date = new Date(Date.UTC(1899, 11, 30) + Number(text) * 86_400_000);
  }
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

/** Minimal RFC 4180 CSV reader: quoted fields, escaped quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

const HEADER_ALIASES: Record<string, ImportKey> = {
  stock_code: "stock_code",
  code: "stock_code",
  stockcode: "stock_code",
  category_no: "category_no",
  ctg_no: "category_no",
  ctg_nos: "category_no",
  ctg: "category_no",
  batch_no: "batch_no",
  batch: "batch_no",
  batch_number: "batch_no",
  lot: "batch_no",
  lot_no: "batch_no",
  lot_number: "batch_no",
  category: "category_no",
  description: "description",
  descriptions: "description",
  type: "type",
  drug_type: "type",
  unit_sale: "unit_sale",
  unit: "unit_sale",
  price: "price",
  new_price: "price",
  prescription: "prescription",
  rx: "prescription",
  requires_rx: "prescription",
  opening_stock: "opening_stock",
  open_qty: "opening_stock",
  qty: "opening_stock",
  quantity: "opening_stock",
  stock: "opening_stock",
  entered: "entered",
  entered_on: "entered",
  date_entered: "entered",
  received: "entered",
  expiry: "expiry",
  epire: "expiry",
  expiry_date: "expiry",
};

function headerKey(cell: string) {
  return HEADER_ALIASES[cell.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")];
}

/**
 * Turns a table (header row + data rows, as text) from a CSV or Excel sheet into item
 * inputs keyed for `itemSchema`, with their sheet row numbers. Unknown columns are ignored.
 */
export function tableToLines(table: string[][]): { lines: { row: number; input: ItemInput }[]; error?: string } {
  const rows = table.filter((cells) => cells.some((cell) => cell.trim() !== ""));
  if (rows.length < 2) return { lines: [], error: "The file has no item rows under the header." };
  const keys = rows[0].map(headerKey);
  const missing = IMPORT_COLUMNS.filter((column) => column.required && !keys.includes(column.key)).map(
    (column) => column.header,
  );
  if (missing.length) {
    return { lines: [], error: `Missing columns: ${missing.join(", ")}. Download the template to see the layout.` };
  }
  const lines = rows.slice(1).map((cells) => {
    const value = (key: ImportKey) => {
      const at = keys.indexOf(key);
      return at === -1 ? "" : (cells[at] ?? "").trim();
    };
    const blank = (text: string) => (text === "" ? undefined : text);
    return {
      // 1-based sheet row, so messages match the row numbers in Excel.
      row: table.indexOf(cells) + 1,
      input: {
        stockCode: value("stock_code"),
        categoryNo: blank(value("category_no")),
        batchNo: blank(value("batch_no")),
        description: value("description"),
        type: value("type"),
        unit: value("unit_sale"),
        price: value("price") as unknown as number,
        requiresRx: blank(value("prescription")) as unknown as boolean | undefined,
        openingStock: blank(value("opening_stock")) as unknown as number | undefined,
        entered: blank(value("entered")),
        expiry: blank(value("expiry")),
      },
    };
  });
  return { lines };
}

/** CSV text → item inputs. */
export function csvToLines(text: string) {
  return tableToLines(parseCsv(text));
}

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check this line.";
}

/** Quotes a value for CSV output. */
export function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Stock code as shown in history: permanently deleted items carry a "~DEL-xxxxxx" suffix internally. */
export function displayCode(sku: string) {
  return sku.replace(/~DEL-[a-z0-9]+$/i, "");
}

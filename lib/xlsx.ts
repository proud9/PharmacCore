import ExcelJS from "exceljs";
import { DRUG_TYPES, IMPORT_COLUMNS, RX_OPTIONS } from "./stocksheet";

/** Server-only Excel helpers for the inventory import template. */

const SHEET_NAME = "Items";
const TEMPLATE_ROWS = 1000;
const PINE = "FF0F3D37";
const PARCHMENT = "FFF4EFE6";
const SAGE = "FFE8F0EA";

const WIDTHS: Record<string, number> = {
  stock_code: 14,
  category_no: 9,
  batch_no: 13,
  description: 40,
  type: 9,
  unit_sale: 12,
  price: 12,
  prescription: 15,
  opening_stock: 14,
  entered: 13,
  expiry: 13,
};

/**
 * Builds the inventory import template: one "Items" sheet with styled headers, date and
 * number formats, and dropdowns for Type and Prescription that use the same values as the
 * site form (DRUG_TYPES, RX_OPTIONS). A "Lists" sheet holds those values; a "How to"
 * sheet explains the columns.
 */
export async function buildItemsTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pharmacy";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(SHEET_NAME, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = IMPORT_COLUMNS.map((column) => ({
    key: column.key,
    header: column.header,
    width: WIDTHS[column.key] ?? 12,
  }));

  const header = sheet.getRow(1);
  header.height = 22;
  header.eachCell((cell, col) => {
    const column = IMPORT_COLUMNS[col - 1];
    cell.font = { bold: true, color: { argb: column.required ? PARCHMENT : PINE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: column.required ? PINE : SAGE } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: PINE } } };
  });

  // Lists sheet: the dropdown sources, kept in step with the site form constants.
  const lists = workbook.addWorksheet("Lists", { state: "hidden" });
  lists.getCell("A1").value = "Type";
  DRUG_TYPES.forEach((type, i) => (lists.getCell(`A${i + 2}`).value = type));
  lists.getCell("B1").value = "Prescription";
  RX_OPTIONS.forEach((option, i) => (lists.getCell(`B${i + 2}`).value = option));
  const typeRange = `Lists!$A$2:$A$${DRUG_TYPES.length + 1}`;
  const rxRange = `Lists!$B$2:$B$${RX_OPTIONS.length + 1}`;

  const col = (key: string) => IMPORT_COLUMNS.findIndex((c) => c.key === key) + 1;
  for (let r = 2; r <= TEMPLATE_ROWS + 1; r++) {
    const row = sheet.getRow(r);
    row.getCell(col("stock_code")).numFmt = "@";
    row.getCell(col("category_no")).numFmt = "@";
    row.getCell(col("batch_no")).numFmt = "@";
    row.getCell(col("type")).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [typeRange],
      showErrorMessage: true,
      errorTitle: "Type",
      error: `Choose ${DRUG_TYPES.join(" or ")}.`,
    };
    row.getCell(col("price")).numFmt = "#,##0.00###";
    row.getCell(col("price")).dataValidation = {
      type: "decimal",
      operator: "greaterThanOrEqual",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      error: "Price must be a number of 0 or more.",
    };
    row.getCell(col("prescription")).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [rxRange],
      showErrorMessage: true,
      errorTitle: "Prescription",
      error: `Choose ${RX_OPTIONS.join(" or ")}.`,
    };
    row.getCell(col("opening_stock")).numFmt = "0";
    row.getCell(col("opening_stock")).dataValidation = {
      type: "whole",
      operator: "greaterThanOrEqual",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      error: "Opening stock must be a whole number of 0 or more.",
    };
    for (const key of ["entered", "expiry"]) {
      const cell = row.getCell(col(key));
      cell.numFmt = "dd/mm/yyyy";
      cell.dataValidation = {
        type: "date",
        operator: "greaterThan",
        allowBlank: true,
        formulae: [new Date(Date.UTC(2000, 0, 1))],
        showErrorMessage: true,
        error: "Enter a date, e.g. 31/05/2027.",
      };
    }
  }

  const help = workbook.addWorksheet("How to");
  help.columns = [{ width: 18 }, { width: 90 }];
  help.addRow(["Inventory import template"]).font = { bold: true, size: 14, color: { argb: PINE } };
  help.addRow([]);
  help.addRow(["Fill in the Items sheet, one item per row, then upload it on the Inventory page."]);
  help.addRow(["Dark green headers are required; light green headers are optional."]);
  help.addRow([]);
  const notes: [string, string][] = [
    ["Stock code", "Unique code. An existing code updates that item's details; its stock is not changed."],
    ["Ctg no.", "Category number, e.g. 24."],
    ["Batch no.", "New items only: lot/batch number of the opening stock, from the pack. Blank = OPENING."],
    ["Description", "Item name as it should appear on the sheet."],
    ["Type", `${DRUG_TYPES.join(" or ")} (DDA = Dangerous Drugs Act, controlled). Pick from the dropdown.`],
    ["Unit sale", "Selling unit, e.g. 1 BTL, 1 PKT."],
    ["Price", "Selling price in Kwacha."],
    ["Prescription", `${RX_OPTIONS.join(" or ")}. Leave blank to keep an existing item's setting.`],
    ["Opening stock", "New items only: quantity on hand. Needs an Expiry."],
    ["Entered", "New items only: date the opening stock was entered. Blank = today."],
    ["Expiry", "New items only: expiry date of the opening stock."],
  ];
  for (const [name, text] of notes) {
    const row = help.addRow([name, text]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true };
  }
  help.addRow([]);
  help.addRow(["Example", "AS01 | 24 | LOT-2291 | OLIVER OIL 100MLS | OTC | 1 BTL | 7.75 | Not required | 45 | 12/11/2026 | 01/05/2027"]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    // Excel dates are stored as UTC midnight.
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("text" in value) return String(value.text);
    if ("error" in value) return "";
  }
  return String(value);
}

/**
 * Reads the item table from an uploaded workbook: the "Items" sheet if present, otherwise
 * the first sheet. Returns text cells; array index + 1 equals the Excel row number.
 */
export async function readItemsWorkbook(data: ArrayBuffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets.find((ws) => ws.state !== "hidden");
  if (!sheet) return [];
  const table: string[][] = [];
  const width = Math.max(sheet.columnCount, IMPORT_COLUMNS.length);
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= width; c++) cells.push(cellText(row.getCell(c).value).trim());
    table.push(cells);
  }
  return table;
}

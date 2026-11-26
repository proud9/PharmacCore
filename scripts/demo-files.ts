/**
 * Makes the files the presentation uses: docs/demo/wholesaler-opening-stock.xlsx, the
 * wholesaler's opening stock filled into the real import template (lib/xlsx.ts).
 *   npm run demo:files
 */
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { addMonths, format } from "date-fns";
import ExcelJS from "exceljs";
import { buildItemsTemplate } from "../lib/xlsx";
import { IMPORT_COLUMNS } from "../lib/stocksheet";
import { OPENING_STOCK } from "./demo-cast";

export const OPENING_STOCK_FILE = path.join(__dirname, "..", "docs", "demo", "wholesaler-opening-stock.xlsx");

export async function writeOpeningStock() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await buildItemsTemplate()) as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  const col = (key: string) => IMPORT_COLUMNS.findIndex((c) => c.key === key) + 1;
  const today = new Date();
  OPENING_STOCK.forEach((item, index) => {
    const row = sheet.getRow(index + 2);
    row.getCell(col("stock_code")).value = item.stockCode;
    row.getCell(col("batch_no")).value = item.batch;
    row.getCell(col("description")).value = item.description;
    row.getCell(col("type")).value = item.type;
    row.getCell(col("unit_sale")).value = item.unit;
    row.getCell(col("price")).value = item.price;
    row.getCell(col("prescription")).value = item.prescription;
    row.getCell(col("opening_stock")).value = item.openingStock;
    row.getCell(col("entered")).value = format(today, "dd/MM/yyyy");
    row.getCell(col("expiry")).value = format(addMonths(today, item.expiryMonths), "dd/MM/yyyy");
    row.commit();
  });
  mkdirSync(path.dirname(OPENING_STOCK_FILE), { recursive: true });
  writeFileSync(OPENING_STOCK_FILE, Buffer.from(await workbook.xlsx.writeBuffer()));
  return OPENING_STOCK_FILE;
}

if (require.main === module) {
  writeOpeningStock().then((file) => console.log(`Wrote ${path.relative(process.cwd(), file)}`));
}

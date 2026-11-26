import { NextResponse } from "next/server";
import { format } from "date-fns";
import { apiTenant } from "@/lib/tenant";
import { csvCell, displayCode, drugTypeOf } from "@/lib/stocksheet";

/**
 * Downloads a stock take report as CSV (opens in Excel), in the stock sheet layout.
 * ?show=moved (default) gives only lines where sold ≠ 0; ?show=all gives every line.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiTenant("inventory", { write: false });
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db } = t;

  const { id } = await params;
  const show = new URL(request.url).searchParams.get("show") === "all" ? "all" : "moved";
  const take = await db.stockTake.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!take) return NextResponse.json({ error: "Stock take not found." }, { status: 404 });

  const lines = take.items
    .map((item) => {
      const sold = item.systemQty - item.countedQty;
      return { item, sold, amount: sold * item.unitPrice };
    })
    .filter((line) => show === "all" || line.sold !== 0)
    .sort((a, b) => a.item.product.sku.localeCompare(b.item.product.sku));
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const when = take.completedAt ?? take.startedAt;

  const rows: (string | number | null)[][] = [
    ["Stock take report", take.reference],
    ["Counted by", take.userName],
    ["Date", format(when, "dd MMM yyyy HH:mm")],
    ["Lines", show === "all" ? "All lines" : "Items that moved"],
    ...(take.notes ? [["Notes", take.notes]] : []),
    [],
    ["#", "Stock code", "Ctg no.", "Description", "Type", "Unit sale", "Price", "Open qty", "Close qty", "Sold", "Amount"],
    ...lines.map(({ item, sold, amount }, index) => [
      index + 1,
      displayCode(item.product.sku),
      item.product.categoryNo,
      item.product.name,
      drugTypeOf(item.product.controlled),
      item.product.unit,
      item.unitPrice.toFixed(2),
      item.systemQty,
      item.countedQty,
      sold,
      amount.toFixed(2),
    ]),
    ["", "", "", "", "", "", "", "", "", "Total", total.toFixed(2)],
  ];

  // BOM so Excel reads the file as UTF-8.
  const csv = "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const filename = `${take.reference}-${show === "all" ? "all-lines" : "moved-lines"}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

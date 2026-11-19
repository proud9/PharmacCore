import { NextResponse } from "next/server";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { buildItemsTemplate } from "@/lib/xlsx";

/** Downloads the Excel import template (dropdowns match the site form). */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAdjustStock(user.role)) return NextResponse.json({ error: "Only sales staff can import items." }, { status: 403 });
  const file = await buildItemsTemplate();
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="inventory-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

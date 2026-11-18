import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildItemsTemplate } from "@/lib/xlsx";

/** Downloads the Excel import template (dropdowns match the site form). */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const file = await buildItemsTemplate();
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="inventory-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

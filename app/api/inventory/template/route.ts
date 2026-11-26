import { NextResponse } from "next/server";
import { apiTenant } from "@/lib/tenant";
import { buildItemsTemplate } from "@/lib/xlsx";

/** Downloads the Excel import template (dropdowns match the site form). */
export async function GET() {
  const auth = await apiTenant("catalog", { write: false });
  if (!auth.ok) return auth.response;
  const file = await buildItemsTemplate();
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="inventory-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiTenant } from "@/lib/tenant";
import { saveItems } from "@/lib/items";

/** Adds or updates items sent as JSON (the "Add item" form). File imports use /api/inventory/import. */
const bodySchema = z.object({
  rows: z
    .array(z.object({ row: z.number().int(), input: z.record(z.unknown()) }))
    .min(1)
    .max(2000),
});

export async function POST(request: Request) {
  const auth = await apiTenant("catalog");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Nothing to add." }, { status: 400 });
  }
  return NextResponse.json(await saveItems(t, body.data.rows));
}

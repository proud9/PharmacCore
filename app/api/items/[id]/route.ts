import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { apiTenant, notFound } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { catalogData, catalogItemSchema } from "@/lib/item-schema";

/** Edits an item's details, or just `{ offered }` to show or hide it from connected buyers. */
const offeredOnly = z.object({ offered: z.boolean() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiTenant("catalog");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { id } = await params;
  const product = await t.db.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) return notFound("That item");
  const body = await request.json().catch(() => null);

  const toggle = offeredOnly.safeParse(body);
  if (toggle.success) {
    await t.db.product.update({ where: { id }, data: { offered: toggle.data.offered } });
    await audit(t, { action: toggle.data.offered ? "ITEM_OFFERED" : "ITEM_HIDDEN", entity: "Product", entityId: id, details: product.sku });
    return NextResponse.json({ ok: true });
  }
  const parsed = catalogItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the item." }, { status: 400 });
  try {
    await t.db.product.update({ where: { id }, data: catalogData(parsed.data) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `Stock code ${parsed.data.sku} is already used.` }, { status: 409 });
    }
    throw error;
  }
  await audit(t, { action: "ITEM_UPDATED", entity: "Product", entityId: id, details: parsed.data.sku });
  return NextResponse.json({ ok: true });
}

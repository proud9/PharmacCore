import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { catalogData, catalogItemSchema } from "@/lib/item-schema";

/** Adds an item to this business's list (no stock). Stocked items are added in Inventory. */
export async function POST(request: Request) {
  const auth = await apiTenant("catalog");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const parsed = catalogItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the item." }, { status: 400 });
  try {
    const product = await t.db.product.create({ data: { orgId: t.org.id, ...catalogData(parsed.data) } });
    await audit(t, { action: "ITEM_ADDED", entity: "Product", entityId: product.id, details: `${product.sku} · ${product.name}` });
    return NextResponse.json({ ok: true, id: product.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `Stock code ${parsed.data.sku} is already used.` }, { status: 409 });
    }
    throw error;
  }
}

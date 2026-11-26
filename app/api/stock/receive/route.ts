import { NextResponse } from "next/server";
import { z } from "zod";
import { apiTenant } from "@/lib/tenant";
import { receiveBatch } from "@/lib/inventory";
import { audit } from "@/lib/audit";

const schema = z.object({
  productId: z.string(),
  lotNumber: z.string().min(1),
  expiryDate: z.string(),
  quantity: z.number().int().positive(),
});

export async function POST(request: Request) {
  const auth = await apiTenant("inventory");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db } = t;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Batch details are incomplete." }, { status: 400 });
  }
  if ((await db.product.count({ where: { id: parsed.data.productId, active: true } })) === 0) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }
  await receiveBatch(db, {
    orgId: t.org.id,
    productId: parsed.data.productId,
    lotNumber: parsed.data.lotNumber,
    expiryDate: new Date(parsed.data.expiryDate),
    quantity: parsed.data.quantity,
  });
  await audit(t, {
    action: "STOCK_RECEIVED",
    entity: "Product",
    entityId: parsed.data.productId,
    details: `${parsed.data.quantity} of lot ${parsed.data.lotNumber}`,
  });
  return NextResponse.json({ ok: true });
}

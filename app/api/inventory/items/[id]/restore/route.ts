import { NextResponse } from "next/server";
import { apiTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";

/** Restores an item from the delete queue, with its stock as it was. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiTenant("catalog");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db } = t;
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product || !product.deletedAt || product.purgedAt) {
    return NextResponse.json({ error: "This item can't be restored." }, { status: 400 });
  }
  await db.product.update({
    where: { id },
    data: { active: true, deletedAt: null, deleteReason: null, deletedByName: null },
  });
  await audit(t, {
    action: "ITEM_RESTORED",
    entity: "Product",
    entityId: id,
    details: product.sku,
  });
  return NextResponse.json({ ok: true });
}

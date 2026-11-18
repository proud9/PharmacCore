import { NextResponse } from "next/server";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/** Restores an item from the delete queue, with its stock as it was. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canAdjustStock(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product || !product.deletedAt || product.purgedAt) {
    return NextResponse.json({ error: "This item can't be restored." }, { status: 400 });
  }
  await db.product.update({
    where: { id },
    data: { active: true, deletedAt: null, deleteReason: null, deletedByName: null },
  });
  await audit({
    userId: user.id,
    action: "ITEM_RESTORED",
    entity: "Product",
    entityId: id,
    details: product.sku,
  });
  return NextResponse.json({ ok: true });
}

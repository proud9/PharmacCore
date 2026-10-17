import { NextResponse } from "next/server";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { receiveBatch } from "@/lib/inventory";
import { audit } from "@/lib/audit";
import { addDays } from "date-fns";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canAdjustStock(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const order = await db.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order || order.status === "RECEIVED") {
    return NextResponse.json({ error: "Order cannot be received." }, { status: 400 });
  }
  for (const item of order.items) {
    await receiveBatch({
      productId: item.productId,
      lotNumber: `PO-${order.reference}`,
      expiryDate: addDays(new Date(), 365),
      quantity: item.quantity,
    });
  }
  await db.purchaseOrder.update({
    where: { id },
    data: { status: "RECEIVED", receivedAt: new Date() },
  });
  await audit({
    userId: user.id,
    action: "PO_RECEIVED",
    entity: "PurchaseOrder",
    entityId: id,
    details: order.reference,
  });
  return NextResponse.json({ ok: true });
}

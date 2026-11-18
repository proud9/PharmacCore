import { NextResponse } from "next/server";
import { z } from "zod";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * Receives a supplier delivery against a purchase order. The supplier's delivery note
 * number and the quantity delivered per line are recorded, and each delivered line is
 * queued in Inventory (StockIntake). Stock is added once its expiry and price are entered there.
 */
const schema = z.object({
  deliveryNoteNo: z.string().trim().min(1),
  lines: z
    .array(z.object({ itemId: z.string(), quantity: z.number().int().min(0) }))
    .min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canAdjustStock(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the supplier's delivery note number." }, { status: 400 });
  }
  const { id } = await params;
  const order = await db.purchaseOrder.findUnique({
    where: { id },
    include: { items: true, supplier: true },
  });
  if (!order || order.status === "RECEIVED") {
    return NextResponse.json({ error: "Order cannot be received." }, { status: 400 });
  }

  const items = new Map(order.items.map((item) => [item.id, item]));
  const delivered = parsed.data.lines.filter((line) => line.quantity > 0);
  if (parsed.data.lines.some((line) => !items.has(line.itemId))) {
    return NextResponse.json({ error: "Unknown line on this order." }, { status: 400 });
  }
  if (delivered.length === 0) {
    return NextResponse.json({ error: "Enter the quantity delivered for at least one line." }, { status: 400 });
  }

  const updated = await db.$transaction(async (tx) => {
    const claimed = await tx.purchaseOrder.updateMany({
      where: { id, status: { not: "RECEIVED" } },
      data: { status: "RECEIVED", receivedAt: new Date(), deliveryNoteNo: parsed.data.deliveryNoteNo },
    });
    if (claimed.count === 0) return false;
    await tx.stockIntake.createMany({
      data: delivered.map((line) => {
        const item = items.get(line.itemId)!;
        return {
          purchaseOrderId: order.id,
          productId: item.productId,
          deliveryNoteNo: parsed.data.deliveryNoteNo,
          supplierName: order.supplier.name,
          quantity: line.quantity,
          unitCost: item.unitCost,
        };
      }),
    });
    return true;
  });
  if (!updated) {
    return NextResponse.json({ error: "Order cannot be received." }, { status: 400 });
  }

  await audit({
    userId: user.id,
    action: "PO_RECEIVED",
    entity: "PurchaseOrder",
    entityId: id,
    details: `${order.reference} · delivery note ${parsed.data.deliveryNoteNo}`,
  });
  return NextResponse.json({ ok: true, queued: delivered.length });
}

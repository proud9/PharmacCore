import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { loadPurchaseOrder } from "@/lib/purchase-access";
import { PO_ACCEPTED } from "@/lib/purchasing";

/**
 * The manufacturer dispatches an accepted order with its delivery note: number, how it is sent,
 * and the quantity per line. Sales receives it on arrival, which queues the lines in Inventory.
 */
const schema = z.object({
  deliveryNoteNo: z.string().trim().min(1).max(60),
  deliveryMethod: z.string().trim().max(200).optional(),
  message: z.string().trim().max(1000).optional(),
  lines: z.array(z.object({ id: z.string(), quantity: z.number().int().min(0) })).min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadPurchaseOrder(id, "manufacturer");
  if ("error" in loaded) return loaded.error;
  const { user, order } = loaded;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the delivery note number and the quantity sent." }, { status: 400 });
  if (!PO_ACCEPTED.includes(order.status)) {
    return NextResponse.json({ error: "Dispatch once the wholesale has accepted your price." }, { status: 400 });
  }
  const sent = new Map(parsed.data.lines.map((line) => [line.id, line.quantity]));
  if (parsed.data.lines.some((line) => !order.items.some((item) => item.id === line.id))) {
    return NextResponse.json({ error: "Unknown line on this order." }, { status: 400 });
  }
  if (![...sent.values()].some((qty) => qty > 0)) {
    return NextResponse.json({ error: "Send at least one item." }, { status: 400 });
  }

  const moved = await db.$transaction(async (tx) => {
    const claimed = await tx.purchaseOrder.updateMany({
      where: { id, status: order.status },
      data: {
        status: "DISPATCHED",
        dispatchedAt: new Date(),
        deliveryNoteNo: parsed.data.deliveryNoteNo,
        deliveryMethod: parsed.data.deliveryMethod || null,
      },
    });
    if (claimed.count === 0) return false;
    for (const item of order.items) {
      await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { qtyDispatched: sent.get(item.id) ?? 0 } });
    }
    await tx.purchaseOrderEvent.create({
      data: {
        orderId: id,
        status: "DISPATCHED",
        message: parsed.data.message || `Dispatched with delivery note ${parsed.data.deliveryNoteNo}`,
        actorName: `${user.name} (${order.supplier.name})`,
      },
    });
    return true;
  });
  if (!moved) return NextResponse.json({ error: "The order changed. Refresh and try again." }, { status: 409 });

  await audit({
    userId: user.id,
    action: "PO_DISPATCHED",
    entity: "PurchaseOrder",
    entityId: id,
    details: `${order.reference} · delivery note ${parsed.data.deliveryNoteNo}`,
  });
  return NextResponse.json({ ok: true });
}

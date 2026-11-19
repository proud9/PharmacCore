import { NextResponse } from "next/server";
import { z } from "zod";
import { canFinance, isManufacturer } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { loadPurchaseOrder } from "@/lib/purchase-access";
import { PO_QUOTABLE } from "@/lib/purchasing";

/** The manufacturer prices each line and says when the order can be ready. */
const schema = z.object({
  lines: z.array(z.object({ id: z.string(), unitCost: z.number().nonnegative() })).min(1),
  taxRate: z.number().min(0).max(100),
  readyOn: z.string().min(4),
  validUntil: z.string().min(4),
  message: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The manufacturer's own account, or finance entering a manufacturer's paper prices (manufacturers without a login).
  const loaded = await loadPurchaseOrder(id, "either");
  if ("error" in loaded) return loaded.error;
  const { user, order } = loaded;
  const manufacturer = isManufacturer(user.role);
  if (!manufacturer && !canFinance(user.role)) {
    return NextResponse.json({ error: "Only finance can enter a manufacturer's prices." }, { status: 403 });
  }
  const actor = manufacturer ? `${user.name} (${order.supplier.name})` : `${user.name} for ${order.supplier.name}`;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a price for each line, the tax rate, and both dates." }, { status: 400 });
  }
  if (!PO_QUOTABLE.includes(order.status)) {
    return NextResponse.json({ error: "This order can no longer be priced." }, { status: 400 });
  }
  const prices = new Map(parsed.data.lines.map((line) => [line.id, line.unitCost]));
  if (order.items.some((item) => !prices.has(item.id)) || prices.size !== order.items.length) {
    return NextResponse.json({ error: "Price every line on this order." }, { status: 400 });
  }
  const subtotal = order.items.reduce((sum, item) => sum + item.quantity * prices.get(item.id)!, 0);
  const total = Math.round(subtotal * (1 + parsed.data.taxRate / 100) * 100) / 100;
  const requote = order.status === "QUOTED";

  await db.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { unitCost: prices.get(item.id)! } });
    }
    await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: "QUOTED",
        quotedAmount: total,
        taxRate: parsed.data.taxRate,
        readyOn: new Date(parsed.data.readyOn),
        validUntil: new Date(parsed.data.validUntil),
        quotedAt: new Date(),
        supplierMessage: parsed.data.message || null,
        terms: parsed.data.terms || null,
        events: {
          create: {
            status: "QUOTED",
            message: parsed.data.message || (requote ? "Price changed" : "Price sent"),
            actorName: actor,
          },
        },
      },
    });
  });

  await audit({
    userId: user.id,
    action: requote ? "PO_REQUOTED" : "PO_QUOTED",
    entity: "PurchaseOrder",
    entityId: id,
    details: `${order.reference} · ZMW ${total.toFixed(2)}`,
  });
  return NextResponse.json({ ok: true, total });
}

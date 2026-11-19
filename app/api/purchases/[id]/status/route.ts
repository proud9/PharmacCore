import { NextResponse } from "next/server";
import { z } from "zod";
import { canFinance, isManufacturer, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { loadPurchaseOrder } from "@/lib/purchase-access";
import { PO_CANCELLABLE, PO_QUOTABLE } from "@/lib/purchasing";

/**
 * Status steps that are just a decision:
 * - finance (or admin) accepts the manufacturer's price: QUOTED → ACCEPTED
 * - any wholesale staff cancels before dispatch: → CANCELLED
 * - the manufacturer declines while the order is waiting for or showing a price: → DECLINED
 */
const schema = z.object({
  status: z.enum(["ACCEPTED", "CANCELLED", "DECLINED"]),
  message: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadPurchaseOrder(id, "either");
  if ("error" in loaded) return loaded.error;
  const { user, order } = loaded;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a step." }, { status: 400 });
  const next = parsed.data.status;

  let allowed = false;
  if (isManufacturer(user.role)) {
    allowed = next === "DECLINED" && PO_QUOTABLE.includes(order.status);
  } else if (isStaff(user.role)) {
    if (next === "ACCEPTED") {
      if (!canFinance(user.role)) {
        return NextResponse.json({ error: "Only finance can accept a manufacturer's price." }, { status: 403 });
      }
      if (order.validUntil && order.validUntil.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        return NextResponse.json({ error: "This price has expired. Ask the manufacturer for a new one." }, { status: 400 });
      }
      allowed = order.status === "QUOTED";
    }
    if (next === "CANCELLED") allowed = PO_CANCELLABLE.includes(order.status);
  }
  if (!allowed) return NextResponse.json({ error: "That step is not available for this order." }, { status: 400 });

  const actor = isManufacturer(user.role) ? `${user.name} (${order.supplier.name})` : user.name;
  const defaults = { ACCEPTED: "Price accepted", CANCELLED: "Order cancelled", DECLINED: "Declined by the manufacturer" };
  // Only move the order if nobody else changed it in the meantime.
  const moved = await db.purchaseOrder.updateMany({ where: { id, status: order.status }, data: { status: next } });
  if (moved.count === 0) return NextResponse.json({ error: "The order changed. Refresh and try again." }, { status: 409 });
  await db.purchaseOrderEvent.create({
    data: { orderId: id, status: next, message: parsed.data.message || defaults[next], actorName: actor },
  });

  await audit({
    userId: user.id,
    action: `PO_${next}`,
    entity: "PurchaseOrder",
    entityId: id,
    details: `${order.reference} → ${next}${parsed.data.message ? ` · ${parsed.data.message}` : ""}`,
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { canSell, isBuyer, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { adminNextStatuses, STATUS_LABEL } from "@/lib/wholesale";
import { deductStock } from "@/lib/inventory";

const schema = z.object({
  status: z.string(),
  message: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isBuyer(user.role) && !canSell(user.role)) {
    return NextResponse.json({ error: "Only sales staff can move orders along." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing status." }, { status: 400 });
  }
  const { id } = await params;
  const order = await db.consignment.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = parsed.data.status;

  if (isBuyer(user.role)) {
    if (order.institutionId !== user.institutionId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const allowed =
      (order.status === "QUOTED" && next === "ACCEPTED") ||
      (["REQUESTED", "QUOTED"].includes(order.status) && next === "CANCELLED");
    if (!allowed) {
      return NextResponse.json({ error: "You cannot move this order to that state." }, { status: 400 });
    }
  } else if (canSell(user.role)) {
    if (!adminNextStatuses(order.status).includes(next)) {
      return NextResponse.json({ error: "That status step is not available." }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // Dispatch is when the goods leave the warehouse: take the delivery note quantities off stock
  // (earliest expiry first) in the same transaction as the status change.
  if (next === "DISPATCHED" && !order.deliveryNoteNo) {
    return NextResponse.json({ error: "Issue the delivery note before dispatching." }, { status: 400 });
  }
  try {
    await db.$transaction(async (tx) => {
      if (next === "DISPATCHED") {
        const items = await tx.consignmentItem.findMany({
          where: { consignmentId: id },
          include: { product: { select: { name: true } } },
        });
        for (const item of items) {
          const qty = item.qtyDelivered ?? item.quantity;
          if (qty <= 0) continue;
          try {
            await deductStock(tx, item.productId, qty);
          } catch {
            throw new Error(`Not enough ${item.product.name} in stock to dispatch ${qty}. Receive more stock or lower the delivered quantity.`);
          }
        }
      }
      await tx.consignment.update({
        where: { id },
        data: {
          status: next,
          events: {
            create: {
              status: next,
              message:
                parsed.data.message ||
                (isBuyer(user.role)
                  ? next === "ACCEPTED"
                    ? "Price accepted"
                    : "Cancelled by the client"
                  : `Moved to ${STATUS_LABEL[next] ?? next}`),
              actorName: user.name,
            },
          },
        },
      });
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the order." }, { status: 400 });
  }

  await audit({
    userId: user.id,
    action: "CONSIGNMENT_STATUS",
    entity: "Consignment",
    entityId: id,
    details: `${order.reference} → ${next}`,
  });

  return NextResponse.json({ ok: true });
}

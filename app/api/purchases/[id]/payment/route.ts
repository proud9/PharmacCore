import { NextResponse } from "next/server";
import { z } from "zod";
import { canFinance } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { loadPurchaseOrder } from "@/lib/purchase-access";

/** Finance records the total paid so far against the manufacturer's invoice. */
const schema = z.object({ amountPaid: z.number().nonnegative() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadPurchaseOrder(id, "staff");
  if ("error" in loaded) return loaded.error;
  const { user, order } = loaded;
  if (!canFinance(user.role)) return NextResponse.json({ error: "Only finance can record payments." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the total amount paid so far." }, { status: 400 });
  if (!order.invoiceNo || order.quotedAmount == null) {
    return NextResponse.json({ error: "Record payments once the manufacturer has invoiced." }, { status: 400 });
  }
  if (parsed.data.amountPaid > order.quotedAmount + 0.001) {
    return NextResponse.json({ error: "Amount paid cannot be more than the invoice total." }, { status: 400 });
  }

  await db.purchaseOrder.update({
    where: { id },
    data: {
      amountPaid: parsed.data.amountPaid,
      events: {
        create: {
          status: order.status,
          message: `Payment recorded: ZMW ${parsed.data.amountPaid.toFixed(2)} paid of ${order.quotedAmount.toFixed(2)}`,
          actorName: user.name,
        },
      },
    },
  });

  await audit({
    userId: user.id,
    action: "PO_PAYMENT",
    entity: "PurchaseOrder",
    entityId: id,
    details: `${order.reference} · paid ZMW ${parsed.data.amountPaid.toFixed(2)} (was ${order.amountPaid.toFixed(2)})`,
  });
  return NextResponse.json({ ok: true });
}

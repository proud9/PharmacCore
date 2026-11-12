import { NextResponse } from "next/server";
import { z } from "zod";
import { canWholesale, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { documentTotals } from "@/lib/documents";

const schema = z.object({
  lines: z.array(z.object({ id: z.string(), unitPrice: z.number().nonnegative() })).min(1),
  taxRate: z.number().min(0).max(100),
  readyOn: z.string().min(4),
  validUntil: z.string().min(4),
  adminMessage: z.string().min(1),
  terms: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canWholesale(user.role)) {
    return NextResponse.json({ error: "Wholesale administrators only." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a price for each line, the tax rate, and both dates." }, { status: 400 });
  }
  const { id } = await params;
  const existing = await db.consignment.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing || existing.status === "DELIVERED" || existing.status === "CANCELLED" || existing.status === "DECLINED") {
    return NextResponse.json({ error: "This order cannot be quoted." }, { status: 400 });
  }
  const known = new Set(existing.items.map((item) => item.id));
  if (parsed.data.lines.some((line) => !known.has(line.id)) || parsed.data.lines.length !== existing.items.length) {
    return NextResponse.json({ error: "Quote every line on this order." }, { status: 400 });
  }

  const totals = documentTotals(
    existing.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: parsed.data.lines.find((line) => line.id === item.id)?.unitPrice ?? null,
    })),
    parsed.data.taxRate,
    null,
  );

  await db.$transaction(
    parsed.data.lines.map((line) =>
      db.consignmentItem.update({
        where: { id: line.id },
        data: { unitPrice: line.unitPrice },
      }),
    ),
  );

  const keepStatus = existing.status === "REQUESTED" || existing.status === "QUOTED" ? "QUOTED" : existing.status;
  const order = await db.consignment.update({
    where: { id },
    data: {
      status: keepStatus,
      quotedAmount: totals.total,
      taxRate: parsed.data.taxRate,
      readyOn: new Date(parsed.data.readyOn),
      validUntil: new Date(parsed.data.validUntil),
      adminMessage: parsed.data.adminMessage,
      terms: parsed.data.terms || null,
      quotedById: user.id,
      quotedAt: new Date(),
      events: {
        create: {
          status: "QUOTED",
          message: `Quoted ${totals.total.toFixed(2)} ZMW · ready ${parsed.data.readyOn}. ${parsed.data.adminMessage}`,
          actorName: user.name,
        },
      },
    },
  });

  await audit({
    userId: user.id,
    action: "CONSIGNMENT_QUOTED",
    entity: "Consignment",
    entityId: id,
    details: `${order.reference} ZMW ${totals.total.toFixed(2)}`,
  });

  return NextResponse.json(order);
}

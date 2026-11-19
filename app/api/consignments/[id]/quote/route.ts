import { NextResponse } from "next/server";
import { z } from "zod";
import { canFinance, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { documentTotals } from "@/lib/documents";
import { format } from "date-fns";
import { money } from "@/lib/utils";

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
  if (!user || !canFinance(user.role)) {
    return NextResponse.json({ error: "Only finance staff can send prices and invoices." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a price for each line, the tax rate, and both dates." }, { status: 400 });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (parsed.data.validUntil.slice(0, 10) < today) {
    return NextResponse.json({ error: "The \"valid until\" date has passed. Choose today or later." }, { status: 400 });
  }
  const { id } = await params;
  const existing = await db.consignment.findUnique({
    where: { id },
    include: { items: true },
  });
  // A price can change until it is invoiced. Changing an accepted price sends the order back to
  // the buyer to accept again, so a buyer is never held to a price they did not see.
  if (!existing || !["REQUESTED", "QUOTED", "ACCEPTED"].includes(existing.status)) {
    return NextResponse.json({ error: "The price can't change once the order is being prepared." }, { status: 400 });
  }
  if (existing.invoiceNo) {
    return NextResponse.json({ error: "An invoice has been issued at this price, so it can't change." }, { status: 400 });
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

  const reaccept = existing.status === "ACCEPTED";
  const order = await db.consignment.update({
    where: { id },
    data: {
      status: "QUOTED",
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
          message: `${reaccept ? "Price changed after acceptance; the buyer needs to accept again. " : ""}Price sent: ${money(totals.total)}, ready ${format(new Date(parsed.data.readyOn), "dd MMM yyyy")}. ${parsed.data.adminMessage}`,
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
    details: `${order.reference} · ${money(totals.total)}`,
  });

  return NextResponse.json(order);
}

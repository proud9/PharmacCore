import { NextResponse } from "next/server";
import { z } from "zod";
import { canWholesale, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { INVOICE_STATUSES } from "@/lib/documents";
import { ref } from "@/lib/utils";

const schema = z.object({
  dueOn: z.string().min(4),
  amountPaid: z.number().nonnegative(),
  terms: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canWholesale(user.role)) {
    return NextResponse.json({ error: "Wholesale administrators only." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a due date and the amount already paid." }, { status: 400 });
  }
  const { id } = await params;
  const existing = await db.consignment.findUnique({ where: { id } });
  if (!existing || !INVOICE_STATUSES.includes(existing.status) || existing.quotedAmount == null) {
    return NextResponse.json({ error: "Issue an invoice after the buyer accepts the quotation." }, { status: 400 });
  }
  if (parsed.data.amountPaid > existing.quotedAmount + 0.001) {
    return NextResponse.json({ error: "Amount paid cannot exceed the quoted total." }, { status: 400 });
  }

  const order = await db.consignment.update({
    where: { id },
    data: {
      invoiceNo: existing.invoiceNo ?? ref("INV"),
      invoicedAt: existing.invoicedAt ?? new Date(),
      dueOn: new Date(parsed.data.dueOn),
      amountPaid: parsed.data.amountPaid,
      terms: parsed.data.terms ?? existing.terms,
      events: existing.invoiceNo
        ? undefined
        : {
            create: {
              status: existing.status,
              message: "Invoice issued",
              actorName: user.name,
            },
          },
    },
  });

  await audit({
    userId: user.id,
    action: "INVOICE_ISSUED",
    entity: "Consignment",
    entityId: id,
    details: order.invoiceNo ?? order.reference,
  });

  return NextResponse.json(order);
}

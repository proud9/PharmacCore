import { NextResponse } from "next/server";
import { z } from "zod";
import { canWholesale, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema = z.object({
  quotedAmount: z.number().positive(),
  readyOn: z.string().min(4),
  adminMessage: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canWholesale(user.role)) {
    return NextResponse.json({ error: "Wholesale administrators only." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a ZMW amount, ready date, and message." }, { status: 400 });
  }
  const { id } = await params;
  const existing = await db.consignment.findUnique({ where: { id } });
  if (!existing || existing.status === "DELIVERED" || existing.status === "CANCELLED") {
    return NextResponse.json({ error: "This consignment cannot be quoted." }, { status: 400 });
  }

  const order = await db.consignment.update({
    where: { id },
    data: {
      status: "QUOTED",
      quotedAmount: parsed.data.quotedAmount,
      readyOn: new Date(parsed.data.readyOn),
      adminMessage: parsed.data.adminMessage,
      quotedById: user.id,
      quotedAt: new Date(),
      events: {
        create: {
          status: "QUOTED",
          message: `Quoted K ${parsed.data.quotedAmount.toFixed(2)} · ready ${parsed.data.readyOn}. ${parsed.data.adminMessage}`,
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
    details: `${order.reference} ZMW ${parsed.data.quotedAmount}`,
  });

  return NextResponse.json(order);
}

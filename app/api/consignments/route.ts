import { NextResponse } from "next/server";
import { z } from "zod";
import { isBuyer, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ref } from "@/lib/utils";

const schema = z.object({
  notes: z.string().optional(),
  deliveryAddress: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        notes: z.string().optional(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user || !isBuyer(user.role) || !user.institutionId) {
    return NextResponse.json({ error: "Institution buyers only." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Add at least one medicine or equipment line." }, { status: 400 });
  }

  const order = await db.consignment.create({
    data: {
      reference: ref("CN"),
      institutionId: user.institutionId,
      requestedById: user.id,
      notes: parsed.data.notes,
      deliveryAddress: parsed.data.deliveryAddress,
      items: { create: parsed.data.items },
      events: {
        create: {
          status: "REQUESTED",
          message: "Consignment request submitted",
          actorName: user.name,
        },
      },
    },
  });

  await audit({
    userId: user.id,
    action: "CONSIGNMENT_REQUESTED",
    entity: "Consignment",
    entityId: order.id,
    details: order.reference,
  });

  return NextResponse.json(order);
}

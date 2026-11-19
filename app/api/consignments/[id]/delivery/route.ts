import { NextResponse } from "next/server";
import { z } from "zod";
import { canSell, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { DELIVERY_STATUSES } from "@/lib/documents";
import { ref } from "@/lib/utils";

const schema = z.object({
  lines: z
    .array(
      z.object({
        id: z.string(),
        qtyDelivered: z.number().int().nonnegative(),
        remarks: z.string().optional(),
      }),
    )
    .min(1),
  deliveryMethod: z.string().min(1),
  vehicleDriver: z.string().optional(),
  dispatchFrom: z.string().optional(),
  deliveryNotes: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canSell(user.role)) {
    return NextResponse.json({ error: "Only sales staff can issue delivery notes." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the quantity delivered and how it is being sent." }, { status: 400 });
  }
  const { id } = await params;
  const existing = await db.consignment.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing || !DELIVERY_STATUSES.includes(existing.status)) {
    return NextResponse.json({ error: "A delivery note is available once the order is being prepared." }, { status: 400 });
  }
  // Dispatch takes these quantities off stock, so the note is fixed from then on.
  if (existing.status === "DISPATCHED" || existing.status === "DELIVERED") {
    return NextResponse.json({ error: "The delivery note can't change after the order has been dispatched." }, { status: 400 });
  }
  const known = new Map(existing.items.map((item) => [item.id, item]));
  if (parsed.data.lines.some((line) => !known.has(line.id))) {
    return NextResponse.json({ error: "Unknown line on this order." }, { status: 400 });
  }
  for (const line of parsed.data.lines) {
    const item = known.get(line.id);
    if (item && line.qtyDelivered > item.quantity) {
      return NextResponse.json({ error: "Delivered quantity cannot exceed the quantity ordered." }, { status: 400 });
    }
  }

  await db.$transaction(
    parsed.data.lines.map((line) =>
      db.consignmentItem.update({
        where: { id: line.id },
        data: { qtyDelivered: line.qtyDelivered, remarks: line.remarks || null },
      }),
    ),
  );

  const order = await db.consignment.update({
    where: { id },
    data: {
      deliveryNoteNo: existing.deliveryNoteNo ?? ref("DN"),
      deliveryMethod: parsed.data.deliveryMethod,
      vehicleDriver: parsed.data.vehicleDriver || null,
      dispatchFrom: parsed.data.dispatchFrom || null,
      deliveryNotes: parsed.data.deliveryNotes || null,
      events: existing.deliveryNoteNo
        ? undefined
        : {
            create: {
              status: existing.status,
              message: "Delivery note issued",
              actorName: user.name,
            },
          },
    },
  });

  await audit({
    userId: user.id,
    action: "DELIVERY_NOTE_ISSUED",
    entity: "Consignment",
    entityId: id,
    details: order.deliveryNoteNo ?? order.reference,
  });

  return NextResponse.json(order);
}

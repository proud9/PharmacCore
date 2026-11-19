import { NextResponse } from "next/server";
import { z } from "zod";
import { canSell, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ref } from "@/lib/utils";

/** Sales (or admin) sends a purchase order to a manufacturer. The manufacturer replies with a price. */
const schema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().trim().max(1000).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitCost: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSell(user.role)) return NextResponse.json({ error: "Only sales staff can raise purchase orders." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a manufacturer and add at least one item with a quantity." }, { status: 400 });
  }
  const { supplierId, notes, lines } = parsed.data;
  if (new Set(lines.map((line) => line.productId)).size !== lines.length) {
    return NextResponse.json({ error: "Each item can appear only once. Change the quantity instead." }, { status: 400 });
  }
  const [supplier, products] = await Promise.all([
    db.supplier.findUnique({ where: { id: supplierId } }),
    db.product.findMany({ where: { id: { in: lines.map((line) => line.productId) }, active: true }, select: { id: true, costPrice: true } }),
  ]);
  if (!supplier) return NextResponse.json({ error: "Manufacturer not found." }, { status: 400 });
  if (products.length !== lines.length) return NextResponse.json({ error: "One of the items is no longer in Inventory." }, { status: 400 });
  const cost = new Map(products.map((product) => [product.id, product.costPrice]));

  const order = await db.purchaseOrder.create({
    data: {
      reference: ref("PO"),
      supplierId,
      createdById: user.id,
      status: "SENT",
      notes: notes || null,
      items: {
        create: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitCost: line.unitCost ?? cost.get(line.productId) ?? 0,
        })),
      },
      events: { create: { status: "SENT", message: "Order sent to the manufacturer", actorName: user.name } },
    },
  });

  await audit({
    userId: user.id,
    action: "PO_SENT",
    entity: "PurchaseOrder",
    entityId: order.id,
    details: `${order.reference} → ${supplier.name} · ${lines.length} line(s)`,
  });
  return NextResponse.json({ id: order.id, reference: order.reference });
}

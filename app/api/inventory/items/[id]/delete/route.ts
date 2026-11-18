import { NextResponse } from "next/server";
import { z } from "zod";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { RETENTION_DAYS } from "@/lib/deletion";

/** Moves an item to the delete queue (restorable for RETENTION_DAYS). */
const schema = z.object({
  reason: z.string().trim().min(3, "Enter a reason for deleting this item."),
  confirm: z.literal(true, { errorMap: () => ({ message: "Tick the box to confirm." }) }),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canAdjustStock(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: { intakes: { where: { status: "PENDING" }, select: { id: true } } },
  });
  if (!product || product.purgedAt) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  if (product.deletedAt) {
    return NextResponse.json({ error: "This item is already in the delete queue." }, { status: 400 });
  }
  if (product.intakes.length) {
    return NextResponse.json(
      { error: "A delivery for this item is waiting in Inventory. Add it to stock before deleting the item." },
      { status: 400 },
    );
  }

  await db.product.update({
    where: { id },
    data: {
      active: false,
      deletedAt: new Date(),
      deleteReason: parsed.data.reason,
      deletedByName: user.name,
    },
  });
  await audit({
    userId: user.id,
    action: "ITEM_DELETED",
    entity: "Product",
    entityId: id,
    details: `${product.sku} · ${parsed.data.reason} (permanent in ${RETENTION_DAYS} days)`,
  });
  return NextResponse.json({ ok: true });
}

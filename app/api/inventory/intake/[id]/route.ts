import { NextResponse } from "next/server";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { firstIssue, intakeSchema, parseExpiry } from "@/lib/stocksheet";

/**
 * Completes a delivered line waiting in the Inventory delivery queue: saves the item's sheet
 * details on the product and adds the received quantity to stock as a new batch.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canAdjustStock(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const { id } = await params;
  const intake = await db.stockIntake.findUnique({ where: { id } });
  if (!intake || intake.status !== "PENDING") {
    return NextResponse.json({ error: "This delivery line has already been added." }, { status: 400 });
  }
  const data = parsed.data;
  const expiry = parseExpiry(data.expiry);
  if (!expiry) return NextResponse.json({ error: "Enter the expiry date." }, { status: 400 });

  const clash = await db.product.findUnique({ where: { sku: data.stockCode } });
  if (clash && clash.id !== intake.productId) {
    return NextResponse.json(
      { error: `Stock code ${data.stockCode} already belongs to ${clash.name}.` },
      { status: 400 },
    );
  }

  const added = await db.$transaction(async (tx) => {
    // Claim the line first so a double submit can't add the stock twice.
    const claimed = await tx.stockIntake.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "DONE",
        quantity: data.quantity,
        lotNumber: data.lotNumber ?? intake.deliveryNoteNo,
        expiryDate: expiry,
        completedAt: new Date(),
      },
    });
    if (claimed.count === 0) return false;

    await tx.product.update({
      where: { id: intake.productId },
      data: {
        sku: data.stockCode,
        name: data.description,
        categoryNo: data.categoryNo ?? null,
        controlled: data.type === "DDA",
        unit: data.unit,
        sellingPrice: data.price,
        costPrice: intake.unitCost || undefined,
      },
    });
    await tx.batch.create({
      data: {
        productId: intake.productId,
        lotNumber: data.lotNumber ?? intake.deliveryNoteNo,
        expiryDate: expiry,
        quantity: data.quantity,
      },
    });
    return true;
  });

  if (!added) {
    return NextResponse.json({ error: "This delivery line has already been added." }, { status: 409 });
  }

  await audit({
    userId: user.id,
    action: "DELIVERY_STOCK_ADDED",
    entity: "StockIntake",
    entityId: id,
    details: `${intake.deliveryNoteNo} · ${data.stockCode} × ${data.quantity}`,
  });

  return NextResponse.json({ ok: true });
}

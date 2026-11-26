import { NextResponse } from "next/server";
import { apiTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { firstIssue, intakeSchema, parseExpiry } from "@/lib/stocksheet";

/**
 * Completes a delivered line waiting in the Inventory delivery queue: matches it to one of this
 * business's items (or creates the item), saves the sheet details and adds the received quantity
 * to stock as a new batch. The supplier's item is remembered (ProductLink) so the next delivery
 * of it is matched automatically.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiTenant("inventory");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db } = t;
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

  const clash = await db.product.findFirst({ where: { sku: data.stockCode } });
  if (clash?.deletedAt) {
    return NextResponse.json(
      { error: `Stock code ${data.stockCode} is in the delete queue. Restore it first or use another code.` },
      { status: 400 },
    );
  }
  if (clash && intake.productId && clash.id !== intake.productId) {
    return NextResponse.json({ error: `Stock code ${data.stockCode} already belongs to ${clash.name}.` }, { status: 400 });
  }

  const details = {
    sku: data.stockCode,
    name: data.description,
    categoryNo: data.categoryNo ?? null,
    controlled: data.type === "DDA",
    unit: data.unit,
    sellingPrice: data.price,
  };

  const added = await t.tx(async (tx) => {
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

    // Matched item, an existing item with this stock code, or a new item.
    const productId = intake.productId ?? clash?.id;
    let product;
    if (productId) {
      product = await tx.product.update({
        where: { id: productId },
        data: { ...details, active: true, costPrice: intake.unitCost || undefined },
      });
    } else {
      product = await tx.product.create({
        data: {
          ...details,
          orgId: t.org.id,
          strength: intake.itemStrength,
          form: intake.itemForm,
          costPrice: intake.unitCost,
        },
      });
    }
    await tx.stockIntake.update({ where: { id }, data: { productId: product.id } });
    await tx.batch.create({
      data: {
        orgId: t.org.id,
        productId: product.id,
        lotNumber: data.lotNumber ?? intake.deliveryNoteNo,
        expiryDate: expiry,
        quantity: data.quantity,
      },
    });
    if (intake.sellerProductId && intake.tradeOrderId) {
      const order = await tx.tradeOrder.findFirst({ where: { id: intake.tradeOrderId }, select: { sellerOrgId: true } });
      if (order?.sellerOrgId) {
        await tx.productLink.upsert({
          where: { orgId_sellerProductId: { orgId: t.org.id, sellerProductId: intake.sellerProductId } },
          create: { orgId: t.org.id, sellerOrgId: order.sellerOrgId, sellerProductId: intake.sellerProductId, productId: product.id },
          update: { productId: product.id },
        });
      }
    }
    return true;
  });

  if (!added) {
    return NextResponse.json({ error: "This delivery line has already been added." }, { status: 409 });
  }

  await audit(t, {
    action: "DELIVERY_STOCK_ADDED",
    entity: "StockIntake",
    entityId: id,
    details: `${intake.deliveryNoteNo} · ${data.stockCode} × ${data.quantity}`,
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { addDays } from "date-fns";
import { setStockLevel } from "@/lib/inventory";
import { ref, stockOf } from "@/lib/utils";

/**
 * Finishes a stock sheet. For each line: open qty = current stock, close qty = counted,
 * sold = open − close, amount = sold × price. Stock is then set to the close qty.
 */
const schema = z.object({
  notes: z.string().optional(),
  applyAdjustments: z.boolean().default(true),
  items: z
    .array(
      z.object({
        productId: z.string(),
        countedQty: z.number().int().min(0),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user || !canAdjustStock(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Stock take is incomplete." }, { status: 400 });
  }

  try {
    const take = await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: parsed.data.items.map((i) => i.productId) } },
        include: { batches: { orderBy: { receivedAt: "desc" } } },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const lines = parsed.data.items
        .filter((item) => byId.has(item.productId))
        .map((item) => {
          const product = byId.get(item.productId)!;
          const systemQty = stockOf(product.batches);
          return {
            productId: item.productId,
            systemQty,
            countedQty: item.countedQty,
            variance: item.countedQty - systemQty,
            unitPrice: product.sellingPrice,
          };
        });
      if (lines.length === 0) throw new Error("No known items on this sheet.");

      const created = await tx.stockTake.create({
        data: {
          reference: ref("ST"),
          userId: user.id,
          status: "COMPLETED",
          notes: parsed.data.notes,
          completedAt: new Date(),
          items: { create: lines },
        },
      });

      if (parsed.data.applyAdjustments) {
        for (const line of lines) {
          if (line.variance !== 0) {
            // Items with no batches at all get a one-year placeholder expiry, as before.
            await setStockLevel(tx, line.productId, line.countedQty, addDays(new Date(), 365));
          }
        }
      }
      return created;
    });

    await audit({
      userId: user.id,
      action: "STOCK_TAKE",
      entity: "StockTake",
      entityId: take.id,
      details: take.reference,
    });

    return NextResponse.json(take);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the stock take.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

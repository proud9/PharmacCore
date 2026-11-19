import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays } from "date-fns";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { setStockLevel } from "@/lib/inventory";
import { ref } from "@/lib/utils";

/**
 * Finishes a stock sheet. The sheet is paged, so the client sends only the items that were
 * counted; every other active item is recorded with close qty = open qty (nothing sold).
 * For each line: open qty = current stock, close qty = counted, sold = open − close,
 * amount = sold × price. Stock is then set to the close qty for the counted items.
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
    .max(20000),
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
  const counted = new Map(parsed.data.items.map((item) => [item.productId, item.countedQty]));

  try {
    const take = await db.$transaction(
      async (tx) => {
        const [products, stock] = await Promise.all([
          tx.product.findMany({ where: { active: true }, select: { id: true, sellingPrice: true } }),
          tx.batch.groupBy({ by: ["productId"], where: { quantity: { gt: 0 } }, _sum: { quantity: true } }),
        ]);
        const onHand = new Map(stock.map((row) => [row.productId, row._sum.quantity ?? 0]));

        const lines = products.map((product) => {
          const systemQty = onHand.get(product.id) ?? 0;
          const countedQty = counted.get(product.id) ?? systemQty;
          return {
            productId: product.id,
            systemQty,
            countedQty,
            variance: countedQty - systemQty,
            unitPrice: product.sellingPrice,
          };
        });
        if (lines.length === 0) throw new Error("There are no items to count.");

        const created = await tx.stockTake.create({
          data: {
            reference: ref("ST"),
            userId: user.id,
            status: "COMPLETED",
            notes: parsed.data.notes,
            completedAt: new Date(),
            items: { createMany: { data: lines } },
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
      },
      { timeout: 60_000 },
    );

    await audit({
      userId: user.id,
      action: "STOCK_TAKE",
      entity: "StockTake",
      entityId: take.id,
      details: `${take.reference} · ${counted.size} counted`,
    });

    return NextResponse.json(take);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the stock take.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

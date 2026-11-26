import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays } from "date-fns";
import { apiTenant } from "@/lib/tenant";
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
  const auth = await apiTenant("inventory");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { user } = t;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Stock take is incomplete." }, { status: 400 });
  }
  const counted = new Map(parsed.data.items.map((item) => [item.productId, item.countedQty]));

  try {
    const take = await t.tx(
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
            orgId: t.org.id,
            productId: product.id,
            systemQty,
            countedQty,
            variance: countedQty - systemQty,
            unitPrice: product.sellingPrice,
          };
        });
        if (lines.length === 0) throw new Error("There are no items to count.");
        // A count only records what is left; stock is added in Inventory, never by a stock take.
        if (lines.some((line) => line.countedQty > line.systemQty)) {
          throw new Error("A close qty is more than the stock on hand. Add the extra stock in Inventory, then count again.");
        }

        const created = await tx.stockTake.create({
          data: {
            orgId: t.org.id,
            reference: ref("ST"),
            userId: user.id,
            userName: user.name,
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
              await setStockLevel(tx, t.org.id, line.productId, line.countedQty, addDays(new Date(), 365));
            }
          }
        }
        return created;
      },
      { timeout: 60_000 },
    );

    await audit(t, {
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

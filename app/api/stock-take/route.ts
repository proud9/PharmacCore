import { NextResponse } from "next/server";
import { z } from "zod";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ref, stockOf } from "@/lib/utils";

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

  const products = await db.product.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.productId) } },
    include: { batches: true },
  });

  const lines = parsed.data.items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const systemQty = product ? stockOf(product.batches) : 0;
    return {
      productId: item.productId,
      systemQty,
      countedQty: item.countedQty,
      variance: item.countedQty - systemQty,
    };
  });

  const take = await db.stockTake.create({
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
      const product = products.find((p) => p.id === line.productId);
      if (!product) continue;
      if (line.variance === 0) continue;
      if (line.variance < 0) {
        let remaining = Math.abs(line.variance);
        const ordered = [...product.batches].sort(
          (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime(),
        );
        for (const batch of ordered) {
          if (remaining <= 0) break;
          const takeQty = Math.min(batch.quantity, remaining);
          await db.batch.update({
            where: { id: batch.id },
            data: { quantity: batch.quantity - takeQty },
          });
          remaining -= takeQty;
        }
      } else {
        const latest = product.batches[0];
        if (latest) {
          await db.batch.update({
            where: { id: latest.id },
            data: { quantity: latest.quantity + line.variance },
          });
        } else {
          await db.batch.create({
            data: {
              productId: product.id,
              lotNumber: "ADJUST",
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              quantity: line.variance,
            },
          });
        }
      }
    }
  }

  await audit({
    userId: user.id,
    action: "STOCK_TAKE",
    entity: "StockTake",
    entityId: take.id,
    details: take.reference,
  });

  return NextResponse.json(take);
}

import { addDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export async function onHand(productId: string) {
  const batches = await db.batch.findMany({ where: { productId } });
  return batches.reduce((sum, batch) => sum + batch.quantity, 0);
}

/** Removes stock earliest-expiry first. Pass the transaction client so a failure rolls back every batch change. */
export async function deductStock(tx: Prisma.TransactionClient, productId: string, quantity: number) {
  const batches = await tx.batch.findMany({
    where: { productId, quantity: { gt: 0 } },
    orderBy: { expiryDate: "asc" },
  });
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    await tx.batch.update({
      where: { id: batch.id },
      data: { quantity: batch.quantity - take },
    });
    remaining -= take;
  }
  if (remaining > 0) {
    throw new Error("Insufficient stock");
  }
}

/**
 * Sets a product's stock on hand to `target` and returns the previous level.
 * A shortfall is removed earliest-expiry first; a surplus is added to the most recently
 * received batch, or to a new "ADJUST" batch with `newBatchExpiry` when the product has none.
 */
export async function setStockLevel(
  tx: Prisma.TransactionClient,
  productId: string,
  target: number,
  newBatchExpiry?: Date | null,
  newBatchLot = "ADJUST",
  newBatchEntered?: Date | null,
) {
  const batches = await tx.batch.findMany({ where: { productId }, orderBy: { receivedAt: "desc" } });
  const current = batches.reduce((sum, batch) => sum + batch.quantity, 0);
  const change = target - current;
  if (change < 0) {
    await deductStock(tx, productId, -change);
  } else if (change > 0) {
    const latest = batches[0];
    if (latest) {
      await tx.batch.update({ where: { id: latest.id }, data: { quantity: latest.quantity + change } });
    } else if (newBatchExpiry) {
      await tx.batch.create({
        data: {
          productId,
          lotNumber: newBatchLot,
          expiryDate: newBatchExpiry,
          quantity: change,
          ...(newBatchEntered ? { receivedAt: newBatchEntered } : {}),
        },
      });
    } else {
      throw new Error("Enter an expiry date for the added stock.");
    }
  }
  return current;
}

export async function receiveBatch(input: {
  productId: string;
  lotNumber: string;
  expiryDate: Date;
  quantity: number;
}) {
  await db.batch.create({ data: input });
}

export function expiryWindow() {
  return addDays(new Date(), 90);
}

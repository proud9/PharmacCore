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

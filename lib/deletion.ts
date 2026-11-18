import { addDays, differenceInCalendarDays, subDays } from "date-fns";
import { db } from "./db";
import { audit } from "./audit";

/**
 * Inventory delete queue. Deleting an item hides it (active = false, deletedAt set) and keeps
 * it restorable for RETENTION_DAYS. After that it is permanently deleted:
 * - no history (never sold, prescribed, ordered, counted or delivered): the item and its
 *   batches are erased;
 * - with history: its batches are erased and the item is locked as purged (hidden, not
 *   restorable, stock code freed) so past receipts and reports stay intact.
 */
export const RETENTION_DAYS = 30;

export function purgeDateOf(deletedAt: Date) {
  return addDays(deletedAt, RETENTION_DAYS);
}

export function daysLeft(deletedAt: Date, now = new Date()) {
  return Math.max(0, differenceInCalendarDays(purgeDateOf(deletedAt), now));
}

/** Permanently deletes queue items older than RETENTION_DAYS. Safe to call on every page load. */
export async function purgeExpiredDeletions(now = new Date()) {
  const due = await db.product.findMany({
    where: { deletedAt: { lte: subDays(now, RETENTION_DAYS) }, purgedAt: null },
    include: {
      _count: {
        select: {
          saleItems: true,
          prescriptionItems: true,
          purchaseItems: true,
          stockTakeItems: true,
          consignmentItems: true,
          intakes: true,
        },
      },
    },
  });

  for (const product of due) {
    const hasHistory = Object.values(product._count).some((count) => count > 0);
    await db.$transaction(async (tx) => {
      await tx.batch.deleteMany({ where: { productId: product.id } });
      if (hasHistory) {
        await tx.product.update({
          where: { id: product.id },
          data: { purgedAt: now, sku: `${product.sku}~DEL-${product.id.slice(-6)}` },
        });
      } else {
        await tx.product.delete({ where: { id: product.id } });
      }
    });
    await audit({
      action: "ITEM_PURGED",
      entity: "Product",
      entityId: hasHistory ? product.id : undefined,
      details: `${product.sku} · ${product.name}${hasHistory ? " (kept for history)" : ""}`,
    });
  }
  return due.length;
}

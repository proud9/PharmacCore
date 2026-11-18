import Link from "next/link";
import { Trash2 } from "lucide-react";
import { format, isBefore } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { InventoryTable, type InventoryRow } from "@/components/inventory/InventoryTable";
import { IntakeQueue, type IntakeRow } from "@/components/inventory/IntakeQueue";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { expiryWindow } from "@/lib/inventory";
import { purgeExpiredDeletions } from "@/lib/deletion";
import { drugTypeOf } from "@/lib/stocksheet";
import { stockOf } from "@/lib/utils";

/**
 * Inventory is where stock and items are added or changed: the delivery queue from
 * supplier delivery notes, "Add item", CSV import, and per-row edits.
 */
export default async function InventoryPage() {
  await purgeExpiredDeletions();
  const [user, products, intakes, deletedCount] = await Promise.all([
    requireUser(),
    db.product.findMany({
      where: { active: true },
      include: { batches: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: "asc" } } },
      orderBy: { sku: "asc" },
    }),
    db.stockIntake.findMany({
      where: { status: "PENDING" },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    }),
    db.product.count({ where: { deletedAt: { not: null }, purgedAt: null } }),
  ]);
  const canEdit = Boolean(user && canAdjustStock(user.role));
  const today = new Date();
  const soon = expiryWindow();

  const rows: InventoryRow[] = products.map((p) => {
    const nearest = p.batches[0]?.expiryDate ?? null;
    return {
      id: p.id,
      sku: p.sku,
      categoryNo: p.categoryNo,
      name: p.name,
      type: drugTypeOf(p.controlled),
      unit: p.unit,
      price: p.sellingPrice,
      requiresRx: p.requiresRx,
      onHand: stockOf(p.batches),
      reorderLevel: p.reorderLevel,
      expiry: nearest ? format(nearest, "yyyy-MM-dd") : null,
      expiryLabel: nearest ? format(nearest, "dd MMM yyyy") : null,
      enteredLabel: p.batches[0] ? format(p.batches[0].receivedAt, "dd MMM yyyy") : null,
      entered: p.batches[0] ? format(p.batches[0].receivedAt, "yyyy-MM-dd") : null,
      batchNo: p.batches[0]?.lotNumber ?? null,
      otherBatches: Math.max(0, p.batches.length - 1),
      expired: nearest ? isBefore(nearest, today) : false,
      nearExpiry: nearest ? !isBefore(nearest, today) && !isBefore(soon, nearest) : false,
    };
  });

  const queue: IntakeRow[] = intakes.map((intake) => ({
    id: intake.id,
    deliveryNoteNo: intake.deliveryNoteNo,
    supplierName: intake.supplierName,
    receivedOn: format(intake.createdAt, "dd MMM yyyy"),
    quantity: intake.quantity,
    unitCost: intake.unitCost,
    product: {
      sku: intake.product.sku,
      name: intake.product.name,
      categoryNo: intake.product.categoryNo,
      type: drugTypeOf(intake.product.controlled),
      unit: intake.product.unit,
      price: intake.product.sellingPrice,
    },
  }));

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Add and edit items, receive delivered stock, and correct stock levels. Counting is done in Stock take."
        action={
          <Link href="/inventory/deleted" className="btn btn-ghost">
            <Trash2 className="h-4 w-4" />
            Delete queue{deletedCount ? ` (${deletedCount})` : ""}
          </Link>
        }
      />
      {queue.length ? <IntakeQueue rows={queue} canEdit={canEdit} /> : null}
      <InventoryTable rows={rows} canEdit={canEdit} />
    </div>
  );
}

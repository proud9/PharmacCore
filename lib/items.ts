import { audit } from "./audit";
import type { Tenant } from "./tenant";
import { firstIssue, itemSchema, parseExpiry } from "./stocksheet";

export type ItemResult = { row: number; productId: string; status: "created" | "updated"; stockIgnored?: boolean };
export type ItemError = { row: number; message: string };

/**
 * Adds or updates inventory items (from the "Add item" form, a CSV or the Excel template).
 * Matching is by stock code (Product.sku):
 * - existing item: description, category no., type, unit, price (and prescription, when given)
 *   are updated; stock is not touched (use the row edit, a delivery, or the product page).
 * - new item: the product is created, and its opening stock becomes an "OPENING" batch
 *   with the given expiry (required) and entered date (defaults to today).
 * Each row stands alone, so one bad row doesn't block the rest of an import.
 */
export async function saveItems(t: Tenant, rows: { row: number; input: unknown }[]) {
  const { db } = t;
  const results: ItemResult[] = [];
  const errors: ItemError[] = [];
  const seen = new Set<string>();

  for (const { row, input } of rows) {
    const parsed = itemSchema.safeParse(input);
    if (!parsed.success) {
      errors.push({ row, message: firstIssue(parsed.error) });
      continue;
    }
    const line = parsed.data;
    const code = line.stockCode.toUpperCase();
    if (seen.has(code)) {
      errors.push({ row, message: `Stock code ${line.stockCode} appears more than once.` });
      continue;
    }
    seen.add(code);

    const details = {
      name: line.description,
      categoryNo: line.categoryNo ?? null,
      controlled: line.type === "DDA",
      unit: line.unit,
      sellingPrice: line.price,
      ...(line.requiresRx === undefined ? {} : { requiresRx: line.requiresRx }),
    };

    try {
      const existing = await db.product.findUnique({ where: { orgId_sku: { orgId: t.org.id, sku: line.stockCode } } });
      if (existing?.deletedAt) {
        errors.push({ row, message: `Stock code ${line.stockCode} is in the delete queue. Restore it from the delete queue to use it again.` });
        continue;
      }
      if (existing) {
        await db.product.update({ where: { id: existing.id }, data: { ...details, active: true } });
        results.push({ row, productId: existing.id, status: "updated", stockIgnored: (line.openingStock ?? 0) > 0 });
        continue;
      }

      const openingStock = line.openingStock ?? 0;
      const expiry = line.expiry ? parseExpiry(line.expiry) : null;
      const entered = line.entered ? parseExpiry(line.entered) : null;
      if (openingStock > 0 && !expiry) {
        errors.push({ row, message: "New items with opening stock need an expiry date." });
        continue;
      }
      const product = await t.tx(async (tx) => {
        const created = await tx.product.create({
          data: { orgId: t.org.id, sku: line.stockCode, costPrice: 0, ...details },
        });
        if (openingStock > 0 && expiry) {
          await tx.batch.create({
            data: {
              orgId: t.org.id,
              productId: created.id,
              lotNumber: line.batchNo ?? "OPENING",
              expiryDate: expiry,
              quantity: openingStock,
              ...(entered ? { receivedAt: entered } : {}),
            },
          });
        }
        return created;
      });
      results.push({ row, productId: product.id, status: "created" });
    } catch {
      errors.push({ row, message: "Could not save this line." });
    }
  }

  if (results.length) {
    const created = results.filter((r) => r.status === "created").length;
    await audit(t, {
      action: "INVENTORY_ITEMS_SAVED",
      entity: "Product",
      details: `${created} added, ${results.length - created} updated`,
    });
  }

  return { results, errors };
}

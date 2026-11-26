import { NextResponse } from "next/server";
import { format } from "date-fns";
import { apiTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { setStockLevel } from "@/lib/inventory";
import { editItemSchema, firstIssue, parseExpiry } from "@/lib/stocksheet";

/**
 * Edits one inventory item: its details (code, category no., description, type, unit, price)
 * and its current stock on hand. A stock change is applied to the batches and logged.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiTenant("inventory");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db } = t;
  const parsed = editItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const { id } = await params;
  const data = parsed.data;

  const product = await db.product.findUnique({ where: { id } });
  if (!product || product.deletedAt) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  const clash = await db.product.findFirst({ where: { sku: data.stockCode } });
  if (clash && clash.id !== id) {
    return NextResponse.json({ error: `Stock code ${data.stockCode} already belongs to ${clash.name}.` }, { status: 400 });
  }

  try {
    const { previous: before, batchChange } = await t.tx(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          sku: data.stockCode,
          categoryNo: data.categoryNo ?? null,
          name: data.description,
          controlled: data.type === "DDA",
          unit: data.unit,
          sellingPrice: data.price,
          ...(data.requiresRx === undefined ? {} : { requiresRx: data.requiresRx }),
        },
      });
      // Batch no. belongs to the batch shown in Inventory: the earliest-expiring one with stock.
      // Batch no. and Entered belong to the batch shown in Inventory: the earliest-expiring one with stock.
      const changes: string[] = [];
      const entered = data.entered ? parseExpiry(data.entered) : null;
      const shown = await tx.batch.findFirst({
        where: { productId: id, quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
      });
      if (shown) {
        const update: { lotNumber?: string; receivedAt?: Date; expiryDate?: Date } = {};
        const expiry = data.expiry ? parseExpiry(data.expiry) : null;
        if (expiry && format(shown.expiryDate, "yyyy-MM-dd") !== data.expiry) {
          update.expiryDate = expiry;
          changes.push(`expiry ${format(shown.expiryDate, "dd MMM yyyy")} → ${format(expiry, "dd MMM yyyy")}`);
        }
        if (data.batchNo && shown.lotNumber !== data.batchNo) {
          update.lotNumber = data.batchNo;
          changes.push(`batch ${shown.lotNumber} → ${data.batchNo}`);
        }
        if (entered && format(shown.receivedAt, "yyyy-MM-dd") !== data.entered) {
          update.receivedAt = entered;
          changes.push(`entered ${format(shown.receivedAt, "dd MMM yyyy")} → ${format(entered, "dd MMM yyyy")}`);
        }
        if (Object.keys(update).length) await tx.batch.update({ where: { id: shown.id }, data: update });
      }
      const batchChange = changes.length ? changes.join(", ") : null;
      const previous = await setStockLevel(
        tx,
        t.org.id,
        id,
        data.currentStock,
        data.expiry ? parseExpiry(data.expiry) : null,
        data.batchNo ?? "ADJUST",
        entered,
      );
      return { previous, batchChange };
    });

    await audit(t, {
      action: before === data.currentStock ? "PRODUCT_UPDATED" : "STOCK_ADJUSTED",
      entity: "Product",
      entityId: id,
      details: [
        before === data.currentStock ? data.stockCode : `${data.stockCode}: ${before} → ${data.currentStock}`,
        batchChange,
        `reason: ${data.reason}`,
      ]
        .filter(Boolean)
        .join(" · "),
    });

    return NextResponse.json({ ok: true, previousStock: before });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this item.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

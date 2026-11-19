import { NextResponse } from "next/server";
import { z } from "zod";
import { canFinance, isManufacturer } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { loadPurchaseOrder } from "@/lib/purchase-access";
import { PO_INVOICEABLE, poTotal } from "@/lib/purchasing";

/** The manufacturer issues (or corrects) its invoice once the price is accepted. Finance then records payments. */
const schema = z.object({
  invoiceNo: z.string().trim().min(1).max(60),
  dueOn: z.string().min(4),
  terms: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The manufacturer's own account, or finance entering a manufacturer's paper invoices (manufacturers without a login).
  const loaded = await loadPurchaseOrder(id, "either");
  if ("error" in loaded) return loaded.error;
  const { user, order } = loaded;
  const manufacturer = isManufacturer(user.role);
  if (!manufacturer && !canFinance(user.role)) {
    return NextResponse.json({ error: "Only finance can enter a manufacturer's invoices." }, { status: 403 });
  }
  const actor = manufacturer ? `${user.name} (${order.supplier.name})` : `${user.name} for ${order.supplier.name}`;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your invoice number and the due date." }, { status: 400 });
  if (!PO_INVOICEABLE.includes(order.status)) {
    return NextResponse.json({ error: "Invoice once the wholesale has accepted your price." }, { status: 400 });
  }
  const first = !order.invoiceNo;

  await db.purchaseOrder.update({
    where: { id },
    data: {
      invoiceNo: parsed.data.invoiceNo,
      invoicedAt: order.invoicedAt ?? new Date(),
      dueOn: new Date(parsed.data.dueOn),
      terms: parsed.data.terms || order.terms,
      // Older orders were never priced by the manufacturer: the invoice is for the ordered cost.
      quotedAmount: order.quotedAmount ?? poTotal(order),
      events: {
        create: {
          status: order.status,
          message: first ? `Invoice ${parsed.data.invoiceNo} issued` : `Invoice ${parsed.data.invoiceNo} updated`,
          actorName: actor,
        },
      },
    },
  });

  await audit({
    userId: user.id,
    action: first ? "PO_INVOICED" : "PO_INVOICE_UPDATED",
    entity: "PurchaseOrder",
    entityId: id,
    details: `${order.reference} · invoice ${parsed.data.invoiceNo}`,
  });
  return NextResponse.json({ ok: true });
}

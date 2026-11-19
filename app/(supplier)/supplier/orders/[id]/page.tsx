import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPharmacy } from "@/lib/pharmacy";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { OrderTrack } from "@/components/wholesale/OrderTrack";
import { PoActions } from "@/components/purchasing/PoActions";
import { SupplierQuoteForm } from "@/components/purchasing/SupplierQuoteForm";
import { SupplierInvoiceForm } from "@/components/purchasing/SupplierInvoiceForm";
import { DispatchForm } from "@/components/purchasing/DispatchForm";
import { zmw } from "@/lib/documents";
import { PO_ACCEPTED, PO_INVOICEABLE, PO_QUOTABLE, PO_SUPPLIER_LABEL, poStatusTone } from "@/lib/purchasing";

const day = (value: Date | null) => (value ? format(value, "dd MMM yyyy") : null);
const ymd = (value: Date | null) => (value ? format(value, "yyyy-MM-dd") : "");

export default async function SupplierOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const order = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true, sku: true } } } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  // Another manufacturer's order looks exactly like a missing one.
  if (!user?.supplierId || !order || order.supplierId !== user.supplierId) notFound();
  const wholesaler = await getPharmacy();
  const priced = order.quotedAmount != null;
  const balance = priced ? order.quotedAmount! - order.amountPaid : 0;
  const showSent = order.status === "DISPATCHED" || order.status === "RECEIVED";

  return (
    <div>
      <PageHeader
        eyebrow={order.reference}
        title={wholesaler?.name ?? "Purchase order"}
        description={[wholesaler?.address, wholesaler?.phone, wholesaler?.email].filter(Boolean).join(" · ") || "Purchase order"}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={poStatusTone(order.status)}>{PO_SUPPLIER_LABEL[order.status] ?? order.status}</Badge>
        {priced ? <Badge tone="brass">{zmw(order.quotedAmount!)}</Badge> : null}
        <Badge>Ordered {day(order.createdAt)}</Badge>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <h2 className="mb-3 font-display text-xl text-pine-900">Items ordered</h2>
            <div className="overflow-x-auto">
              <table className="table-grid">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Your price</th>
                    <th>Line total</th>
                    {showSent ? <th>Sent</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.product.name}
                        <p className="font-mono text-[11px] text-ink/50">{item.product.sku}</p>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{priced ? zmw(item.unitCost) : "—"}</td>
                      <td>{priced ? zmw(item.unitCost * item.quantity) : "—"}</td>
                      {showSent ? <td>{item.qtyDispatched ?? "—"}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {order.taxRate && priced ? <p className="mt-2 text-sm text-ink/70">Tax {order.taxRate}% included in the total.</p> : null}
            {order.notes ? <p className="mt-2 text-sm text-ink/70">Notes from the wholesale: {order.notes}</p> : null}
            {order.deliveryNoteNo ? (
              <p className="mt-2 text-sm text-ink/70">
                Delivery note <span className="font-mono">{order.deliveryNoteNo}</span>
                {order.receivedAt ? ` · received ${day(order.receivedAt)}` : ""}
              </p>
            ) : null}
            {PO_QUOTABLE.includes(order.status) ? (
              <PoActions id={order.id} actions={[{ status: "DECLINED", label: "Decline order", askReason: true }]} />
            ) : null}
          </section>
          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <h2 className="mb-3 font-display text-xl text-pine-900">Progress</h2>
            <OrderTrack events={order.events} labels={PO_SUPPLIER_LABEL} tone={poStatusTone} />
          </section>
        </div>
        <div className="space-y-4">
          {order.invoiceNo && priced ? (
            <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
              <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Payment</p>
              <p className="mt-2 text-sm">
                Invoice <span className="font-mono">{order.invoiceNo}</span> · paid {zmw(order.amountPaid)} of{" "}
                {zmw(order.quotedAmount!)}
                {order.dueOn ? ` · due ${day(order.dueOn)}` : ""}
              </p>
              <p className="mt-1 text-sm font-semibold text-pine-900">
                {balance > 0.005 ? `Balance due ${zmw(balance)}` : "Paid in full"}
              </p>
            </section>
          ) : null}
          {order.status === "QUOTED" ? (
            <p className="rounded-2xl border border-pine-900/10 bg-white p-5 text-sm text-ink/70 shadow-panel">
              Price sent{order.validUntil ? `, valid until ${day(order.validUntil)}` : ""}. Waiting for the wholesale to accept it.
              You can still change it below.
            </p>
          ) : null}
          {PO_QUOTABLE.includes(order.status) ? (
            <SupplierQuoteForm
              id={order.id}
              requote={order.status === "QUOTED"}
              taxRate={order.taxRate}
              readyOn={ymd(order.readyOn)}
              validUntil={ymd(order.validUntil)}
              message={order.supplierMessage ?? ""}
              terms={order.terms ?? ""}
              lines={order.items.map((item) => ({
                id: item.id,
                name: item.product.name,
                quantity: item.quantity,
                unitCost: order.status === "QUOTED" ? item.unitCost : 0,
              }))}
            />
          ) : null}
          {PO_INVOICEABLE.includes(order.status) ? (
            <SupplierInvoiceForm
              id={order.id}
              invoiceNo={order.invoiceNo ?? ""}
              dueOn={ymd(order.dueOn)}
              terms={order.terms ?? ""}
            />
          ) : null}
          {PO_ACCEPTED.includes(order.status) ? (
            <DispatchForm
              id={order.id}
              lines={order.items.map((item) => ({ id: item.id, name: item.product.name, quantity: item.quantity }))}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

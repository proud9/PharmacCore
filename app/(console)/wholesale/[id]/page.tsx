import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { canWholesale, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import Link from "next/link";
import { QuoteForm } from "@/components/wholesale/QuoteForm";
import { InvoiceForm } from "@/components/wholesale/InvoiceForm";
import { DeliveryForm } from "@/components/wholesale/DeliveryForm";
import { StatusActions } from "@/components/wholesale/StatusActions";
import { OrderTrack } from "@/components/wholesale/OrderTrack";
import { adminNextStatuses, KIND_LABEL, STATUS_LABEL, statusTone } from "@/lib/wholesale";
import { DELIVERY_STATUSES, documentTotals, INVOICE_STATUSES, QUOTE_STATUSES, zmw } from "@/lib/documents";

export default async function WholesaleOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canWholesale(user.role)) redirect("/dashboard");
  const { id } = await params;
  const order = await db.consignment.findUnique({
    where: { id },
    include: {
      institution: true,
      requestedBy: true,
      quotedBy: true,
      items: { include: { product: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  const totals = documentTotals(order.items, order.taxRate, order.quotedAmount);

  return (
    <div>
      <PageHeader
        eyebrow={order.reference}
        title={order.institution.name}
        description={`${KIND_LABEL[order.institution.kind] ?? order.institution.kind} · requested by ${order.requestedBy.name}`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(order.status)}>{STATUS_LABEL[order.status]}</Badge>
        {order.quotedAmount != null ? <Badge tone="brass">{zmw(totals.total)}</Badge> : null}
        {order.readyOn ? <Badge>Ready {format(order.readyOn, "dd MMM yyyy")}</Badge> : null}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <h2 className="mb-3 font-display text-xl text-pine-900">Items requested</h2>
            <table className="table-grid">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.product.name}
                      <p className="font-mono text-[11px] text-ink/50">{item.product.sku}</p>
                    </td>
                    <td>{item.product.kind === "EQUIPMENT" ? "Equipment" : "Medicine"}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unitPrice == null ? "—" : zmw(item.unitPrice)}</td>
                    <td>{item.unitPrice == null ? "—" : zmw(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {order.notes ? <p className="mt-3 text-sm text-ink/70">Buyer notes: {order.notes}</p> : null}
            {order.deliveryAddress ? (
              <p className="mt-1 text-sm text-ink/70">Deliver to: {order.deliveryAddress}</p>
            ) : null}
            <StatusActions id={order.id} options={adminNextStatuses(order.status)} />
          </section>
          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <h2 className="mb-3 font-display text-xl text-pine-900">Tracking</h2>
            <OrderTrack events={order.events} />
          </section>
        </div>
        <div className="space-y-4">
          {order.adminMessage ? (
            <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
              <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Last message to buyer</p>
              <p className="mt-2 text-sm">{order.adminMessage}</p>
              {order.quotedBy ? <p className="mt-2 text-xs text-ink/50">By {order.quotedBy.name}</p> : null}
            </section>
          ) : null}
          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <h2 className="font-display text-xl text-pine-900">Documents</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              {QUOTE_STATUSES.includes(order.status) ? (
                <Link className="text-pine-800 underline" href={`/documents/${order.id}/quotation`}>
                  Open quotation
                </Link>
              ) : (
                <p className="text-ink/50">Quotation appears after you send a price.</p>
              )}
              {order.invoiceNo ? (
                <Link className="text-pine-800 underline" href={`/documents/${order.id}/invoice`}>
                  Open invoice {order.invoiceNo}
                </Link>
              ) : null}
              {order.deliveryNoteNo ? (
                <Link className="text-pine-800 underline" href={`/documents/${order.id}/delivery`}>
                  Open delivery note {order.deliveryNoteNo}
                </Link>
              ) : null}
            </div>
          </section>
          {["REQUESTED", "QUOTED", "ACCEPTED"].includes(order.status) ? (
            <QuoteForm
              id={order.id}
              taxRate={order.taxRate}
              terms={order.terms ?? ""}
              adminMessage={order.adminMessage ?? ""}
              lines={order.items.map((item) => ({
                id: item.id,
                name: item.product.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice ?? item.product.wholesalePrice ?? item.product.sellingPrice,
              }))}
            />
          ) : null}
          {INVOICE_STATUSES.includes(order.status) && order.quotedAmount != null ? (
            <InvoiceForm
              id={order.id}
              issued={Boolean(order.invoiceNo)}
              amountPaid={order.amountPaid}
              terms={order.terms ?? ""}
              dueOn={order.dueOn ? format(order.dueOn, "yyyy-MM-dd") : ""}
            />
          ) : null}
          {DELIVERY_STATUSES.includes(order.status) ? (
            <DeliveryForm
              id={order.id}
              issued={Boolean(order.deliveryNoteNo)}
              deliveryMethod={order.deliveryMethod ?? ""}
              vehicleDriver={order.vehicleDriver ?? ""}
              dispatchFrom={order.dispatchFrom ?? ""}
              deliveryNotes={order.deliveryNotes ?? ""}
              lines={order.items.map((item) => ({
                id: item.id,
                name: item.product.name,
                quantity: item.quantity,
                qtyDelivered: item.qtyDelivered ?? item.quantity,
                remarks: item.remarks ?? "",
              }))}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

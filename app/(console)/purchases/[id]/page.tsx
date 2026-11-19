import { notFound } from "next/navigation";
import { format } from "date-fns";
import { canFinance, canSell, isStaff, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { OrderTrack } from "@/components/wholesale/OrderTrack";
import { ReceivePoButton } from "@/components/forms/ReceivePoButton";
import { PoActions } from "@/components/purchasing/PoActions";
import { PaymentForm } from "@/components/purchasing/PaymentForm";
import { SupplierQuoteForm } from "@/components/purchasing/SupplierQuoteForm";
import { SupplierInvoiceForm } from "@/components/purchasing/SupplierInvoiceForm";
import { zmw } from "@/lib/documents";
import {
  PO_CANCELLABLE,
  PO_CLOSED,
  PO_INVOICEABLE,
  PO_QUOTABLE,
  PO_STATUS_LABEL,
  poStatusTone,
  poTotal,
} from "@/lib/purchasing";

const day = (value: Date | null) => (value ? format(value, "dd MMM yyyy") : null);
const ymd = (value: Date | null) => (value ? format(value, "yyyy-MM-dd") : "");

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !isStaff(user.role)) notFound();
  const { id } = await params;
  const order = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { include: { _count: { select: { users: true } } } },
      createdBy: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const finance = canFinance(user.role);
  const sales = canSell(user.role);
  const hasLogin = order.supplier._count.users > 0;
  const total = poTotal(order);
  const balance = order.quotedAmount != null ? order.quotedAmount - order.amountPaid : 0;
  const expired = order.validUntil != null && order.validUntil.getTime() < Date.now() - 24 * 60 * 60 * 1000;

  const actions: Parameters<typeof PoActions>[0]["actions"] = [];
  if (finance && order.status === "QUOTED" && !expired) actions.push({ status: "ACCEPTED", label: "Accept price", primary: true });
  if ((finance || sales) && PO_CANCELLABLE.includes(order.status)) {
    actions.push({ status: "CANCELLED", label: "Cancel order", askReason: true });
  }

  return (
    <div>
      <PageHeader
        eyebrow={order.reference}
        title={order.supplier.name}
        description={`Raised by ${order.createdBy.name} · ${format(order.createdAt, "dd MMM yyyy")}${hasLogin ? "" : " · manufacturer has no login"}`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={poStatusTone(order.status)}>{PO_STATUS_LABEL[order.status] ?? order.status}</Badge>
        {total > 0 ? <Badge tone="brass">{zmw(total)}</Badge> : null}
        {order.readyOn ? <Badge>Ready {day(order.readyOn)}</Badge> : null}
        {order.validUntil ? <Badge tone={expired ? "bad" : "neutral"}>Price valid until {day(order.validUntil)}</Badge> : null}
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
                    <th>{order.quotedAmount != null ? "Unit price" : "Expected cost"}</th>
                    <th>Line total</th>
                    {order.status === "DISPATCHED" || order.status === "RECEIVED" ? <th>Sent</th> : null}
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
                      {/* Items never bought before have no cost yet: say so rather than show ZMW 0.00. */}
                      <td>{item.unitCost > 0 || order.quotedAmount != null ? zmw(item.unitCost) : "Not priced yet"}</td>
                      <td>{item.unitCost > 0 || order.quotedAmount != null ? zmw(item.unitCost * item.quantity) : "—"}</td>
                      {order.status === "DISPATCHED" || order.status === "RECEIVED" ? <td>{item.qtyDispatched ?? "—"}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {order.taxRate ? <p className="mt-2 text-sm text-ink/70">Tax {order.taxRate}% included in the total.</p> : null}
            {order.notes ? <p className="mt-2 text-sm text-ink/70">Notes to manufacturer: {order.notes}</p> : null}
            {order.deliveryNoteNo ? (
              <p className="mt-2 text-sm text-ink/70">
                Delivery note <span className="font-mono">{order.deliveryNoteNo}</span>
                {order.deliveryMethod ? ` · ${order.deliveryMethod}` : ""}
                {order.receivedAt ? ` · received ${day(order.receivedAt)}` : order.dispatchedAt ? ` · dispatched ${day(order.dispatchedAt)}` : ""}
              </p>
            ) : null}
            <PoActions id={order.id} actions={actions} />
            {sales && !PO_CLOSED.includes(order.status) ? (
              <ReceivePoButton
                id={order.id}
                deliveryNoteNo={order.deliveryNoteNo ?? ""}
                lines={order.items.map((item) => ({
                  id: item.id,
                  name: item.product.name,
                  ordered: item.quantity,
                  sent: item.qtyDispatched ?? undefined,
                }))}
              />
            ) : null}
          </section>
          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <h2 className="mb-3 font-display text-xl text-pine-900">Tracking</h2>
            <OrderTrack events={order.events} labels={PO_STATUS_LABEL} tone={poStatusTone} />
            {order.events.length === 0 ? <p className="text-sm text-ink/60">No steps recorded for this older order.</p> : null}
          </section>
        </div>
        <div className="space-y-4">
          {order.supplierMessage || order.terms ? (
            <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
              <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">From the manufacturer</p>
              {order.supplierMessage ? <p className="mt-2 text-sm">{order.supplierMessage}</p> : null}
              {order.terms ? <p className="mt-2 text-sm text-ink/70">Terms: {order.terms}</p> : null}
            </section>
          ) : null}
          {order.invoiceNo && order.quotedAmount != null ? (
            <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
              <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Manufacturer&apos;s invoice</p>
              <p className="mt-2 text-sm">
                <span className="font-mono">{order.invoiceNo}</span> · paid {zmw(order.amountPaid)} of {zmw(order.quotedAmount)}
                {order.dueOn ? ` · due ${day(order.dueOn)}` : ""}
              </p>
              <p className="mt-1 text-sm font-semibold text-pine-900">
                {balance > 0.005 ? `Still to pay ${zmw(balance)}` : "Paid in full"}
              </p>
            </section>
          ) : null}
          {finance && order.invoiceNo && order.quotedAmount != null ? (
            <PaymentForm id={order.id} amountPaid={order.amountPaid} total={order.quotedAmount} />
          ) : null}
          {finance && !hasLogin && PO_QUOTABLE.includes(order.status) ? (
            <SupplierQuoteForm
              id={order.id}
              onBehalf={order.supplier.name}
              requote={order.status === "QUOTED"}
              taxRate={order.taxRate}
              readyOn={ymd(order.readyOn)}
              validUntil={ymd(order.validUntil)}
              message={order.supplierMessage ?? ""}
              terms={order.terms ?? ""}
              lines={order.items.map((item) => ({ id: item.id, name: item.product.name, quantity: item.quantity, unitCost: item.unitCost }))}
            />
          ) : null}
          {finance && !hasLogin && PO_INVOICEABLE.includes(order.status) ? (
            <SupplierInvoiceForm
              id={order.id}
              onBehalf={order.supplier.name}
              invoiceNo={order.invoiceNo ?? ""}
              dueOn={ymd(order.dueOn)}
              terms={order.terms ?? ""}
            />
          ) : null}
          {hasLogin && order.status === "SENT" ? (
            <p className="rounded-2xl border border-pine-900/10 bg-white p-5 text-sm text-ink/70 shadow-panel">
              Waiting for {order.supplier.name} to send a price in Parallax.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

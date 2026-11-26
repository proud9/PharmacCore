import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, FileText } from "lucide-react";
import type { Tenant } from "@/lib/tenant";
import { can } from "@/lib/capabilities";
import { balanceOf, effectiveStatus, PAYMENT_METHOD_LABEL, plainStatus, statusLabel, statusTone, termsText, type Side } from "@/lib/trade";
import { actsAs, dueDate, loadOrder, viewFor } from "@/lib/trade-server";
import { money } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import {
  AcceptForm,
  DispatchForm,
  InvoiceForm,
  NotesForm,
  PaymentForm,
  QuoteForm,
  ReceiveForm,
  StepButton,
  type FormLine,
} from "@/components/trade/OrderForms";

function ymd(date: Date | null) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

/**
 * One order, from the side this business is on. Shows only that side's private fields, and the
 * step forms this business may take now (both sides' on an OFFLINE order it created).
 */
export async function OrderDetail({ t, id, expect }: { t: Tenant; id: string; expect: Side }) {
  const loaded = await loadOrder(t, id);
  if (!loaded || loaded.side !== expect) notFound();
  const side = loaded.side;
  const order = viewFor(loaded.order, side);
  const me = t.org.id;
  const asSeller = actsAs(order, me, "seller") && !t.readOnly;
  const asBuyer = actsAs(order, me, "buyer") && !t.readOnly;
  const offline = order.channel === "OFFLINE";
  const other = side === "seller" ? order.buyerName : order.sellerName;
  const status = effectiveStatus(order);
  const balance = balanceOf(order);
  const currency = t.org.currency;
  const priced = order.items.some((item) => item.unitPrice != null);
  const back = side === "seller" ? "/orders" : "/purchases";

  // Names of this seller's own items linked to lines (seller only, for the price form).
  const linkedIds = side === "seller" ? order.items.map((i) => i.sellerProductId).filter((v): v is string => !!v) : [];
  const linked = linkedIds.length ? await t.db.product.findMany({ where: { id: { in: linkedIds } }, select: { id: true, name: true } }) : [];
  const linkedName = new Map(linked.map((p) => [p.id, p.name]));
  const lines: FormLine[] = order.items.map((item) => ({
    id: item.id,
    name: item.name,
    strength: item.strength,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    qtyDispatched: item.qtyDispatched,
    sellerProductId: item.sellerProductId,
    sellerProductName: item.sellerProductId ? linkedName.get(item.sellerProductId) ?? null : null,
  }));

  const docs: { kind: string; label: string }[] = [{ kind: "inquiry", label: "Inquiry" }];
  if (order.quoteNo) docs.push({ kind: "quotation", label: "Quotation" });
  if (order.orderedAt || order.poNumber) docs.push({ kind: "purchase-order", label: "Purchase order" });
  if (order.invoicedAt) docs.push({ kind: "invoice", label: "Invoice" });
  if (order.dispatchedAt) docs.push({ kind: "delivery-note", label: "Delivery note" });

  const canPrice = asSeller && ["INQUIRY", "QUOTED", "ORDERED", "PREPARING", "READY"].includes(order.status) && !order.invoicedAt;
  const open = ["ORDERED", "PREPARING", "READY"].includes(order.status);
  const sellerKeepsStock = order.sellerOrgId === me && can(t.org.kind, "inventory");
  const buyerKeepsStock = order.buyerOrgId === me && can(t.org.kind, "inventory");

  return (
    <div>
      <Link href={back} className="mb-3 inline-flex items-center gap-1.5 text-sm text-pine-700 hover:text-pine-900">
        <ArrowLeft className="h-4 w-4" />
        {side === "seller" ? "Orders" : "Purchases"}
      </Link>
      <PageHeader
        eyebrow={`${side === "seller" ? "Customer" : "Supplier"}: ${other}${offline ? " (not on Parallax)" : ""}`}
        title={order.inquiryNo}
        description={`${termsText(order.paymentTerms, order.creditDays)} · started ${format(order.createdAt, "dd MMM yyyy")}`}
        action={<Badge tone={statusTone(status)}>{statusLabel(status, side)}</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <div className="overflow-x-auto">
              <table className="table-grid min-w-[560px]">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    {priced ? <th>Unit price</th> : null}
                    {priced ? <th>Line total</th> : null}
                    {order.dispatchedAt ? <th>Sent</th> : null}
                    {order.receivedAt ? <th>Received</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {[item.name, item.strength].filter(Boolean).join(" ")}
                        {item.unit ? <span className="text-xs text-ink/60"> · {item.unit}</span> : null}
                      </td>
                      <td>{item.quantity}</td>
                      {priced ? <td>{item.unitPrice != null ? money(item.unitPrice, currency) : "—"}</td> : null}
                      {priced ? <td>{item.unitPrice != null ? money(item.unitPrice * item.quantity, currency) : "—"}</td> : null}
                      {order.dispatchedAt ? <td>{item.qtyDispatched ?? "—"}</td> : null}
                      {order.receivedAt ? <td>{item.qtyReceived ?? "—"}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {order.quotedAmount != null ? (
              <p className="mt-3 text-right text-sm">
                {order.taxRate ? `Includes ${order.taxRate}% tax · ` : ""}
                <span className="font-display text-xl text-pine-900">{money(order.quotedAmount, currency)}</span>
              </p>
            ) : null}
            {order.buyerMessage ? <p className="mt-3 rounded-xl bg-shelf p-3 text-sm">Buyer: {order.buyerMessage}</p> : null}
            {order.sellerMessage ? <p className="mt-2 rounded-xl bg-shelf p-3 text-sm">Seller: {order.sellerMessage}</p> : null}
          </section>

          {/* Steps this business can take now. */}
          {canPrice ? (
            <QuoteForm
              orderId={order.id}
              lines={lines}
              taxRate={order.taxRate}
              readyOn={ymd(order.readyOn)}
              validUntil={ymd(order.validUntil)}
              terms={order.terms ?? ""}
              message={order.sellerMessage ?? ""}
              paymentTerms={order.paymentTerms}
              creditDays={order.creditDays}
              accepted={open}
              linkItems={sellerKeepsStock}
            />
          ) : null}
          {asBuyer && order.status === "QUOTED" && status !== "EXPIRED" ? (
            <AcceptForm
              orderId={order.id}
              total={money(order.quotedAmount ?? 0, currency)}
              validUntil={order.validUntil ? format(order.validUntil, "dd MMM yyyy") : null}
              onBehalf={side === "seller" ? other : undefined}
            />
          ) : null}
          {asSeller && open && !order.invoicedAt && order.paymentTerms === "PREPAY" ? (
            <InvoiceForm orderId={order.id} defaultDue={ymd(dueDate(order.paymentTerms, order.creditDays))} />
          ) : null}
          {asSeller && open ? <DispatchForm orderId={order.id} lines={lines} stockNote={sellerKeepsStock} /> : null}
          {asSeller && !order.invoicedAt && order.paymentTerms !== "PREPAY" && ["ORDERED", "PREPARING", "READY", "DISPATCHED", "RECEIVED"].includes(order.status) ? (
            <InvoiceForm orderId={order.id} defaultDue={ymd(dueDate(order.paymentTerms, order.creditDays))} />
          ) : null}
          {asBuyer && order.status === "DISPATCHED" ? (
            <ReceiveForm orderId={order.id} lines={lines} toInventory={buyerKeepsStock} onBehalf={side === "seller" ? other : undefined} />
          ) : null}
          {asSeller && order.invoicedAt && balance > 0 && !["CANCELLED", "DECLINED"].includes(order.status) ? (
            <PaymentForm orderId={order.id} balance={balance} onBehalf={side === "buyer" ? other : undefined} />
          ) : null}

          <div className="flex flex-wrap gap-2">
            {asSeller && order.status === "ORDERED" ? (
              <StepButton orderId={order.id} body={{ action: "PROGRESS", status: "PREPARING" }} label="Mark as preparing" />
            ) : null}
            {asSeller && ["ORDERED", "PREPARING"].includes(order.status) ? (
              <StepButton orderId={order.id} body={{ action: "PROGRESS", status: "READY" }} label="Mark as ready" />
            ) : null}
            {asSeller && ["INQUIRY", "QUOTED"].includes(order.status) ? (
              <StepButton orderId={order.id} body={{ action: "DECLINE" }} label="Decline" confirm="Decline this order?" />
            ) : null}
            {(asSeller && ["INQUIRY", "QUOTED", "ORDERED", "PREPARING", "READY"].includes(order.status)) ||
            (asBuyer && ["INQUIRY", "QUOTED"].includes(order.status)) ? (
              <StepButton orderId={order.id} body={{ action: "CANCEL" }} label="Cancel order" confirm="Cancel this order? This can't be undone." />
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <h2 className="font-display text-xl text-pine-900">Documents</h2>
            <p className="mt-1 text-sm text-ink/60">Open to print or save as PDF{offline ? ` and send to ${other}` : ""}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {docs.map((doc) => (
                <a key={doc.kind} href={`/documents/${order.id}/${doc.kind}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
                  <FileText className="h-4 w-4" />
                  {doc.label}
                </a>
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {order.quoteNo ? (<><dt className="text-ink/60">Quotation</dt><dd>{order.quoteNo}</dd></>) : null}
              {order.poNumber ? (<><dt className="text-ink/60">Purchase order</dt><dd>{order.poNumber}</dd></>) : null}
              {order.invoiceNo ? (<><dt className="text-ink/60">Invoice</dt><dd>{order.invoiceNo}</dd></>) : null}
              {order.deliveryNoteNo ? (<><dt className="text-ink/60">Delivery note</dt><dd>{order.deliveryNoteNo}</dd></>) : null}
              {order.dueOn ? (<><dt className="text-ink/60">Due</dt><dd>{format(order.dueOn, "dd MMM yyyy")}</dd></>) : null}
              {order.invoicedAt ? (<><dt className="text-ink/60">Balance</dt><dd>{money(balance, currency)}</dd></>) : null}
            </dl>
          </section>

          {order.payments.length ? (
            <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
              <h2 className="font-display text-xl text-pine-900">Payments</h2>
              <ul className="mt-2 divide-y divide-pine-900/10 text-sm">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between gap-2 py-2">
                    <span>
                      {format(payment.paidOn, "dd MMM yyyy")} · {PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </span>
                    <span>{money(payment.amount, currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <NotesForm orderId={order.id} notes={(side === "seller" ? order.sellerNotes : order.buyerNotes) ?? ""} />

          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <h2 className="font-display text-xl text-pine-900">History</h2>
            <ol className="mt-2 space-y-2 text-sm">
              {order.events.map((event) => (
                <li key={event.id}>
                  <p>{plainStatus(event.message ?? statusLabel(event.status, side), side)}</p>
                  <p className="text-xs text-ink/50">
                    {format(event.createdAt, "dd MMM yyyy HH:mm")}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

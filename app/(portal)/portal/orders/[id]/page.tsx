import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPharmacy } from "@/lib/pharmacy";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { OrderTrack } from "@/components/wholesale/OrderTrack";
import { StatusActions } from "@/components/wholesale/StatusActions";
import Link from "next/link";
import { documentTotals, zmw } from "@/lib/documents";
import { STATUS_LABEL, statusTone } from "@/lib/wholesale";

export default async function BuyerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user?.institutionId) redirect("/portal");
  const { id } = await params;
  const order = await db.consignment.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order || order.institutionId !== user.institutionId) notFound();
  const totals = documentTotals(order.items, order.taxRate, order.quotedAmount);
  const pharmacy = order.invoiceNo ? await getPharmacy() : null;
  const balance = order.quotedAmount != null ? order.quotedAmount - order.amountPaid : 0;
  const bank = pharmacy
    ? [
        ["Bank", pharmacy.bankName],
        ["Account name", pharmacy.accountName],
        ["Account number", pharmacy.accountNumber],
        ["Branch", pharmacy.bankBranch],
        ["SWIFT code", pharmacy.swiftCode],
      ].filter((row): row is [string, string] => Boolean(row[1]))
    : [];

  const buyerOptions =
    order.status === "QUOTED"
      ? ["ACCEPTED", "CANCELLED"]
      : order.status === "REQUESTED"
        ? ["CANCELLED"]
        : [];

  return (
    <div>
      <PageHeader
        eyebrow={order.reference}
        title="Order status"
        description="Price in Kwacha, the date the order can be ready, and each step until delivery."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">State</p>
          <div className="mt-2">
            <Badge tone={statusTone(order.status)}>{STATUS_LABEL[order.status]}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Quoted amount</p>
          <p className="mt-2 font-display text-2xl text-pine-900">
            {order.quotedAmount != null ? zmw(totals.total) : "Not yet quoted"}
          </p>
        </div>
        <div className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Ready for delivery</p>
          <p className="mt-2 font-display text-2xl text-pine-900">
            {order.readyOn ? format(order.readyOn, "dd MMM yyyy") : "Pending"}
          </p>
        </div>
      </div>
      {order.adminMessage ? (
        <section className="mb-6 rounded-2xl border border-brass/40 bg-white p-5 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Message from wholesale</p>
          <p className="mt-2 text-sm">{order.adminMessage}</p>
        </section>
      ) : null}
      {order.invoiceNo && order.quotedAmount != null ? (
        <section className="mb-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Payment</h2>
          <p className="mt-2 text-sm">
            Invoice {order.invoiceNo} · paid {zmw(order.amountPaid)} of {zmw(order.quotedAmount)}
            {order.dueOn ? ` · due ${format(order.dueOn, "dd MMM yyyy")}` : ""}
          </p>
          <p className="mt-1 font-semibold text-pine-900">
            {balance > 0.005 ? `Balance to pay: ${zmw(balance)}` : "Paid in full. Thank you."}
          </p>
          {balance > 0.005 ? (
            bank.length > 0 ? (
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                {bank.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-ink/60">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
                <dt className="text-ink/60">Reference</dt>
                <dd className="font-mono">{order.invoiceNo}</dd>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-ink/60">Bank details are on the invoice, or ask the wholesale.</p>
            )
          ) : null}
        </section>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="mb-3 font-display text-xl text-pine-900">Lines</h2>
          <ul className="space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.product.name} × {item.quantity}
              </li>
            ))}
          </ul>
          <StatusActions id={order.id} options={buyerOptions} />
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {order.quotedAmount != null ? (
              <Link className="text-pine-800 underline" href={`/documents/${order.id}/quotation`}>
                View quotation
              </Link>
            ) : null}
            {order.invoiceNo ? (
              <Link className="text-pine-800 underline" href={`/documents/${order.id}/invoice`}>
                View invoice
              </Link>
            ) : null}
            {order.deliveryNoteNo ? (
              <Link className="text-pine-800 underline" href={`/documents/${order.id}/delivery`}>
                View delivery note
              </Link>
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="mb-3 font-display text-xl text-pine-900">Progress</h2>
          <OrderTrack events={order.events} />
        </section>
      </div>
    </div>
  );
}

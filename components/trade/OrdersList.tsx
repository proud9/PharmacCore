import Link from "next/link";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";
import type { Tenant } from "@/lib/tenant";
import { paging, searchText, type ListParams } from "@/lib/paging";
import { BUYER_LABEL, effectiveStatus, SELLER_LABEL, statusLabel, statusTone, TRADE_STATUSES, type Side } from "@/lib/trade";
import { money } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";

/** Orders this business sells (/orders) or buys (/purchases), paged on the server. */
export async function OrdersList({ t, side, params }: { t: Tenant; side: Side; params: ListParams }) {
  const { org } = t;
  const selling = side === "seller";
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const status = params.status && (TRADE_STATUSES as readonly string[]).includes(params.status) ? params.status : undefined;
  const text = q ? { contains: q, mode: "insensitive" as const } : undefined;
  const where: Prisma.TradeOrderWhereInput = {
    ...(selling ? { sellerOrgId: org.id } : { buyerOrgId: org.id }),
    ...(status ? { status } : {}),
    ...(text
      ? {
          OR: [
            { inquiryNo: text },
            { quoteNo: text },
            { poNumber: text },
            { invoiceNo: text },
            { deliveryNoteNo: text },
            selling ? { buyerName: text } : { sellerName: text },
          ],
        }
      : {}),
  };
  const [orders, total] = await Promise.all([
    t.db.tradeOrder.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        inquiryNo: true,
        status: true,
        validUntil: true,
        sellerName: true,
        buyerName: true,
        channel: true,
        quotedAmount: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
    }),
    t.db.tradeOrder.count({ where }),
  ]);
  const labels = selling ? SELLER_LABEL : BUYER_LABEL;
  const base = selling ? "/orders" : "/purchases";

  return (
    <div>
      <PageHeader
        title={selling ? "Orders" : "Purchases"}
        description={
          selling
            ? "Inquiries and orders from your customers: price them, invoice, dispatch and record payments."
            : "Your inquiries and orders to suppliers: review quotes, accept, receive deliveries."
        }
        action={
          t.readOnly ? null : (
            <Link href={`${base}/new`} className="btn btn-primary">
              {selling ? "New quotation" : "New inquiry"}
            </Link>
          )
        }
      />
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-[240px] flex-1">
            <ListSearch placeholder={`Search by number or ${selling ? "customer" : "supplier"}`} />
          </div>
          <ListFilter param="status" label="Status" options={TRADE_STATUSES.map((value) => ({ value, label: labels[value] }))} />
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-ink/60">
            {selling ? "No orders yet. Customers send inquiries once you're connected." : "No purchases yet."}{" "}
            <Link href={selling ? "/customers" : "/suppliers"} className="font-semibold text-pine-800 hover:underline">
              {selling ? "See customers" : "See suppliers"}
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-grid min-w-[720px]">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>{selling ? "Customer" : "Supplier"}</th>
                  <th>Lines</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const shown = effectiveStatus(order);
                  return (
                    <tr key={order.id}>
                      <td>
                        <Link href={`${base}/${order.id}`} className="font-semibold text-pine-800 hover:underline">
                          {order.inquiryNo}
                        </Link>
                      </td>
                      <td>
                        {selling ? order.buyerName : order.sellerName}
                        {order.channel === "OFFLINE" ? <span className="text-xs text-ink/50"> · off Parallax</span> : null}
                      </td>
                      <td>{order._count.items}</td>
                      <td>{order.quotedAmount != null ? money(order.quotedAmount, org.currency) : "—"}</td>
                      <td>
                        <Badge tone={statusTone(shown)}>{statusLabel(shown, side)}</Badge>
                      </td>
                      <td>{format(order.updatedAt, "dd MMM yyyy")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} basePath={base} params={params} />
      </section>
    </div>
  );
}

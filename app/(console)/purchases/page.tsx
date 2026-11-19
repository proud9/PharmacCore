import Link from "next/link";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";
import { canSell, requireUser } from "@/lib/auth";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import { zmw } from "@/lib/documents";
import { PO_FILTER_STATUSES, PO_STATUS_LABEL, poStatusTone, poTotal } from "@/lib/purchasing";
import type { Prisma } from "@prisma/client";

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const status = params.status && (PO_FILTER_STATUSES as readonly string[]).includes(params.status) ? params.status : undefined;
  const where: Prisma.PurchaseOrderWhereInput = {
    // "Price accepted" also covers older orders saved as DRAFT/ORDERED.
    ...(status ? { status: status === "ACCEPTED" ? { in: ["ACCEPTED", "DRAFT", "ORDERED"] } : status } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q } },
            { deliveryNoteNo: { contains: q } },
            { invoiceNo: { contains: q } },
            { supplier: { name: { contains: q } } },
            { items: { some: { product: { name: { contains: q } } } } },
          ],
        }
      : {}),
  };
  const [orders, total, waitingPrice, toAccept, onTheWay] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        items: { select: { quantity: true, unitCost: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.purchaseOrder.count({ where }),
    db.purchaseOrder.count({ where: { status: "SENT" } }),
    db.purchaseOrder.count({ where: { status: "QUOTED" } }),
    db.purchaseOrder.count({ where: { status: "DISPATCHED" } }),
  ]);
  const allowNew = Boolean(user && canSell(user.role));

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Orders to manufacturers. They send a price, finance accepts it, and the delivery is received into Inventory."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {allowNew ? (
          <Link href="/purchases/new" className="btn btn-primary">
            New purchase order
          </Link>
        ) : null}
        <Link href="/purchases/manufacturers" className="btn btn-ghost">
          Manufacturers
        </Link>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Waiting for a price" value={String(waitingPrice)} hint="Sent to manufacturers" />
        <StatCard label="Price to accept" value={String(toAccept)} hint="Finance decides" />
        <StatCard label="On the way" value={String(onTheWay)} hint="Dispatched, not yet received" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_220px]">
          <ListSearch placeholder="Search manufacturer, order, invoice, delivery note or item" />
          <ListFilter
            param="status"
            label="Status"
            options={[{ value: "", label: "All statuses" }, ...PO_FILTER_STATUSES.map((value) => ({ value, label: PO_STATUS_LABEL[value] }))]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Order</th>
                <th>Manufacturer</th>
                <th>Lines</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/purchases/${order.id}`} className="font-mono text-xs hover:underline">
                      {order.reference}
                    </Link>
                    <p className="text-[11px] text-ink/50">{format(order.createdAt, "dd MMM yyyy")}</p>
                  </td>
                  <td>{order.supplier.name}</td>
                  <td>{order.items.length}</td>
                  <td>
                    {order.quotedAmount == null && poTotal(order) === 0 ? "Not priced yet" : zmw(poTotal(order))}
                    {order.quotedAmount == null && poTotal(order) > 0 ? <p className="text-[11px] text-ink/50">Expected cost</p> : null}
                  </td>
                  <td>
                    <Badge tone={poStatusTone(order.status)}>{PO_STATUS_LABEL[order.status] ?? order.status}</Badge>
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink/60">
                    {q || status ? "No purchase orders match." : "No purchase orders yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/purchases" params={params} />
      </section>
    </div>
  );
}

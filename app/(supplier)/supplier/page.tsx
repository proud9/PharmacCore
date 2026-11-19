import Link from "next/link";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPharmacy } from "@/lib/pharmacy";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import { zmw } from "@/lib/documents";
import { PO_FILTER_STATUSES, PO_SUPPLIER_LABEL, poStatusTone, poTotal } from "@/lib/purchasing";

export default async function SupplierOrdersPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const user = await requireUser();
  const supplierId = user?.supplierId ?? "__none__";
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const status = params.status && (PO_FILTER_STATUSES as readonly string[]).includes(params.status) ? params.status : undefined;
  const where: Prisma.PurchaseOrderWhereInput = {
    supplierId,
    ...(status ? { status: status === "ACCEPTED" ? { in: ["ACCEPTED", "DRAFT", "ORDERED"] } : status } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q } },
            { invoiceNo: { contains: q } },
            { deliveryNoteNo: { contains: q } },
            { items: { some: { product: { name: { contains: q } } } } },
          ],
        }
      : {}),
  };
  const [orders, total, newCount, toDispatch, [owed], wholesaler] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      include: { items: { select: { quantity: true, unitCost: true } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.purchaseOrder.count({ where }),
    db.purchaseOrder.count({ where: { supplierId, status: "SENT" } }),
    db.purchaseOrder.count({ where: { supplierId, status: { in: ["ACCEPTED", "DRAFT", "ORDERED"] } } }),
    db.$queryRaw<{ owed: number | null }[]>(Prisma.sql`
      SELECT SUM(quotedAmount - amountPaid) AS owed FROM PurchaseOrder
      WHERE supplierId = ${supplierId} AND invoiceNo IS NOT NULL AND quotedAmount IS NOT NULL
        AND status NOT IN ('DECLINED', 'CANCELLED') AND quotedAmount - amountPaid > 0.005`),
    getPharmacy(),
  ]);

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`Purchase orders from ${wholesaler?.name ?? "the wholesale"}. Send a price, then invoice and dispatch once it is accepted.`}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="New orders" value={String(newCount)} hint="Waiting for your price" />
        <StatCard label="To dispatch" value={String(toDispatch)} hint="Price accepted" />
        <StatCard label="Owed to you" value={zmw(owed?.owed ?? 0)} hint="Unpaid invoice balances" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_220px]">
          <ListSearch placeholder="Search order, invoice, delivery note or item" />
          <ListFilter
            param="status"
            label="Status"
            options={[{ value: "", label: "All statuses" }, ...PO_FILTER_STATUSES.map((value) => ({ value, label: PO_SUPPLIER_LABEL[value] }))]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Order</th>
                <th>Lines</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/supplier/orders/${order.id}`} className="font-mono text-xs hover:underline">
                      {order.reference}
                    </Link>
                    <p className="text-[11px] text-ink/50">{format(order.createdAt, "dd MMM yyyy")}</p>
                  </td>
                  <td>{order.items.length}</td>
                  <td>{order.quotedAmount != null ? zmw(poTotal(order)) : "Not priced yet"}</td>
                  <td>
                    <Badge tone={poStatusTone(order.status)}>{PO_SUPPLIER_LABEL[order.status] ?? order.status}</Badge>
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink/60">
                    {q || status ? "No orders match." : "No orders yet. They appear here when the wholesale sends one."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/supplier" params={params} />
      </section>
    </div>
  );
}

import Link from "next/link";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { money } from "@/lib/utils";
import { STATUS_LABEL, statusTone } from "@/lib/wholesale";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import type { Prisma } from "@prisma/client";

export default async function PortalHomePage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const status = params.status && params.status in STATUS_LABEL ? params.status : undefined;
  const where: Prisma.ConsignmentWhereInput = {
    institutionId: user?.institutionId ?? "__none__",
    ...(status ? { status } : {}),
    ...(q ? { reference: { contains: q } } : {}),
  };
  const [orders, total] = await Promise.all([
    db.consignment.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.consignment.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="My orders"
        description="Place an order, then follow the price in Kwacha, the ready date, and delivery progress."
        action={
          <Link href="/portal/new" className="btn btn-primary">
            New order
          </Link>
        }
      />
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_220px]">
          <ListSearch placeholder="Search order number" />
          <ListFilter param="status" label="Status" options={[
            { value: "", label: "All statuses" },
            ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
          ]} />
        </div>
        <div className="overflow-x-auto">
        <table className="table-grid">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Submitted</th>
              <th>Items</th>
              <th>Amount (ZMW)</th>
              <th>Ready</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-ink/60">
                  {q || status ? "No orders match." : "No orders yet. Start a new order to request medicines or equipment."}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/portal/orders/${order.id}`} className="font-mono text-xs hover:underline">
                      {order.reference}
                    </Link>
                  </td>
                  <td>{format(order.createdAt, "dd MMM yyyy")}</td>
                  <td>{order._count.items}</td>
                  <td>{order.quotedAmount != null ? money(order.quotedAmount, "ZMW") : "Awaiting quote"}</td>
                  <td>{order.readyOn ? format(order.readyOn, "dd MMM yyyy") : "—"}</td>
                  <td>
                    <Badge tone={statusTone(order.status)}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/portal" params={params} />
      </section>
    </div>
  );
}

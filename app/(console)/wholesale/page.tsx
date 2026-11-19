import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { isStaff, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { FinishSetup } from "@/components/FinishSetup";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { KIND_LABEL, STATUS_LABEL, statusTone } from "@/lib/wholesale";
import { money } from "@/lib/utils";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import type { Prisma } from "@prisma/client";

const CLOSED = ["DELIVERED", "DECLINED", "CANCELLED"];

export default async function WholesaleDeskPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const user = await requireUser();
  if (!user || !isStaff(user.role)) redirect("/dashboard");

  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const status = params.status && params.status in STATUS_LABEL ? params.status : undefined;
  const where: Prisma.ConsignmentWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ reference: { contains: q } }, { institution: { name: { contains: q } } }] } : {}),
  };
  // Headline numbers are counted by the database; only one page of orders is loaded.
  const [orders, total, openCount, awaitingQuote, quoted] = await Promise.all([
    db.consignment.findMany({
      where,
      include: { institution: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.consignment.count({ where }),
    db.consignment.count({ where: { status: { notIn: CLOSED } } }),
    db.consignment.count({ where: { status: "REQUESTED" } }),
    db.consignment.aggregate({ where: { status: { notIn: ["DECLINED", "CANCELLED"] } }, _sum: { quotedAmount: true } }),
  ]);
  const quotedValue = quoted._sum.quotedAmount ?? 0;

  return (
    <div>
      <PageHeader
        title="Wholesale orders"
        description="Hospitals, clinics, pharmacies and schools send order requests. Finance replies with a price in Kwacha; sales moves the order through to delivery."
      />
      <FinishSetup />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Open orders" value={String(openCount)} hint="Not finished yet" />
        <StatCard label="Waiting for a price" value={String(awaitingQuote)} hint="New requests" />
        <StatCard label="Quoted total" value={money(quotedValue, "ZMW")} hint="Amount offered to buyers" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_220px]">
          <ListSearch placeholder="Search order number or organisation" />
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
              <th>Organisation</th>
              <th>Items</th>
              <th>Price (ZMW)</th>
              <th>Ready</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/wholesale/${order.id}`} className="font-mono text-xs hover:underline">
                    {order.reference}
                  </Link>
                  <p className="text-[11px] text-ink/50">{format(order.createdAt, "dd MMM yyyy HH:mm")}</p>
                </td>
                <td>
                  <p>{order.institution.name}</p>
                  <p className="text-xs text-ink/60">{KIND_LABEL[order.institution.kind] ?? order.institution.kind}</p>
                </td>
                <td>{order._count.items}</td>
                <td>{order.quotedAmount != null ? money(order.quotedAmount, "ZMW") : "—"}</td>
                <td>{order.readyOn ? format(order.readyOn, "dd MMM yyyy") : "—"}</td>
                <td>
                  <Badge tone={statusTone(order.status)}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink/60">
                  {q || status ? "No orders match." : "No orders yet. They appear here when a buyer sends a request."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/wholesale" params={params} />
      </section>
    </div>
  );
}

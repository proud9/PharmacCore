import Link from "next/link";
import { format, startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { pageTenant } from "@/lib/tenant";
import { can } from "@/lib/capabilities";
import { balanceOf } from "@/lib/trade";
import { paging, type ListParams } from "@/lib/paging";
import { money, cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";
import { StatCard } from "@/components/StatCard";

/** Unpaid invoices: what customers owe you, and what you owe suppliers. */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const t = await pageTenant();
  const { org } = t;
  const sells = can(org.kind, "sell");
  const buys = can(org.kind, "buy");
  if (!sells && !buys) return null;
  const params = await searchParams;
  const view = params.view === "owing" && buys ? "owing" : sells ? "owed" : "owing";
  const { page, take, skip, pageSize } = paging(params);
  const today = startOfDay(new Date());
  const open: Prisma.TradeOrderWhereInput = { invoicedAt: { not: null }, status: { notIn: ["CANCELLED", "DECLINED", "CLOSED"] } };

  async function totals(side: "sellerOrgId" | "buyerOrgId") {
    const [all, overdue] = await Promise.all([
      t.db.tradeOrder.aggregate({ where: { [side]: org.id, ...open }, _sum: { quotedAmount: true, amountPaid: true } }),
      t.db.tradeOrder.aggregate({ where: { [side]: org.id, ...open, dueOn: { lt: today } }, _sum: { quotedAmount: true, amountPaid: true } }),
    ]);
    const left = (row: typeof all) => Math.max(0, (row._sum.quotedAmount ?? 0) - (row._sum.amountPaid ?? 0));
    return { total: left(all), overdue: left(overdue) };
  }
  const [owedToUs, weOwe] = await Promise.all([sells ? totals("sellerOrgId") : null, buys ? totals("buyerOrgId") : null]);

  const where: Prisma.TradeOrderWhereInput = { ...(view === "owed" ? { sellerOrgId: org.id } : { buyerOrgId: org.id }), ...open };
  const [rows, total] = await Promise.all([
    t.db.tradeOrder.findMany({
      where,
      orderBy: [{ dueOn: "asc" }, { invoicedAt: "asc" }],
      take,
      skip,
      select: { id: true, inquiryNo: true, invoiceNo: true, buyerName: true, sellerName: true, quotedAmount: true, amountPaid: true, invoicedAt: true, dueOn: true },
    }),
    t.db.tradeOrder.count({ where }),
  ]);

  return (
    <div>
      <PageHeader title="Payments" description="Invoices not yet paid in full. Payments are recorded by the seller on each order." />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {owedToUs ? (
          <>
            <StatCard label="Owed to you" value={money(owedToUs.total, org.currency)} />
            <StatCard label="Overdue to you" value={money(owedToUs.overdue, org.currency)} />
          </>
        ) : null}
        {weOwe ? (
          <>
            <StatCard label="You owe" value={money(weOwe.total, org.currency)} />
            <StatCard label="You owe, overdue" value={money(weOwe.overdue, org.currency)} />
          </>
        ) : null}
      </div>
      {sells && buys ? (
        <div className="mb-4 flex gap-2" role="tablist">
          <Link href="/payments?view=owed" className={cn("btn", view === "owed" ? "btn-primary" : "btn-ghost")} aria-current={view === "owed" ? "page" : undefined}>
            Owed to you
          </Link>
          <Link href="/payments?view=owing" className={cn("btn", view === "owing" ? "btn-primary" : "btn-ghost")} aria-current={view === "owing" ? "page" : undefined}>
            You owe
          </Link>
        </div>
      ) : null}
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        {rows.length === 0 ? <p className="text-sm text-ink/60">Nothing outstanding.</p> : null}
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="table-grid min-w-[720px]">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>{view === "owed" ? "Customer" : "Supplier"}</th>
                  <th>Invoiced</th>
                  <th>Due</th>
                  <th>Total</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const late = row.dueOn && row.dueOn < today;
                  return (
                    <tr key={row.id}>
                      <td>
                        <Link href={view === "owed" ? `/orders/${row.id}` : `/purchases/${row.id}`} className="font-semibold text-pine-800 hover:underline">
                          {row.invoiceNo ?? row.inquiryNo}
                        </Link>
                      </td>
                      <td>{view === "owed" ? row.buyerName : row.sellerName}</td>
                      <td>{row.invoicedAt ? format(row.invoicedAt, "dd MMM yyyy") : "—"}</td>
                      <td>
                        {row.dueOn ? format(row.dueOn, "dd MMM yyyy") : "—"} {late ? <Badge tone="bad">Overdue</Badge> : null}
                      </td>
                      <td>{money(row.quotedAmount ?? 0, org.currency)}</td>
                      <td>{money(balanceOf(row), org.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/payments" params={params} />
      </section>
    </div>
  );
}

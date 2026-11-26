import Link from "next/link";
import { format, startOfDay, subDays } from "date-fns";
import { pageTenant, type Tenant } from "@/lib/tenant";
import { can, ROLE_LABEL } from "@/lib/capabilities";
import { expiryWindow } from "@/lib/inventory";
import { money } from "@/lib/utils";
import { FinishSetup } from "@/components/FinishSetup";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { SalesChart } from "@/components/charts";

const LOW_LIMIT = 25;
const OPEN = ["INQUIRY", "QUOTED", "ORDERED", "PREPARING", "READY", "DISPATCHED", "RECEIVED"];

/** Money still owed on invoiced, open orders where this business is the seller or the buyer. */
async function owed(t: Tenant, side: "sellerOrgId" | "buyerOrgId") {
  const sums = await t.db.tradeOrder.aggregate({
    where: { [side]: t.org.id, invoicedAt: { not: null }, status: { notIn: ["CANCELLED", "DECLINED"] } },
    _sum: { quotedAmount: true, amountPaid: true },
  });
  return Math.max(0, (sums._sum.quotedAmount ?? 0) - (sums._sum.amountPaid ?? 0));
}

export default async function DashboardPage() {
  const t = await pageTenant();
  const { db, org } = t;
  const currency = org.currency;
  const sells = can(org.kind, "sell");
  const buys = can(org.kind, "buy");
  const stocked = can(org.kind, "inventory");
  const counter = can(org.kind, "counter");
  const today = startOfDay(new Date());

  const [inquiries, toDispatch, owedToUs, quotesToReview, onTheWay, weOwe] = await Promise.all([
    sells ? db.tradeOrder.count({ where: { sellerOrgId: org.id, status: "INQUIRY" } }) : 0,
    sells ? db.tradeOrder.count({ where: { sellerOrgId: org.id, status: { in: ["ORDERED", "PREPARING", "READY"] } } }) : 0,
    sells ? owed(t, "sellerOrgId") : 0,
    buys ? db.tradeOrder.count({ where: { buyerOrgId: org.id, status: "QUOTED" } }) : 0,
    buys ? db.tradeOrder.count({ where: { buyerOrgId: org.id, status: "DISPATCHED" } }) : 0,
    buys ? owed(t, "buyerOrgId") : 0,
  ]);

  const [products, stockRows, expiring] = stocked
    ? await Promise.all([
        db.product.findMany({ where: { active: true }, select: { id: true, sku: true, name: true, reorderLevel: true } }),
        db.batch.groupBy({ by: ["productId"], where: { quantity: { gt: 0 } }, _sum: { quantity: true } }),
        db.batch.findMany({
          where: { quantity: { gt: 0 }, expiryDate: { lte: expiryWindow() }, product: { active: true } },
          orderBy: { expiryDate: "asc" },
          take: 8,
          select: { id: true, lotNumber: true, quantity: true, expiryDate: true, product: { select: { name: true } } },
        }),
      ])
    : [[], [], []];
  const onHand = new Map(stockRows.map((row) => [row.productId, row._sum.quantity ?? 0]));
  const lowAll = products
    .map((p) => ({ ...p, qty: onHand.get(p.id) ?? 0 }))
    .filter((p) => p.qty <= p.reorderLevel)
    .sort((x, y) => x.qty - y.qty || x.name.localeCompare(y.name));
  const low = lowAll.slice(0, LOW_LIMIT);

  const sales = counter
    ? await db.sale.findMany({ where: { createdAt: { gte: subDays(today, 13) } }, select: { createdAt: true, total: true } })
    : [];
  const todayRevenue = sales.filter((sale) => sale.createdAt >= today).reduce((sum, sale) => sum + sale.total, 0);
  const totalsByDay = new Map<string, number>();
  for (const sale of sales) {
    const key = format(sale.createdAt, "yyyy-MM-dd");
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + sale.total);
  }
  const chart = Array.from({ length: 14 }).map((_, index) => {
    const day = subDays(today, 13 - index);
    return { day: format(day, "dd MMM"), total: Number((totalsByDay.get(format(day, "yyyy-MM-dd")) ?? 0).toFixed(2)) };
  });

  const recent = await db.tradeOrder.findMany({
    where: { OR: [{ sellerOrgId: org.id }, { buyerOrgId: org.id }], status: { in: OPEN } },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: { id: true, inquiryNo: true, sellerOrgId: true, sellerName: true, buyerName: true, status: true, updatedAt: true },
  });

  return (
    <div>
      <PageHeader eyebrow={ROLE_LABEL[org.kind]} title="Home" description={`What needs attention at ${org.name} today.`} />
      {sells ? <FinishSetup org={org} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sells ? (
          <>
            <StatCard label="New inquiries" value={String(inquiries)} hint="Waiting for your price" />
            <StatCard label="To dispatch" value={String(toDispatch)} hint="Orders placed with you" />
            <StatCard label="Owed to you" value={money(owedToUs, currency)} hint="Unpaid invoices" />
          </>
        ) : null}
        {buys ? (
          <>
            <StatCard label="Quotes to review" value={String(quotesToReview)} hint="Prices from your suppliers" />
            <StatCard label="On the way" value={String(onTheWay)} hint="Dispatched to you" />
            <StatCard label="You owe" value={money(weOwe, currency)} hint="Unpaid supplier invoices" />
          </>
        ) : null}
        {stocked ? <StatCard label="Low stock items" value={String(lowAll.length)} hint="Need to reorder" /> : null}
        {counter ? <StatCard label="Counter sales today" value={money(todayRevenue, currency)} hint="Sales counter" /> : null}
      </div>

      <section className="mt-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="font-display text-xl text-pine-900">Recent orders</h2>
        <p className="mb-4 text-sm text-ink/60">Open orders you sell or buy, most recently changed first.</p>
        {recent.length === 0 ? (
          <p className="text-sm text-ink/60">
            No open orders yet.{" "}
            <Link href="/directory" className="font-semibold text-pine-800 hover:underline">
              Find businesses to trade with
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-pine-900/10 text-sm">
            {recent.map((order) => {
              const selling = order.sellerOrgId === org.id;
              return (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={selling ? `/orders/${order.id}` : `/purchases/${order.id}`} className="font-semibold text-pine-800 hover:underline">
                    {order.inquiryNo}
                  </Link>
                  <span className="text-ink/70">{selling ? `To ${order.buyerName}` : `From ${order.sellerName}`}</span>
                  <span className="text-xs text-ink/50">{format(order.updatedAt, "dd MMM yyyy")}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {counter || stocked ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          {counter ? (
            <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
              <h2 className="font-display text-xl text-pine-900">Counter sales this fortnight</h2>
              <p className="mb-4 text-sm text-ink/60">Daily totals for the last 14 days</p>
              <SalesChart data={chart} />
            </section>
          ) : null}
          {stocked ? (
            <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
              <h2 className="font-display text-xl text-pine-900">Expiring soon</h2>
              <p className="mb-4 text-sm text-ink/60">Stock that expires within 90 days</p>
              <div className="space-y-3">
                {expiring.length === 0 ? (
                  <p className="text-sm text-ink/60">Nothing due to expire in the next 90 days.</p>
                ) : (
                  expiring.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p>{row.product.name}</p>
                        <p className="text-xs text-ink/60">
                          {row.lotNumber} · {row.quantity} on hand
                        </p>
                      </div>
                      <Badge tone="warn">{format(row.expiryDate, "dd MMM yyyy")}</Badge>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {stocked && low.length ? (
        <section className="mt-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl text-pine-900">Items to reorder</h2>
            {lowAll.length > low.length ? (
              <Link href="/inventory" className="text-sm font-semibold text-pine-800 hover:underline">
                Showing the {low.length} lowest of {lowAll.length}. See all in Inventory
              </Link>
            ) : null}
          </div>
          <table className="table-grid">
            <thead>
              <tr>
                <th>Stock code</th>
                <th>Item</th>
                <th>On hand</th>
                <th>Reorder at</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {low.map((product) => (
                <tr key={product.id}>
                  <td className="font-mono text-xs">{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{product.qty}</td>
                  <td>{product.reorderLevel}</td>
                  <td>
                    <Badge tone={product.qty === 0 ? "bad" : "warn"}>{product.qty === 0 ? "Out" : "Low"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

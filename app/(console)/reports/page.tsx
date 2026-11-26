import { pageTenant } from "@/lib/tenant";
import { format, startOfDay, subDays } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { money } from "@/lib/utils";
import { MixChart } from "@/components/charts";

export default async function ReportsPage() {
  const t = await pageTenant("counter");
  const { db } = t;
  const pharmacy = t.org;
  const currency = pharmacy?.currency ?? "ZMW";
  const since = subDays(startOfDay(new Date()), 30);
  const inWindow = { createdAt: { gte: since } };
  // All totals are worked out by the database; only the top sellers' names are loaded.
  const [revenueRow, byPayment, byProduct, stockRows] = await Promise.all([
    db.sale.aggregate({ where: inWindow, _sum: { total: true }, _count: true }),
    db.sale.groupBy({ by: ["payment"], where: inWindow, _sum: { total: true } }),
    db.saleItem.groupBy({ by: ["productId"], where: { sale: inWindow }, _sum: { total: true, quantity: true } }),
    db.batch.groupBy({ by: ["productId"], where: { quantity: { gt: 0 }, product: { active: true } }, _sum: { quantity: true } }),
  ]);
  const costIds = [...new Set([...byProduct.map((r) => r.productId), ...stockRows.map((r) => r.productId)])];
  const products = await db.product.findMany({
    where: { id: { in: costIds } },
    select: { id: true, name: true, costPrice: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const revenue = revenueRow._sum.total ?? 0;
  const invoiceCount = revenueRow._count;
  const cogs = byProduct.reduce((sum, r) => sum + (byId.get(r.productId)?.costPrice ?? 0) * (r._sum.quantity ?? 0), 0);
  const stockValue = stockRows.reduce((sum, r) => sum + (byId.get(r.productId)?.costPrice ?? 0) * (r._sum.quantity ?? 0), 0);

  const mixData = byProduct
    .map((r) => ({ name: byId.get(r.productId)?.name ?? "Unknown item", value: Number((r._sum.total ?? 0).toFixed(2)) }))
    .sort((x, y) => y.value - x.value)
    .slice(0, 8);

  const tender = { CASH: 0, CARD: 0, MOBILE: 0, INSURANCE: 0 };
  for (const row of byPayment) {
    if (row.payment in tender) tender[row.payment as keyof typeof tender] = row._sum.total ?? 0;
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales, estimated cost, profit margin, and the value of stock on hand for the last 30 days."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (30d)" value={money(revenue, currency)} hint={`${invoiceCount} invoices`} />
        <StatCard label="Estimated cost of goods" value={money(cogs, currency)} hint="Using current cost prices" />
        <StatCard
          label="Gross margin"
          value={revenue ? `${(((revenue - cogs) / revenue) * 100).toFixed(1)}%` : "—"}
        />
        <StatCard label="Stock value" value={money(stockValue, currency)} hint="At cost price" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="mb-4 font-display text-xl text-pine-900">Top sellers by value</h2>
          <MixChart data={mixData} />
        </section>
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="mb-4 font-display text-xl text-pine-900">How customers paid</h2>
          <table className="table-grid">
            <thead>
              <tr>
                <th>Method</th>
                <th>Value</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tender).map(([method, value]) => (
                <tr key={method}>
                  <td>{method}</td>
                  <td>{money(value, currency)}</td>
                  <td>{revenue ? `${((value / revenue) * 100).toFixed(1)}%` : "0%"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-ink/50">Generated {format(new Date(), "dd MMM yyyy HH:mm")}</p>
        </section>
      </div>
    </div>
  );
}

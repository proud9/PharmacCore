import { format, startOfDay, subDays } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { money, stockOf } from "@/lib/utils";
import { MixChart } from "@/components/MixChart";

export default async function ReportsPage() {
  const pharmacy = await db.pharmacy.findUnique({ where: { id: "main" } });
  const currency = pharmacy?.currency ?? "USD";
  const since = subDays(startOfDay(new Date()), 30);
  const [sales, products] = await Promise.all([
    db.sale.findMany({
      where: { createdAt: { gte: since } },
      include: { items: { include: { product: true } } },
    }),
    db.product.findMany({ include: { batches: true } }),
  ]);

  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const cogsMap = new Map(products.map((p) => [p.id, p.costPrice]));
  const cogs = sales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((lineSum, item) => lineSum + (cogsMap.get(item.productId) ?? 0) * item.quantity, 0),
    0,
  );
  const stockValue = products.reduce((sum, p) => sum + stockOf(p.batches) * p.costPrice, 0);

  const mix = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      mix.set(item.product.name, (mix.get(item.product.name) ?? 0) + item.total);
    }
  }
  const mixData = [...mix.entries()]
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const tender = { CASH: 0, CARD: 0, MOBILE: 0, INSURANCE: 0 };
  for (const sale of sales) {
    tender[sale.payment as keyof typeof tender] += sale.total;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Decision support"
        title="Statistics"
        description="Thirty-day commercial snapshot: margin, mix, tender split, and inventory capital."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (30d)" value={money(revenue, currency)} hint={`${sales.length} invoices`} />
        <StatCard label="Estimated COGS" value={money(cogs, currency)} hint="From current cost prices" />
        <StatCard
          label="Gross margin"
          value={revenue ? `${(((revenue - cogs) / revenue) * 100).toFixed(1)}%` : "—"}
        />
        <StatCard label="Stock at cost" value={money(stockValue, currency)} hint="All lots on hand" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="mb-4 font-display text-xl text-pine-900">Top sellers by value</h2>
          <MixChart data={mixData} />
        </section>
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="mb-4 font-display text-xl text-pine-900">Tender mix</h2>
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

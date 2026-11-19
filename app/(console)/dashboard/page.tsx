import { FinishSetup } from "@/components/FinishSetup";
import { format, startOfDay, subDays } from "date-fns";
import { db } from "@/lib/db";
import { getPharmacy } from "@/lib/pharmacy";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import Link from "next/link";
import { SalesChart } from "@/components/charts";
import { money } from "@/lib/utils";

const LOW_LIMIT = 25;
import { expiryWindow } from "@/lib/inventory";

export default async function DashboardPage() {
  const today = startOfDay(new Date());
  // Totals and stock levels come from the database (groupBy/aggregate) rather than loading every
  // product, batch and sale line into the app: this page stays fast as history grows.
  const [products, stockRows, sales, expiring, pendingRx, patients, pharmacy] = await Promise.all([
    db.product.findMany({
      where: { active: true },
      select: { id: true, sku: true, name: true, reorderLevel: true },
    }),
    db.batch.groupBy({ by: ["productId"], where: { quantity: { gt: 0 } }, _sum: { quantity: true } }),
    db.sale.findMany({
      where: { createdAt: { gte: subDays(today, 13) } },
      select: { createdAt: true, total: true },
    }),
    db.batch.findMany({
      where: { quantity: { gt: 0 }, expiryDate: { lte: expiryWindow() }, product: { active: true } },
      orderBy: { expiryDate: "asc" },
      take: 8,
      select: { id: true, lotNumber: true, quantity: true, expiryDate: true, product: { select: { name: true } } },
    }),
    db.prescription.count({ where: { status: "PENDING" } }),
    db.patient.count(),
    getPharmacy(),
  ]);

  const currency = pharmacy?.currency ?? "ZMW";
  const onHand = new Map(stockRows.map((row) => [row.productId, row._sum.quantity ?? 0]));
  const todaySales = sales.filter((sale) => sale.createdAt >= today);
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const windowSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const lowAll = products
    .map((p) => ({ ...p, qty: onHand.get(p.id) ?? 0 }))
    .filter((p) => p.qty <= p.reorderLevel)
    .sort((x, y) => x.qty - y.qty || x.name.localeCompare(y.name));
  const low = lowAll.slice(0, LOW_LIMIT);

  const totalsByDay = new Map<string, number>();
  for (const sale of sales) {
    const key = format(sale.createdAt, "yyyy-MM-dd");
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + sale.total);
  }
  const chart = Array.from({ length: 14 }).map((_, index) => {
    const day = subDays(today, 13 - index);
    const total = totalsByDay.get(format(day, "yyyy-MM-dd")) ?? 0;
    return { day: format(day, "dd MMM"), total: Number(total.toFixed(2)) };
  });

  return (
    <div>
      <PageHeader
        title="Home"
        description="Today’s sales, items running low, and medicines close to expiry."
      />
      <FinishSetup />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's revenue" value={money(todayRevenue, currency)} hint={`${todaySales.length} invoices`} />
        <StatCard label="Last 14 days" value={money(windowSales, currency)} hint="Total sales" />
        <StatCard label="Low stock items" value={String(lowAll.length)} hint="Need to reorder" />
        <StatCard label="Open prescriptions" value={String(pendingRx)} hint={`${patients} patient records`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Sales this fortnight</h2>
          <p className="mb-4 text-sm text-ink/60">Daily totals for the last 14 days</p>
          <SalesChart data={chart} />
        </section>
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
      </div>

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
              <th>SKU</th>
              <th>Product</th>
              <th>On hand</th>
              <th>Reorder at</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {low.map((product) => {
              const qty = product.qty;
              return (
                <tr key={product.id}>
                  <td className="font-mono text-xs">{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{qty}</td>
                  <td>{product.reorderLevel}</td>
                  <td>
                    <Badge tone={qty === 0 ? "bad" : "warn"}>{qty === 0 ? "Out" : "Low"}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

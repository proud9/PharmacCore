import { format, startOfDay, subDays } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { SalesChart } from "@/components/SalesChart";
import { money, stockOf } from "@/lib/utils";
import { expiryWindow } from "@/lib/inventory";

export default async function DashboardPage() {
  const today = startOfDay(new Date());
  const [products, sales, pendingRx, patients, pharmacy] = await Promise.all([
    db.product.findMany({ include: { batches: true, category: true } }),
    db.sale.findMany({
      where: { createdAt: { gte: subDays(today, 13) } },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    }),
    db.prescription.count({ where: { status: "PENDING" } }),
    db.patient.count(),
    db.pharmacy.findUnique({ where: { id: "main" } }),
  ]);

  const currency = pharmacy?.currency ?? "USD";
  const todaySales = sales.filter((sale) => sale.createdAt >= today);
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const windowSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const low = products.filter((p) => stockOf(p.batches) <= p.reorderLevel);
  const expiring = products.flatMap((p) =>
    p.batches
      .filter((b) => b.quantity > 0 && b.expiryDate <= expiryWindow())
      .map((b) => ({ product: p.name, lot: b.lotNumber, qty: b.quantity, expiry: b.expiryDate })),
  );

  const chart = Array.from({ length: 14 }).map((_, index) => {
    const day = subDays(today, 13 - index);
    const total = sales
      .filter((sale) => format(sale.createdAt, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
      .reduce((sum, sale) => sum + sale.total, 0);
    return { day: format(day, "dd MMM"), total: Number(total.toFixed(2)) };
  });

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Command board"
        description="Live view of counter trade, stock risk, and unfinished clinical work."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's revenue" value={money(todayRevenue, currency)} hint={`${todaySales.length} invoices`} />
        <StatCard label="14-day trade" value={money(windowSales, currency)} hint="Gross sales" />
        <StatCard label="Low stock SKUs" value={String(low.length)} hint="At or below reorder point" />
        <StatCard label="Open prescriptions" value={String(pendingRx)} hint={`${patients} patient records`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Revenue trend</h2>
          <p className="mb-4 text-sm text-ink/60">Last fourteen days, all tenders</p>
          <SalesChart data={chart} />
        </section>
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Expiry watch</h2>
          <p className="mb-4 text-sm text-ink/60">Lots dating within 90 days</p>
          <div className="space-y-3">
            {expiring.length === 0 ? (
              <p className="text-sm text-ink/60">No near-expiry lots.</p>
            ) : (
              expiring.slice(0, 8).map((row) => (
                <div key={`${row.product}-${row.lot}`} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{row.product}</p>
                    <p className="text-xs text-ink/60">
                      {row.lot} · {row.qty} on hand
                    </p>
                  </div>
                  <Badge tone="warn">{format(row.expiry, "dd MMM yyyy")}</Badge>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="mb-3 font-display text-xl text-pine-900">Reorder queue</h2>
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
              const qty = stockOf(product.batches);
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

import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StockTakeDesk } from "@/components/stock/StockTakeDesk";
import { stockOf } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/Badge";

export default async function StockTakePage() {
  const [products, history] = await Promise.all([
    db.product.findMany({ include: { batches: true }, orderBy: { name: "asc" } }),
    db.stockTake.findMany({
      include: { user: true, items: true },
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Cycle count"
        title="Stock take"
        description="Count physical packs against system quantities. Completing a take can post variances into lots."
      />
      <StockTakeDesk
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          systemQty: stockOf(p.batches),
        }))}
      />
      <section className="mt-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="mb-3 font-display text-xl text-pine-900">Recent takes</h2>
        <table className="table-grid">
          <thead>
            <tr>
              <th>Reference</th>
              <th>By</th>
              <th>When</th>
              <th>Lines</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td className="font-mono text-xs">{row.reference}</td>
                <td>{row.user.name}</td>
                <td>{format(row.startedAt, "dd MMM yyyy HH:mm")}</td>
                <td>{row.items.length}</td>
                <td>
                  <Badge tone="good">{row.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

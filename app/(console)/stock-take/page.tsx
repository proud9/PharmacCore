import Link from "next/link";
import { FileText } from "lucide-react";
import { format, isBefore } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { StockSheet, type SheetRow } from "@/components/stock/StockSheet";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { drugTypeOf } from "@/lib/stocksheet";
import { money, stockOf } from "@/lib/utils";

export default async function StockTakePage() {
  const [user, products, history] = await Promise.all([
    requireUser(),
    db.product.findMany({
      where: { active: true },
      include: { batches: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: "asc" } } },
      orderBy: { sku: "asc" },
    }),
    db.stockTake.findMany({
      include: { user: true, items: true },
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
  ]);
  const canEdit = Boolean(user && canAdjustStock(user.role));
  const today = new Date();

  const rows: SheetRow[] = products.map((p) => {
    const nearest = p.batches[0]?.expiryDate ?? null;
    return {
      id: p.id,
      sku: p.sku,
      categoryNo: p.categoryNo,
      name: p.name,
      type: drugTypeOf(p.controlled),
      unit: p.unit,
      price: p.sellingPrice,
      openQty: stockOf(p.batches),
      expiryLabel: nearest ? format(nearest, "dd MMM yyyy") : null,
      expired: nearest ? isBefore(nearest, today) : false,
    };
  });

  return (
    <div>
      <PageHeader
        title="Stock take"
        description="Count what is on the shelf and record close qty. Sold and amount work out from open and close qty; finishing sets stock to your count."
      />
      <StockSheet rows={rows} canEdit={canEdit} />
      <section className="mt-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="mb-3 font-display text-xl text-pine-900">Recent takes</h2>
        <div className="overflow-x-auto">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Reference</th>
                <th>By</th>
                <th>When</th>
                <th>Lines</th>
                <th className="text-right">Sold amount</th>
                <th>Status</th>
                <th className="sr-only">Report</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => {
                const amount = row.items.reduce(
                  (sum, item) => sum + (item.systemQty - item.countedQty) * item.unitPrice,
                  0,
                );
                return (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.reference}</td>
                    <td>{row.user.name}</td>
                    <td>{format(row.startedAt, "dd MMM yyyy HH:mm")}</td>
                    <td>{row.items.length}</td>
                    <td className="text-right tabular-nums">{money(amount)}</td>
                    <td>
                      <Badge tone="good">{row.status === "COMPLETED" ? "Completed" : row.status}</Badge>
                    </td>
                    <td className="text-right">
                      <Link href={`/stock-take/${row.id}`} className="btn btn-ghost whitespace-nowrap">
                        <FileText className="h-4 w-4" />
                        View report
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-ink/60">
                    Finished stock takes will appear here.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

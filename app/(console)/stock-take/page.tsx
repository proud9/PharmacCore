import { pageTenant } from "@/lib/tenant";
import Link from "next/link";
import { FileText } from "lucide-react";
import { format, isBefore } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { StockSheet, type SheetRow } from "@/components/stock/StockSheet";
import { drugTypeOf } from "@/lib/stocksheet";
import { money, stockOf } from "@/lib/utils";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import { Prisma } from "@prisma/client";

export default async function StockTakePage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const t = await pageTenant("inventory");
  const { db } = t;
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const type = params.type === "OTC" || params.type === "DDA" ? params.type : undefined;
  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(type ? { controlled: type === "DDA" } : {}),
    ...(q ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { categoryNo: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [products, total, history] = await Promise.all([
    db.product.findMany({
      where,
      include: { batches: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: "asc" } } },
      orderBy: { sku: "asc" },
      take,
      skip,
    }),
    db.product.count({ where }),
    db.stockTake.findMany({
      select: { id: true, reference: true, status: true, startedAt: true, userName: true },
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
  ]);
  // Line counts and sold amounts for recent takes, totalled in the database (a take has a line per item).
  const summaries = history.length
    ? await t.tx((tx) =>
        tx.$queryRaw<{ stockTakeId: string; lines: bigint | number; amount: number | null }[]>(Prisma.sql`
          SELECT "stockTakeId", COUNT(*) AS lines, SUM(("systemQty" - "countedQty") * "unitPrice") AS amount
          FROM "StockTakeItem"
          WHERE "stockTakeId" IN (${Prisma.join(history.map((h) => h.id))})
          GROUP BY "stockTakeId"`),
      )
    : [];
  const summaryById = new Map(summaries.map((s) => [s.stockTakeId, { lines: Number(s.lines), amount: Number(s.amount ?? 0) }]));
  const canEdit = !t.readOnly;
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
      <StockSheet
        rows={rows}
        canEdit={canEdit}
        total={total}
        offset={skip}
        pager={<Pagination page={page} pageSize={pageSize} total={total} basePath="/stock-take" params={params} />}
      />
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
                const summary = summaryById.get(row.id) ?? { lines: 0, amount: 0 };
                const amount = summary.amount;
                return (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.reference}</td>
                    <td>{row.userName}</td>
                    <td>{format(row.startedAt, "dd MMM yyyy HH:mm")}</td>
                    <td>{summary.lines.toLocaleString()}</td>
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

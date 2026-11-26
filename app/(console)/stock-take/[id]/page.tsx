import { pageTenant } from "@/lib/tenant";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Download } from "lucide-react";
import { Prisma } from "@prisma/client";
import { paging } from "@/lib/paging";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { displayCode, drugTypeOf } from "@/lib/stocksheet";
import { cn, money } from "@/lib/utils";

/** Report for one finished stock take: what was sold (open − close) and its value. */
export default async function StockTakeReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string; page?: string }>;
}) {
  const t = await pageTenant("inventory");
  const { db } = t;
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const take = await db.stockTake.findUnique({ where: { id }, });
  if (!take) notFound();

  // Totals come from the database; the table shows one page of lines (a take has a line per item).
  const [stats] = await t.tx((tx) =>
    tx.$queryRaw<
      { total: bigint | number; soldCount: bigint | number; unitsSold: number | null; soldAmount: number | null }[]
    >(Prisma.sql`
      SELECT COUNT(*) AS "total",
        SUM(CASE WHEN "systemQty" > "countedQty" THEN 1 ELSE 0 END) AS "soldCount",
        SUM(CASE WHEN "systemQty" > "countedQty" THEN "systemQty" - "countedQty" ELSE 0 END) AS "unitsSold",
        SUM(CASE WHEN "systemQty" > "countedQty" THEN ("systemQty" - "countedQty") * "unitPrice" ELSE 0 END) AS "soldAmount"
      FROM "StockTakeItem" WHERE "stockTakeId" = ${id}`),
  );

  const totalLines = Number(stats?.total ?? 0);
  const soldCount = Number(stats?.soldCount ?? 0);
  const movedCount = soldCount;
  const unitsSold = Number(stats?.unitsSold ?? 0);
  const soldAmount = Number(stats?.soldAmount ?? 0);

  const showAll = query.show === "all";
  const { page, take: pageTake, skip, pageSize } = paging(query, 100);
  const items = await db.stockTakeItem.findMany({
    where: { stockTakeId: id, ...(showAll ? {} : { variance: { not: 0 } }) },
    include: { product: true },
    orderBy: { product: { sku: "asc" } },
    take: pageTake,
    skip,
  });
  const visible = items.map((item) => {
    const sold = item.systemQty - item.countedQty;
    return { item, sold, amount: sold * item.unitPrice };
  });
  // Unchanged lines add nothing, so both views share the same total.
  const visibleTotal = soldAmount;

  return (
    <div>
      <Link href="/stock-take" className="mb-3 inline-flex items-center gap-1.5 text-sm text-pine-700 hover:text-pine-900">
        <ArrowLeft className="h-4 w-4" />
        Stock take
      </Link>
      <PageHeader
        eyebrow={take.reference}
        title="Stock take report"
        description={`Counted by ${take.userName} on ${format(take.completedAt ?? take.startedAt, "dd MMM yyyy 'at' HH:mm")}.${
          take.notes ? ` ${take.notes}` : ""
        }`}
        action={
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-ghost" href={`/api/stock-take/${take.id}/report?show=moved`} download>
              <Download className="h-4 w-4" />
              Download moved lines
            </a>
            <a className="btn btn-ghost" href={`/api/stock-take/${take.id}/report?show=all`} download>
              <Download className="h-4 w-4" />
              Download all lines
            </a>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Sold amount" value={money(soldAmount)} hint={`${unitsSold} units`} />
        <StatCard label="Items sold" value={soldCount.toLocaleString()} hint="Closed below their open qty" />
        <StatCard label="Items counted" value={totalLines.toLocaleString()} hint={`${(totalLines - movedCount).toLocaleString()} unchanged`} />
      </div>

      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-pine-900">{showAll ? "All lines" : "Items that moved"}</h2>
          <div className="flex gap-2 text-sm">
            <Link
              href={`/stock-take/${take.id}`}
              className={cn("btn", showAll ? "btn-ghost" : "btn-primary")}
            >
              Moved ({movedCount.toLocaleString()})
            </Link>
            <Link
              href={`/stock-take/${take.id}?show=all`}
              className={cn("btn", showAll ? "btn-primary" : "btn-ghost")}
            >
              All lines ({totalLines.toLocaleString()})
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-grid min-w-[1000px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Stock code</th>
                <th>Ctg no.</th>
                <th>Description</th>
                <th>Type</th>
                <th>Unit sale</th>
                <th className="text-right">Price</th>
                <th className="text-right">Open qty</th>
                <th className="text-right">Close qty</th>
                <th className="text-right">Sold</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ item, sold, amount }, index) => {
                const type = drugTypeOf(item.product.controlled);
                return (
                  <tr key={item.id}>
                    <td className="text-ink/50">{skip + index + 1}</td>
                    <td className="whitespace-nowrap font-mono text-xs">{displayCode(item.product.sku)}</td>
                    <td>{item.product.categoryNo ?? "—"}</td>
                    <td>{item.product.name}</td>
                    <td>
                      <Badge tone={type === "DDA" ? "bad" : "neutral"}>{type}</Badge>
                    </td>
                    <td>{item.product.unit}</td>
                    <td className="text-right tabular-nums">{money(item.unitPrice)}</td>
                    <td className="text-right tabular-nums">{item.systemQty}</td>
                    <td className="text-right tabular-nums">{item.countedQty}</td>
                    <td className="text-right tabular-nums">{sold}</td>
                    <td className="text-right tabular-nums">{money(amount)}</td>
                  </tr>
                );
              })}
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-ink/60">
                    {showAll || movedCount === 0
                      ? "Nothing moved in this count. Every item closed at its open qty."
                      : "No lines on this page."}
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10} className="border-t border-pine-900/20 px-3 py-3 text-right font-semibold">
                  Total
                </td>
                <td className="border-t border-pine-900/20 px-3 py-3 text-right font-display text-lg tabular-nums text-pine-900">
                  {money(visibleTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={showAll ? totalLines : movedCount}
          basePath={`/stock-take/${take.id}`}
          params={{ show: showAll ? "all" : undefined, page: query.page }}
        />
        <p className="mt-2 text-xs text-ink/60">
          Sold = open qty − close qty, valued at the price on the day of the count.
        </p>
      </section>
    </div>
  );
}

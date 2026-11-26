import { pageTenant } from "@/lib/tenant";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { money } from "@/lib/utils";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import type { Prisma } from "@prisma/client";

const PAYMENTS = ["CASH", "CARD", "MOBILE", "INSURANCE"];

export default async function SalesPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const t = await pageTenant("counter");
  const { db } = t;
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const payment = params.payment && PAYMENTS.includes(params.payment) ? params.payment : undefined;
  const where: Prisma.SaleWhereInput = {
    ...(payment ? { payment } : {}),
    ...(q
      ? {
          OR: [
            { invoiceNo: { contains: q, mode: "insensitive" } },
            { cashierName: { contains: q, mode: "insensitive" } },
            { patient: { firstName: { contains: q, mode: "insensitive" } } },
            { patient: { lastName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [sales, total, pharmacy] = await Promise.all([
    db.sale.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.sale.count({ where }),
    Promise.resolve(t.org),
  ]);
  const currency = pharmacy?.currency ?? "ZMW";

  return (
    <div>
      <PageHeader title="Sales" description="Receipts, payment method, cashier, and patient." />
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_200px]">
          <ListSearch placeholder="Search invoice, cashier, or patient" />
          <ListFilter
            param="payment"
            label="Payment"
            options={[{ value: "", label: "All payments" }, ...PAYMENTS.map((value) => ({ value, label: value }))]}
          />
        </div>
        <div className="overflow-x-auto">
        <table className="table-grid">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>When</th>
              <th>Cashier</th>
              <th>Patient</th>
              <th>Payment</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="font-mono text-xs">
                  <Link className="text-pine-800 underline" href={`/documents/sales/${sale.id}`}>
                    {sale.invoiceNo}
                  </Link>
                </td>
                <td>{format(sale.createdAt, "dd MMM yyyy HH:mm")}</td>
                <td>{sale.cashierName}</td>
                <td>{sale.patient ? `${sale.patient.lastName}, ${sale.patient.firstName}` : "Walk-in"}</td>
                <td>{sale.payment}</td>
                <td>{money(sale.total, currency)}</td>
              </tr>
            ))}
            {sales.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink/60">
                  {q || payment ? "No sales match." : "No sales yet."}
                </td>
              </tr>
            ) : null}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/sales" params={params} />
      </section>
    </div>
  );
}

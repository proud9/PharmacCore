import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { canFinance, requireUser } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import { zmw } from "@/lib/documents";

const VIEWS = {
  outstanding: "Not fully paid",
  overdue: "Overdue",
  paid: "Paid in full",
  all: "All invoices",
} as const;
type View = keyof typeof VIEWS;

/** Money in (clients' invoices) or money out (manufacturers' invoices). Same columns, different tables. */
const SIDES = {
  clients: {
    label: "Clients owe us",
    from: Prisma.sql`Consignment c JOIN Institution i ON i.id = c.institutionId`,
    href: "/wholesale/",
    party: "Client",
  },
  manufacturers: {
    label: "We owe manufacturers",
    from: Prisma.sql`PurchaseOrder c JOIN Supplier i ON i.id = c.supplierId`,
    href: "/purchases/",
    party: "Manufacturer",
  },
} as const;
type Side = keyof typeof SIDES;

/** Money owed by clients: invoiced wholesale orders and what is still to be paid. Finance and admin only. */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const user = await requireUser();
  if (!user || !canFinance(user.role)) redirect(homePath(user?.role ?? ""));

  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const view: View = params.view && params.view in VIEWS ? (params.view as View) : "outstanding";
  const sideKey: Side = params.side === "manufacturers" ? "manufacturers" : "clients";
  const side = SIDES[sideKey];
  const now = Date.now();

  // Balance compares two columns, so the list is filtered in SQL. Dates are stored as epoch ms.
  const invoiced = Prisma.sql`c.invoiceNo IS NOT NULL AND c.quotedAmount IS NOT NULL AND c.status NOT IN ('DECLINED', 'CANCELLED')`;
  const owing = Prisma.sql`c.quotedAmount - c.amountPaid > 0.005`;
  const viewSql =
    view === "outstanding"
      ? owing
      : view === "overdue"
        ? Prisma.sql`${owing} AND c.dueOn IS NOT NULL AND c.dueOn < ${now}`
        : view === "paid"
          ? Prisma.sql`c.quotedAmount - c.amountPaid <= 0.005`
          : Prisma.sql`1 = 1`;
  const like = q ? `%${q}%` : null;
  const searchSql = like
    ? Prisma.sql`AND (c.reference LIKE ${like} OR c.invoiceNo LIKE ${like} OR i.name LIKE ${like})`
    : Prisma.empty;
  const where = Prisma.sql`WHERE ${invoiced} AND ${viewSql} ${searchSql}`;

  const [rows, [counted], [totals]] = await Promise.all([
    db.$queryRaw<
      {
        id: string;
        reference: string;
        invoiceNo: string;
        institution: string;
        quotedAmount: number;
        amountPaid: number;
        dueOn: number | bigint | null;
        invoicedAt: number | bigint | null;
      }[]
    >(Prisma.sql`
      SELECT c.id, c.reference, c.invoiceNo, i.name AS institution, c.quotedAmount, c.amountPaid, c.dueOn, c.invoicedAt
      FROM ${side.from}
      ${where}
      ORDER BY c.dueOn IS NULL, c.dueOn ASC, c.invoicedAt DESC
      LIMIT ${take} OFFSET ${skip}`),
    db.$queryRaw<{ n: bigint | number }[]>(Prisma.sql`
      SELECT COUNT(*) AS n FROM ${side.from} ${where}`),
    db.$queryRaw<{ owed: number | null; overdue: number | null; overdueCount: bigint | number; paid: number | null }[]>(Prisma.sql`
      SELECT
        SUM(CASE WHEN ${owing} THEN c.quotedAmount - c.amountPaid ELSE 0 END) AS owed,
        SUM(CASE WHEN ${owing} AND c.dueOn IS NOT NULL AND c.dueOn < ${now} THEN c.quotedAmount - c.amountPaid ELSE 0 END) AS overdue,
        SUM(CASE WHEN ${owing} AND c.dueOn IS NOT NULL AND c.dueOn < ${now} THEN 1 ELSE 0 END) AS overdueCount,
        SUM(c.amountPaid) AS paid
      FROM ${side.from} WHERE ${invoiced}`),
  ]);
  const total = Number(counted?.n ?? 0);
  const toDate = (value: number | bigint | null) => (value == null ? null : new Date(Number(value)));

  return (
    <div>
      <PageHeader
        title="Payments"
        description={
          sideKey === "clients"
            ? "Invoices sent to clients and what is still owed. Record money received on the order's invoice."
            : "Manufacturers' invoices and what is still to pay. Record payments on the purchase order."
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label={sideKey === "clients" ? "Still owed to us" : "Still to pay"}
          value={zmw(totals?.owed ?? 0)}
          hint="All unpaid invoice balances"
        />
        <StatCard
          label="Overdue"
          value={zmw(totals?.overdue ?? 0)}
          hint={`${Number(totals?.overdueCount ?? 0)} invoice(s) past the due date`}
        />
        <StatCard label={sideKey === "clients" ? "Received" : "Paid"} value={zmw(totals?.paid ?? 0)} hint="Paid against invoices" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_200px_200px]">
          <ListSearch placeholder={`Search invoice, order number or ${side.party.toLowerCase()}`} />
          <ListFilter
            param="side"
            label="Whose invoices"
            options={[
              { value: "", label: SIDES.clients.label },
              { value: "manufacturers", label: SIDES.manufacturers.label },
            ]}
          />
          <ListFilter
            param="view"
            label="Show"
            options={Object.entries(VIEWS).map(([value, label]) => ({ value: value === "outstanding" ? "" : value, label }))}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>{side.party}</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const balance = row.quotedAmount - row.amountPaid;
                const due = toDate(row.dueOn);
                const late = balance > 0.005 && due != null && due.getTime() < now;
                return (
                  <tr key={row.id}>
                    <td>
                      <Link href={`${side.href}${row.id}`} className="font-mono text-xs hover:underline">
                        {row.invoiceNo}
                      </Link>
                      <p className="font-mono text-[11px] text-ink/50">{row.reference}</p>
                    </td>
                    <td>{row.institution}</td>
                    <td>{zmw(row.quotedAmount)}</td>
                    <td>{zmw(row.amountPaid)}</td>
                    <td>{balance > 0.005 ? zmw(balance) : <Badge tone="good">Paid</Badge>}</td>
                    <td>
                      {due ? format(due, "dd MMM yyyy") : "—"}
                      {late ? (
                        <span className="ml-2">
                          <Badge tone="bad">Overdue</Badge>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink/60">
                    {q || view !== "outstanding" ? "No invoices match." : "Nothing is owed. Invoices with a balance appear here."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/wholesale/payments" params={params} />
      </section>
    </div>
  );
}

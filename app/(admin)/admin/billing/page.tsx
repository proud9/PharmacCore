import type { Metadata } from "next";
import Link from "next/link";
import { addDays, differenceInCalendarDays, format, startOfMonth } from "date-fns";
import { FileText } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { adminDb } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/capabilities";
import { GRACE_DAYS, SUBSCRIPTION_LABEL, subscriptionState } from "@/lib/subscription";
import { BILLING_FILTERS, BILLING_METHODS, BILLING_METHOD_LABEL, PAYMENT_SOURCE_LABEL, relativeDays } from "@/lib/billing";
import { billingWhere } from "@/lib/billing-server";
import { paging, searchText, type ListParams } from "@/lib/paging";
import { cn, money } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { BillingRow, type BillingRowData } from "@/components/admin/BillingForms";

export const metadata: Metadata = { title: "Billing · Parallax team" };

const TONE = { TRIAL: "info", ACTIVE: "good", GRACE: "warn", READ_ONLY: "bad", FREE: "neutral" } as const;

/**
 * Every paying account's subscription in one place: who is due, who is overdue, what has been
 * paid. The team marks accounts as paid and suspends them from here. Clients are free and not listed.
 */
export default async function TeamBillingPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const query = await searchParams;
  const view = query.view === "payments" ? "payments" : "accounts";
  const admin = adminDb();
  const now = new Date();

  const [dueSoon, grace, overdue, collected] = await Promise.all([
    admin.organization.count({ where: billingWhere("due-soon", "", now) }),
    admin.organization.count({ where: billingWhere("grace", "", now) }),
    admin.organization.count({ where: billingWhere("overdue", "", now) }),
    admin.subscriptionPayment.aggregate({ where: { status: "PAID", paidOn: { gte: startOfMonth(now) } }, _sum: { amount: true }, _count: true }),
  ]);

  const cards = [
    { label: "Due within 14 days", value: String(dueSoon), hint: "Paid up, ending soon", filter: "due-soon" },
    { label: "Payment due", value: String(grace), hint: `Ended, ${GRACE_DAYS} days to pay`, filter: "grace" },
    { label: "Overdue", value: String(overdue), hint: "Read-only until they pay", filter: "overdue" },
    { label: "Received this month", value: money(collected._sum.amount ?? 0), hint: `${collected._count} payment${collected._count === 1 ? "" : "s"}`, filter: null },
  ];

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Subscriptions for manufacturers, wholesalers and pharmacies: who is due, who is overdue, and every payment received. Clients are free."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const body = (
            <>
              <p className="text-[11px] uppercase tracking-[0.16em] text-pine-700/70">{card.label}</p>
              <p className={cn("mt-2 font-display text-3xl", card.filter === "overdue" && Number(card.value) > 0 ? "text-rust" : "text-pine-900")}>{card.value}</p>
              <p className="mt-1 text-xs text-ink/60">{card.hint}</p>
            </>
          );
          const className = "rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel";
          return card.filter ? (
            <Link key={card.label} href={`/admin/billing?status=${card.filter}`} className={cn(className, "transition hover:border-pine-700/30")}>
              {body}
            </Link>
          ) : (
            <Link key={card.label} href="/admin/billing?view=payments" className={cn(className, "transition hover:border-pine-700/30")}>
              {body}
            </Link>
          );
        })}
      </div>

      <nav className="mb-4 flex gap-2" aria-label="Billing views">
        <Link href="/admin/billing" className={cn("btn", view === "accounts" ? "btn-primary" : "btn-ghost")} aria-current={view === "accounts" ? "page" : undefined}>
          Accounts
        </Link>
        <Link href="/admin/billing?view=payments" className={cn("btn", view === "payments" ? "btn-primary" : "btn-ghost")} aria-current={view === "payments" ? "page" : undefined}>
          Payments received
        </Link>
      </nav>

      {view === "accounts" ? <Accounts query={query} now={now} /> : <Payments query={query} />}
    </div>
  );
}

async function Accounts({ query, now }: { query: ListParams; now: Date }) {
  const admin = adminDb();
  const q = searchText(query);
  const filter = BILLING_FILTERS.some((f) => f.value === query.status) ? (query.status ?? "") : "";
  const where = billingWhere(filter, q ?? "", now);
  const { page, take, skip, pageSize } = paging(query, 50);
  const [orgs, total] = await Promise.all([
    admin.organization.findMany({
      where,
      orderBy: [{ subscription: { periodEnd: "asc" } }, { name: "asc" }],
      take,
      skip,
      select: {
        id: true,
        name: true,
        kind: true,
        town: true,
        status: true,
        subscription: {
          select: {
            periodEnd: true,
            trialEndsAt: true,
            monthlyFee: true,
            payments: { where: { status: "PAID" }, orderBy: { paidOn: "desc" }, take: 1, select: { id: true, paidOn: true, amount: true } },
          },
        },
      },
    }),
    admin.organization.count({ where }),
  ]);

  const rows: BillingRowData[] = orgs.map((org) => {
    const state = subscriptionState(org.kind, org.subscription, now);
    const end = org.subscription?.periodEnd ?? null;
    const days = end ? differenceInCalendarDays(end, now) : null;
    const readOnlyIn = end ? differenceInCalendarDays(addDays(end, GRACE_DAYS), now) : null;
    const dueText =
      days === null
        ? "Never subscribed"
        : state.state === "READ_ONLY"
          ? `${-days} days overdue, read-only`
          : state.state === "GRACE"
            ? `Due ${relativeDays(days)}, read-only ${relativeDays(readOnlyIn ?? 0)}`
            : `${state.state === "TRIAL" ? "Trial ends" : "Due"} ${relativeDays(days)}`;
    const last = org.subscription?.payments[0];
    return {
      id: org.id,
      name: org.name,
      kindLabel: ROLE_LABEL[org.kind],
      town: org.town,
      status: org.status,
      stateLabel: SUBSCRIPTION_LABEL[state.state],
      stateTone: TONE[state.state],
      periodEnd: end ? end.toISOString() : null,
      dueText,
      overdue: state.state === "GRACE" || state.state === "READ_ONLY",
      monthlyFee: org.subscription?.monthlyFee ?? null,
      lastPayment: last ? { id: last.id, paidOn: last.paidOn.toISOString(), amount: last.amount } : null,
    };
  });

  return (
    <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_240px]">
        <ListSearch placeholder="Search by business name" />
        <ListFilter param="status" label="Show" options={BILLING_FILTERS.map((f) => ({ value: f.value, label: f.label }))} />
      </div>
      <div className="overflow-x-auto">
        <table className="table-grid min-w-[900px]">
          <thead>
            <tr>
              <th>Business</th>
              <th>Status</th>
              <th>Paid up to</th>
              <th className="text-right">Fee / month</th>
              <th>Last payment</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <BillingRow key={row.id} row={row} />
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink/60">
                  {q || filter ? "No accounts match." : "No paying accounts yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/billing" params={{ q: query.q, status: filter || undefined, page: query.page }} />
      <p className="mt-2 text-xs text-ink/60">
        Most urgent first. Suspending stops the login at once and signs the business out everywhere; it is not the same as read-only, which
        happens by itself {GRACE_DAYS} days after a subscription ends.
      </p>
    </section>
  );
}

async function Payments({ query }: { query: ListParams }) {
  const admin = adminDb();
  const q = searchText(query);
  const method = BILLING_METHODS.includes(query.method as (typeof BILLING_METHODS)[number]) ? query.method : undefined;
  const where: Prisma.SubscriptionPaymentWhereInput = {
    status: "PAID",
    ...(method ? { method } : {}),
    ...(q ? { OR: [{ orgName: { contains: q, mode: "insensitive" } }, { receiptNo: { contains: q, mode: "insensitive" } }, { reference: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const { page, take, skip, pageSize } = paging(query, 50);
  const [payments, total, sum] = await Promise.all([
    admin.subscriptionPayment.findMany({ where, orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }], take, skip }),
    admin.subscriptionPayment.count({ where }),
    admin.subscriptionPayment.aggregate({ where, _sum: { amount: true } }),
  ]);

  return (
    <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_200px]">
        <ListSearch placeholder="Business, receipt no. or reference" />
        <ListFilter
          param="method"
          label="Paid by"
          options={[{ value: "", label: "Any method" }, ...BILLING_METHODS.map((m) => ({ value: m, label: BILLING_METHOD_LABEL[m] }))]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="table-grid min-w-[960px]">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Paid on</th>
              <th>Business</th>
              <th className="text-right">Amount</th>
              <th>Paid by</th>
              <th>Covers</th>
              <th>Recorded</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="whitespace-nowrap font-mono text-xs">{payment.receiptNo}</td>
                <td className="whitespace-nowrap">{format(payment.paidOn, "dd MMM yyyy")}</td>
                <td>
                  <Link href={`/admin/billing/${payment.orgId}`} className="font-semibold text-pine-800 hover:underline">
                    {payment.orgName}
                  </Link>
                </td>
                <td className="text-right tabular-nums">{money(payment.amount)}</td>
                <td>
                  {BILLING_METHOD_LABEL[payment.method] ?? payment.method}
                  {payment.reference ? <p className="text-xs text-ink/60">{payment.reference}</p> : null}
                </td>
                <td className="whitespace-nowrap text-xs">
                  {format(payment.periodStart, "dd MMM yyyy")} – {format(payment.periodEnd, "dd MMM yyyy")}
                </td>
                <td className="text-xs text-ink/70">
                  {payment.source === "ONLINE" ? PAYMENT_SOURCE_LABEL.ONLINE : (payment.recordedByName ?? "Parallax team")}
                </td>
                <td>
                  <a className="btn btn-ghost whitespace-nowrap px-2.5 py-1.5 text-xs" href={`/documents/subscription/${payment.id}`}>
                    <FileText className="h-4 w-4" />
                    Receipt
                  </a>
                </td>
              </tr>
            ))}
            {payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-ink/60">
                  {q || method ? "No payments match." : "No payments recorded yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
          {payments.length ? (
            <tfoot>
              <tr>
                <td colSpan={3} className="border-t border-pine-900/20 px-3 py-3 text-right font-semibold">
                  Total{q || method ? " (matching)" : ""}
                </td>
                <td className="border-t border-pine-900/20 px-3 py-3 text-right font-display text-lg tabular-nums text-pine-900">{money(sum._sum.amount ?? 0)}</td>
                <td colSpan={4} className="border-t border-pine-900/20" />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/billing" params={{ view: "payments", q: query.q, method, page: query.page }} />
    </section>
  );
}

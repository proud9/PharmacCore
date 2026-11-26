import type { Metadata } from "next";
import { differenceInCalendarDays, format } from "date-fns";
import { CreditCard, FileText, Landmark, Smartphone } from "lucide-react";
import { pageTenant } from "@/lib/tenant";
import { SUBSCRIPTION_LABEL, subscriptionState } from "@/lib/subscription";
import { BILLING_METHOD_LABEL, ONLINE_PAYMENTS_ENABLED, relativeDays } from "@/lib/billing";
import { BILLING_DETAILS } from "@/lib/contact";
import { paging, type ListParams } from "@/lib/paging";
import { money } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";

export const metadata: Metadata = { title: "Billing · Parallax" };

const TONE = { TRIAL: "info", ACTIVE: "good", GRACE: "warn", READ_ONLY: "bad", FREE: "neutral" } as const;

/** The business's Parallax subscription: when it is due, how to pay, and every receipt. */
export default async function BillingPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const t = await pageTenant("billing");
  const query = await searchParams;
  const sub = t.org.subscription;
  const state = subscriptionState(t.org.kind, sub);
  const { page, take, skip, pageSize } = paging(query, 20);
  const [payments, total, last] = await Promise.all([
    t.db.subscriptionPayment.findMany({ where: { status: "PAID" }, orderBy: { paidOn: "desc" }, take, skip }),
    t.db.subscriptionPayment.count({ where: { status: "PAID" } }),
    t.db.subscriptionPayment.findFirst({ where: { status: "PAID" }, orderBy: { paidOn: "desc" } }),
  ]);

  const dueIn = state.periodEnd ? differenceInCalendarDays(state.periodEnd, new Date()) : null;
  const headline =
    state.state === "TRIAL"
      ? `Your free trial ends ${state.periodEnd ? format(state.periodEnd, "dd MMM yyyy") : "soon"} (${relativeDays(state.daysLeft ?? 0)}).`
      : state.state === "ACTIVE"
        ? `Paid up to ${format(state.periodEnd!, "dd MMM yyyy")}. The next payment is due then.`
        : state.state === "GRACE"
          ? `Payment is due. Everything keeps working until ${format(state.readOnlyOn!, "dd MMM yyyy")} (${relativeDays(state.daysLeft ?? 0)}), then the account becomes read-only.`
          : "Your subscription has lapsed, so the account is read-only: you can view and print, but not create or change anything. Pay to switch everything back on.";

  return (
    <div>
      <PageHeader title="Billing" description="Your Parallax subscription: when it is due, how to pay, and your receipts." />

      <section
        className={
          state.state === "READ_ONLY"
            ? "mb-6 rounded-2xl border border-rust/25 bg-rust/10 p-5"
            : state.state === "GRACE"
              ? "mb-6 rounded-2xl border border-brass/40 bg-brass/10 p-5"
              : "mb-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel"
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={TONE[state.state]}>{SUBSCRIPTION_LABEL[state.state]}</Badge>
          <p className="font-display text-lg text-pine-900">{headline}</p>
        </div>
      </section>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={state.state === "TRIAL" ? "Trial ends" : "Paid up to"}
          value={state.periodEnd ? format(state.periodEnd, "dd MMM yyyy") : "—"}
          hint={dueIn === null ? undefined : dueIn >= 0 ? `Due ${relativeDays(dueIn)}` : `Was due ${relativeDays(dueIn)}`}
        />
        <StatCard
          label="Read-only from"
          value={state.readOnlyOn ? format(state.readOnlyOn, "dd MMM yyyy") : "—"}
          hint="If not renewed by then"
        />
        <StatCard label="Fee" value={sub?.monthlyFee != null ? money(sub.monthlyFee) : "Ask the team"} hint="Per month" />
        <StatCard
          label="Last payment"
          value={last ? money(last.amount) : "None yet"}
          hint={last ? `${format(last.paidOn, "dd MMM yyyy")} · ${BILLING_METHOD_LABEL[last.method] ?? last.method}` : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Payment history</h2>
          <p className="mb-3 text-sm text-ink/60">Every payment the Parallax team has received from you, with its receipt.</p>
          <div className="overflow-x-auto">
            <table className="table-grid min-w-[640px]">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Paid on</th>
                  <th className="text-right">Amount</th>
                  <th>Paid by</th>
                  <th>Covers</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap font-mono text-xs">{payment.receiptNo}</td>
                    <td className="whitespace-nowrap">{format(payment.paidOn, "dd MMM yyyy")}</td>
                    <td className="text-right tabular-nums">{money(payment.amount)}</td>
                    <td>{BILLING_METHOD_LABEL[payment.method] ?? payment.method}</td>
                    <td className="whitespace-nowrap">
                      {format(payment.periodStart, "dd MMM yyyy")} – {format(payment.periodEnd, "dd MMM yyyy")}
                    </td>
                    <td>
                      <a className="btn btn-ghost whitespace-nowrap" href={`/documents/subscription/${payment.id}`}>
                        <FileText className="h-4 w-4" />
                        Receipt
                      </a>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-ink/60">
                      No payments yet. Your receipts appear here once the Parallax team records a payment.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} basePath="/billing" params={{ page: query.page }} />
        </section>

        <section className="h-fit rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">How to pay</h2>
          <p className="mt-1 text-sm text-ink/70">
            Pay Parallax directly and use <strong>{t.org.name}</strong> as the reference. The team records your payment and your receipt
            appears in the history.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex gap-3">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-dispensary" aria-hidden="true" />
              <div>
                <dt className="font-semibold text-pine-900">Bank transfer</dt>
                <dd className="text-ink/80">
                  {BILLING_DETAILS.bankName ?? "Bank: to be added"} · {BILLING_DETAILS.accountName}
                  <br />
                  Account {BILLING_DETAILS.accountNumber ?? "to be added"}
                  {BILLING_DETAILS.branch ? ` · ${BILLING_DETAILS.branch}` : ""}
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-dispensary" aria-hidden="true" />
              <div>
                <dt className="font-semibold text-pine-900">Mobile money</dt>
                <dd className="text-ink/80">{BILLING_DETAILS.mobileMoney ?? "Number to be added"}</dd>
              </div>
            </div>
          </dl>
          <div className="mt-5 rounded-xl bg-shelf p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-pine-900">
              <CreditCard className="h-4 w-4 text-pine-700" aria-hidden="true" />
              Pay online by card or mobile money
            </p>
            {ONLINE_PAYMENTS_ENABLED ? null : (
              <p className="mt-1 text-ink/70">
                Coming soon. You will be able to pay here and get your receipt straight away, without waiting for the team.
              </p>
            )}
            <button type="button" className="btn btn-primary mt-3" disabled={!ONLINE_PAYMENTS_ENABLED} title="Coming soon">
              Pay now
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

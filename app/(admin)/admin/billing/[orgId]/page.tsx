import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import { ArrowLeft, FileText } from "lucide-react";
import { adminDb } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/capabilities";
import { SUBSCRIPTION_LABEL, pays, subscriptionState } from "@/lib/subscription";
import { BILLING_METHOD_LABEL, PAYMENT_SOURCE_LABEL, relativeDays } from "@/lib/billing";
import { paging, type ListParams } from "@/lib/paging";
import { money } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";
import { FeeForm, RecordPaymentForm, SuspendToggle } from "@/components/admin/BillingForms";

export const metadata: Metadata = { title: "Billing · Parallax team" };

const TONE = { TRIAL: "info", ACTIVE: "good", GRACE: "warn", READ_ONLY: "bad", FREE: "neutral" } as const;

/** One account's billing: status, fee, mark as paid, suspend, and every payment with its receipt. */
export default async function AccountBillingPage({ params, searchParams }: { params: Promise<{ orgId: string }>; searchParams: Promise<ListParams> }) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const admin = adminDb();
  const org = await admin.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, kind: true, town: true, status: true, subscription: true },
  });
  if (!org || org.status === "DELETED" || !pays(org.kind)) notFound();

  const state = subscriptionState(org.kind, org.subscription);
  const { page, take, skip, pageSize } = paging(query, 25);
  const [payments, total, totals] = await Promise.all([
    admin.subscriptionPayment.findMany({ where: { orgId, status: "PAID" }, orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }], take, skip }),
    admin.subscriptionPayment.count({ where: { orgId, status: "PAID" } }),
    admin.subscriptionPayment.aggregate({ where: { orgId, status: "PAID" }, _sum: { amount: true } }),
  ]);
  const dueIn = state.periodEnd ? differenceInCalendarDays(state.periodEnd, new Date()) : null;

  return (
    <div>
      <Link href="/admin/billing" className="mb-3 inline-flex items-center gap-1.5 text-sm text-pine-700 hover:text-pine-900">
        <ArrowLeft className="h-4 w-4" />
        Billing
      </Link>
      <PageHeader
        eyebrow={`Billing · ${ROLE_LABEL[org.kind]}${org.town ? ` · ${org.town}` : ""}`}
        title={org.name}
        description="Subscription, payments and receipts for this account."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/businesses/${org.id}`} className="btn btn-ghost">
              Account details
            </Link>
            <SuspendToggle orgId={org.id} name={org.name} status={org.status} />
          </div>
        }
      />
      {org.status === "SUSPENDED" ? (
        <p role="status" className="mb-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">
          Suspended: the login doesn&apos;t work until you reactivate it. Recording a payment does not reactivate it.
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.16em] text-pine-700/70">Status</p>
          <div className="mt-3">
            <Badge tone={TONE[state.state]}>{SUBSCRIPTION_LABEL[state.state]}</Badge>
          </div>
          <p className="mt-2 text-xs text-ink/60">
            {state.readOnlyOn && state.state !== "READ_ONLY" ? `Read-only from ${format(state.readOnlyOn, "dd MMM yyyy")} if unpaid` : state.state === "READ_ONLY" ? "Read-only until paid" : ""}
          </p>
        </div>
        <StatCard
          label={state.state === "TRIAL" ? "Trial ends" : "Paid up to"}
          value={state.periodEnd ? format(state.periodEnd, "dd MMM yyyy") : "—"}
          hint={dueIn === null ? "Never subscribed" : dueIn >= 0 ? `Due ${relativeDays(dueIn)}` : `${-dueIn} days overdue`}
        />
        <StatCard label="Fee" value={org.subscription?.monthlyFee != null ? money(org.subscription.monthlyFee) : "Not set"} hint="Per month" />
        <StatCard label="Paid in total" value={money(totals._sum.amount ?? 0)} hint={`${total} payment${total === 1 ? "" : "s"}`} />
      </div>

      <section id="record" className="mb-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="mb-3 font-display text-xl text-pine-900">Mark as paid</h2>
        <RecordPaymentForm orgId={org.id} monthlyFee={org.subscription?.monthlyFee ?? null} wide />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Payment history</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="table-grid min-w-[720px]">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Paid on</th>
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
                    <td className="text-right tabular-nums">{money(payment.amount)}</td>
                    <td>
                      {BILLING_METHOD_LABEL[payment.method] ?? payment.method}
                      {payment.reference ? <p className="text-xs text-ink/60">{payment.reference}</p> : null}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {format(payment.periodStart, "dd MMM yyyy")} – {format(payment.periodEnd, "dd MMM yyyy")}
                    </td>
                    <td className="text-xs text-ink/70">{payment.source === "ONLINE" ? PAYMENT_SOURCE_LABEL.ONLINE : (payment.recordedByName ?? "Parallax team")}</td>
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
                    <td colSpan={7} className="py-6 text-center text-ink/60">
                      No payments yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} basePath={`/admin/billing/${org.id}`} params={{ page: query.page }} />
        </section>

        {org.subscription ? (
          <section className="h-fit rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
            <h2 className="mb-1 font-display text-xl text-pine-900">Fee</h2>
            <p className="mb-3 text-sm text-ink/60">The agreed price per month. The business sees it on its Billing page.</p>
            <FeeForm orgId={org.id} monthlyFee={org.subscription.monthlyFee} />
          </section>
        ) : null}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { adminDb } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/capabilities";
import { SUBSCRIPTION_LABEL, pays, subscriptionState } from "@/lib/subscription";
import { money } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { BusinessProfileForm, BusinessStatusActions, LoginActions, SubscriptionForm } from "@/components/admin/BusinessForms";

/**
 * One business, as the Parallax team sees it: account details, logins and subscription.
 * Its stock, orders, prices and documents are not available here (and not to this database role).
 */
export default async function AdminBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = adminDb();
  const org = await admin.organization.findUnique({
    where: { id },
    select: {
      id: true,
      kind: true,
      name: true,
      town: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      listed: true,
      status: true,
      deletedAt: true,
      createdAt: true,
      users: { select: { id: true, name: true, email: true, active: true, lastLoginAt: true, mustChangePassword: true } },
      subscription: { include: { payments: { orderBy: { paidOn: "desc" }, take: 10 } } },
    },
  });
  if (!org) notFound();
  const sub = subscriptionState(org.kind, org.subscription);
  const history = await admin.platformAudit.findMany({ where: { orgId: id }, orderBy: { createdAt: "desc" }, take: 15 });

  return (
    <div>
      <Link href="/admin/businesses" className="mb-3 inline-flex items-center gap-1.5 text-sm text-pine-700 hover:text-pine-900">
        <ArrowLeft className="h-4 w-4" />
        Businesses
      </Link>
      <PageHeader
        eyebrow={ROLE_LABEL[org.kind]}
        title={org.name}
        description={`Joined ${format(org.createdAt, "dd MMM yyyy")}${org.town ? ` · ${org.town}` : ""}`}
        action={<BusinessStatusActions orgId={org.id} status={org.status} />}
      />
      {org.status === "DELETED" ? (
        <p role="status" className="mb-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">
          Deleted on {org.deletedAt ? format(org.deletedAt, "dd MMM yyyy") : "—"}. Its own records are erased 30 days after that; orders
          with other businesses stay in their history.
        </p>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <BusinessProfileForm
          orgId={org.id}
          details={{
            name: org.name,
            town: org.town ?? "",
            address: org.address ?? "",
            phone: org.phone ?? "",
            email: org.email ?? "",
            website: org.website ?? "",
            listed: org.listed,
          }}
        />
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Login</h2>
          <p className="mb-3 text-sm text-ink/60">One login per business.</p>
          {org.users.map((user) => (
            <div key={user.id} className="space-y-2 text-sm">
              <p className="font-semibold">{user.name}</p>
              <p>{user.email}</p>
              <p className="text-ink/60">
                Last sign-in: {user.lastLoginAt ? format(user.lastLoginAt, "dd MMM yyyy HH:mm") : "never"}
                {user.mustChangePassword ? " · must choose a new password" : ""}
                {user.active ? "" : " · switched off"}
              </p>
              <LoginActions userId={user.id} active={user.active} />
            </div>
          ))}
        </section>
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl text-pine-900">Subscription</h2>
            <Badge tone={sub.state === "READ_ONLY" ? "bad" : sub.state === "GRACE" ? "warn" : "neutral"}>{SUBSCRIPTION_LABEL[sub.state]}</Badge>
          </div>
          {pays(org.kind) ? (
            <>
              <p className="mt-1 text-sm text-ink/60">
                {sub.periodEnd ? `Paid up to ${format(sub.periodEnd, "dd MMM yyyy")}.` : "No subscription yet."}{" "}
                {sub.readOnlyOn ? `Read-only from ${format(sub.readOnlyOn, "dd MMM yyyy")} if not renewed.` : ""}
              </p>
              <SubscriptionForm orgId={org.id} />
              {org.subscription?.payments.length ? (
                <table className="table-grid mt-4">
                  <thead>
                    <tr>
                      <th>Paid on</th>
                      <th>Amount</th>
                      <th>Covers</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {org.subscription.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{format(payment.paidOn, "dd MMM yyyy")}</td>
                        <td>{money(payment.amount)}</td>
                        <td>
                          {format(payment.periodStart, "dd MMM yyyy")} – {format(payment.periodEnd, "dd MMM yyyy")}
                        </td>
                        <td>{payment.reference ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-sm text-ink/60">Clients use Parallax free of charge.</p>
          )}
        </section>
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Team actions on this account</h2>
          <ul className="mt-3 divide-y divide-pine-900/10 text-sm">
            {history.length === 0 ? <li className="py-2 text-ink/60">None yet.</li> : null}
            {history.map((row) => (
              <li key={row.id} className="py-2">
                <span className="text-xs text-ink/50">{format(row.createdAt, "dd MMM yyyy HH:mm")}</span> ·{" "}
                {row.action.toLowerCase().replace(/_/g, " ")}
                {row.details ? ` · ${row.details}` : ""}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

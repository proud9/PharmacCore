import Link from "next/link";
import { format } from "date-fns";
import { adminDb } from "@/lib/db";
import { ORG_KINDS, ROLE_LABEL } from "@/lib/capabilities";
import { SUBSCRIPTION_LABEL, subscriptionState } from "@/lib/subscription";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";

/** Counts of businesses and subscriptions that need attention. No business's trade figures. */
export default async function AdminOverview() {
  const admin = adminDb();
  const [byKind, demos, recent, subs] = await Promise.all([
    admin.organization.groupBy({ by: ["kind"], where: { status: { not: "DELETED" } }, _count: true }),
    admin.demoRequest.count({ where: { contactedAt: null } }),
    admin.organization.findMany({
      where: { status: { not: "DELETED" } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, kind: true, town: true, createdAt: true },
    }),
    admin.subscription.findMany({
      where: { org: { status: "ACTIVE" } },
      orderBy: { periodEnd: "asc" },
      take: 200,
      select: { periodEnd: true, trialEndsAt: true, org: { select: { id: true, name: true, kind: true } } },
    }),
  ]);
  const count = (kind: string) => byKind.find((row) => row.kind === kind)?._count ?? 0;
  const attention = subs
    .map((sub) => ({ ...sub, state: subscriptionState(sub.org.kind, sub) }))
    .filter((sub) => sub.state.state === "GRACE" || sub.state.state === "READ_ONLY" || (sub.state.daysLeft ?? 99) <= 14)
    .slice(0, 12);

  return (
    <div>
      <PageHeader title="Overview" description="Businesses on Parallax and subscriptions that need attention." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {ORG_KINDS.map((kind) => (
          <StatCard key={kind} label={`${ROLE_LABEL[kind]}s`} value={String(count(kind))} />
        ))}
        <StatCard label="Demo requests" value={String(demos)} hint="Not yet contacted" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Subscriptions to follow up</h2>
          <p className="mb-4 text-sm text-ink/60">Ending within 14 days, payment due, or read-only.</p>
          {attention.length === 0 ? (
            <p className="text-sm text-ink/60">Nothing due.</p>
          ) : (
            <ul className="divide-y divide-pine-900/10 text-sm">
              {attention.map((sub) => (
                <li key={sub.org.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/admin/businesses/${sub.org.id}`} className="font-semibold text-pine-800 hover:underline">
                    {sub.org.name}
                  </Link>
                  <span className="text-ink/60">Ends {format(sub.periodEnd, "dd MMM yyyy")}</span>
                  <Badge tone={sub.state.state === "READ_ONLY" ? "bad" : sub.state.state === "GRACE" ? "warn" : "neutral"}>
                    {SUBSCRIPTION_LABEL[sub.state.state]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Newest businesses</h2>
          <ul className="mt-4 divide-y divide-pine-900/10 text-sm">
            {recent.map((org) => (
              <li key={org.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/admin/businesses/${org.id}`} className="font-semibold text-pine-800 hover:underline">
                  {org.name}
                </Link>
                <span className="text-ink/60">
                  {ROLE_LABEL[org.kind]} · {org.town ?? "—"}
                </span>
                <span className="text-xs text-ink/50">{format(org.createdAt, "dd MMM yyyy")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

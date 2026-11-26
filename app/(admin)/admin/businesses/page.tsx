import Link from "next/link";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";
import { adminDb } from "@/lib/db";
import { ORG_KINDS, ROLE_LABEL } from "@/lib/capabilities";
import { SUBSCRIPTION_LABEL, subscriptionState } from "@/lib/subscription";
import { purgeDeletedOrgs } from "@/lib/org-deletion";
import { paging, searchText, type ListParams } from "@/lib/paging";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { CreateBusinessForm } from "@/components/admin/CreateBusinessForm";

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", SUSPENDED: "Suspended", DELETED: "Deleted" };

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  await purgeDeletedOrgs();
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const kind = params.kind && (ORG_KINDS as readonly string[]).includes(params.kind) ? params.kind : undefined;
  const status = params.status && STATUS_LABEL[params.status] ? params.status : undefined;
  const where: Prisma.OrganizationWhereInput = {
    ...(kind ? { kind } : {}),
    ...(status ? { status } : { status: { not: "DELETED" } }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { town: { contains: q, mode: "insensitive" } },
            { users: { some: { email: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const admin = adminDb();
  const [orgs, total] = await Promise.all([
    admin.organization.findMany({
      where,
      orderBy: { name: "asc" },
      take,
      skip,
      select: {
        id: true,
        name: true,
        kind: true,
        town: true,
        status: true,
        createdAt: true,
        subscription: { select: { periodEnd: true, trialEndsAt: true } },
        users: { select: { email: true }, take: 1 },
      },
    }),
    admin.organization.count({ where }),
  ]);

  return (
    <div>
      <PageHeader title="Businesses" description="Every business account on Parallax. Open one to edit its details, logins or subscription." />
      <CreateBusinessForm />
      <section className="mt-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-[240px] flex-1">
            <ListSearch placeholder="Search by name, town or login email" />
          </div>
          <ListFilter param="kind" label="Type" options={ORG_KINDS.map((value) => ({ value, label: ROLE_LABEL[value] }))} />
          <ListFilter param="status" label="Status" options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        </div>
        <div className="overflow-x-auto">
          <table className="table-grid min-w-[800px]">
            <thead>
              <tr>
                <th>Business</th>
                <th>Type</th>
                <th>Town</th>
                <th>Login</th>
                <th>Subscription</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => {
                const sub = subscriptionState(org.kind, org.subscription);
                return (
                  <tr key={org.id}>
                    <td>
                      <Link href={`/admin/businesses/${org.id}`} className="font-semibold text-pine-800 hover:underline">
                        {org.name}
                      </Link>
                      {org.status !== "ACTIVE" ? (
                        <span className="ml-2">
                          <Badge tone="bad">{STATUS_LABEL[org.status]}</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td>{ROLE_LABEL[org.kind]}</td>
                    <td>{org.town ?? "—"}</td>
                    <td className="text-xs">{org.users[0]?.email ?? "—"}</td>
                    <td>
                      <Badge tone={sub.state === "READ_ONLY" ? "bad" : sub.state === "GRACE" ? "warn" : "neutral"}>
                        {SUBSCRIPTION_LABEL[sub.state]}
                      </Badge>
                    </td>
                    <td>{format(org.createdAt, "dd MMM yyyy")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/businesses" params={params} />
      </section>
    </div>
  );
}

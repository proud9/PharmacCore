import type { Prisma } from "@prisma/client";
import { pageTenant } from "@/lib/tenant";
import { db as platform } from "@/lib/db";
import { customerKinds, ROLE_LABEL, supplierKinds } from "@/lib/capabilities";
import { LINK_STATUS_LABEL } from "@/lib/trade";
import { paging, searchText, type ListParams } from "@/lib/paging";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/Badge";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { ConnectButton } from "@/components/trade/ConnectionActions";

/**
 * Businesses on Parallax this one can trade with. Only name, type and town are shown; prices and
 * item lists appear only after both sides connect.
 */
export default async function DirectoryPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const t = await pageTenant();
  const { org } = t;
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const kinds = [...supplierKinds(org.kind), ...customerKinds(org.kind)];
  const kind = params.kind && kinds.includes(params.kind as never) ? params.kind : undefined;
  const where: Prisma.OrganizationWhereInput = {
    id: { not: org.id },
    status: "ACTIVE",
    listed: true,
    kind: kind ? kind : { in: kinds },
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { town: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [businesses, total] = await Promise.all([
    platform.organization.findMany({ where, select: { id: true, name: true, kind: true, town: true }, orderBy: { name: "asc" }, take, skip }),
    platform.organization.count({ where }),
  ]);
  const links = await t.db.tradeLink.findMany({
    where: {
      OR: [
        { sellerOrgId: org.id, buyerOrgId: { in: businesses.map((b) => b.id) } },
        { buyerOrgId: org.id, sellerOrgId: { in: businesses.map((b) => b.id) } },
      ],
    },
  });
  const linkWith = new Map(links.map((link) => [link.sellerOrgId === org.id ? link.buyerOrgId : link.sellerOrgId, link]));

  return (
    <div>
      <PageHeader
        title="Find businesses"
        description="Businesses you can buy from or sell to. Ask to connect; once they accept, you can send inquiries and quotes. Nobody sees your prices unless you quote them."
      />
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-[240px] flex-1">
            <ListSearch placeholder="Search by name or town" />
          </div>
          <ListFilter param="kind" label="Type" options={kinds.map((value) => ({ value, label: ROLE_LABEL[value] }))} />
        </div>
        {businesses.length === 0 ? <p className="text-sm text-ink/60">No businesses match.</p> : null}
        <ul className="divide-y divide-pine-900/10">
          {businesses.map((business) => {
            const link = linkWith.get(business.id);
            const buyFrom = supplierKinds(org.kind).includes(business.kind as never);
            return (
              <li key={business.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-pine-900">{business.name}</p>
                  <p className="text-sm text-ink/60">
                    {ROLE_LABEL[business.kind]} · {business.town ?? "—"} · {buyFrom ? "you could buy from them" : "you could sell to them"}
                  </p>
                </div>
                {link?.status === "ACTIVE" ? (
                  <Badge tone="good">{LINK_STATUS_LABEL.ACTIVE}</Badge>
                ) : link?.status === "PENDING" && link.requestedByOrgId === org.id ? (
                  <Badge>{LINK_STATUS_LABEL.PENDING}</Badge>
                ) : t.readOnly ? null : (
                  <ConnectButton
                    orgId={business.id}
                    label={link?.status === "PENDING" ? "Accept their request" : "Ask to connect"}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/directory" params={params} />
      </section>
    </div>
  );
}

import { format } from "date-fns";
import { adminDb } from "@/lib/db";
import { paging, type ListParams } from "@/lib/paging";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";

/** Everything the Parallax team has done: account creation, resets, suspensions, payments, messages. */
export default async function TeamActivityPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const admin = adminDb();
  const [rows, total] = await Promise.all([
    admin.platformAudit.findMany({ orderBy: { createdAt: "desc" }, take, skip }),
    admin.platformAudit.count(),
  ]);
  const ids = [...new Set(rows.flatMap((row) => [row.userId, row.orgId]).filter((id): id is string => !!id))];
  const [users, orgs] = await Promise.all([
    admin.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    admin.organization.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
  ]);
  const names = new Map([...users, ...orgs].map((row) => [row.id, row.name]));

  return (
    <div>
      <PageHeader title="Team activity" description="Every action taken by the Parallax team." />
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <table className="table-grid">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>What</th>
              <th>Business</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{format(row.createdAt, "dd MMM yyyy HH:mm")}</td>
                <td>{names.get(row.userId ?? "") ?? "—"}</td>
                <td>{row.action.toLowerCase().replace(/_/g, " ")}</td>
                <td>{names.get(row.orgId ?? "") ?? "—"}</td>
                <td className="text-xs">{row.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/activity" params={params} />
      </section>
    </div>
  );
}

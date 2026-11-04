import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { SearchScope } from "@/components/search/SearchScope";

export default async function AuditPage() {
  const logs = await db.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  return (
    <div>
      <PageHeader title="Activity log" description="Who signed in, who sold stock, and who changed records." />
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <SearchScope placeholder="Search person, action, or detail">
        <table className="table-grid">
          <thead>
            <tr>
              <th>When</th>
              <th>Person</th>
              <th>Action</th>
              <th>Record</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                data-search={`${log.user?.name ?? "system"} ${log.action} ${log.entity} ${log.details ?? ""}`.toLowerCase()}
              >
                <td>{format(log.createdAt, "dd MMM HH:mm")}</td>
                <td>{log.user?.name ?? "System"}</td>
                <td className="font-mono text-xs">{log.action}</td>
                <td>{log.entity}</td>
                <td className="text-xs text-ink/70">{log.details}</td>
              </tr>
            ))}
            </tbody>
        </table>
        </SearchScope>
      </section>
    </div>
  );
}

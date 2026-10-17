import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";

export default async function AuditPage() {
  const logs = await db.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Audit trail"
        description="Immutable activity log for logins, stock movements, sales, and clinical actions."
      />
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white shadow-panel">
        <table className="table-grid">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{format(log.createdAt, "dd MMM HH:mm")}</td>
                <td>{log.user?.name ?? "System"}</td>
                <td className="font-mono text-xs">{log.action}</td>
                <td>{log.entity}</td>
                <td className="text-xs text-ink/70">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

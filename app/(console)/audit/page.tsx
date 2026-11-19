import { plainStatus } from "@/lib/wholesale";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { ListSearch } from "@/components/search/ListSearch";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import type { Prisma } from "@prisma/client";

/** Record types in plain words. */
const ENTITY_LABEL: Record<string, string> = {
  Consignment: "Order",
  Institution: "Client account",
  Pharmacy: "Company",
  StockTake: "Stock take",
  StockIntake: "Delivery line",
  PurchaseOrder: "Purchase order",
  DemoRequest: "Demo request",
};

/** "CONSIGNMENT_STATUS" → "Order status"; codes stay searchable because the log stores them as-is. */
function actionLabel(action: string) {
  const words = action
    .toLowerCase()
    .replace(/consignment/g, "order")
    .replace(/\brx\b/g, "prescription")
    .replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const where: Prisma.AuditLogWhereInput = q
    ? {
        OR: [
          { action: { contains: q.replace(/\s+/g, "_") } },
          { entity: { contains: q } },
          { details: { contains: q } },
          { user: { name: { contains: q } } },
        ],
      }
    : {};
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.auditLog.count({ where }),
  ]);

  return (
    <div>
      <PageHeader title="Activity log" description="Who signed in, who sold stock, and who changed records." />
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <div className="mb-3">
          <ListSearch placeholder="Search person, action, or detail" />
        </div>
        <div className="overflow-x-auto">
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
              <tr key={log.id}>
                <td className="whitespace-nowrap">{format(log.createdAt, "dd MMM yyyy HH:mm")}</td>
                <td>{log.user?.name ?? "System"}</td>
                <td>{actionLabel(log.action)}</td>
                <td>{ENTITY_LABEL[log.entity] ?? log.entity}</td>
                <td className="text-xs text-ink/70">{log.details ? plainStatus(log.details) : null}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink/60">
                  {q ? "No activity matches." : "No activity yet."}
                </td>
              </tr>
            ) : null}
            </tbody>
        </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/audit" params={params} />
      </section>
    </div>
  );
}

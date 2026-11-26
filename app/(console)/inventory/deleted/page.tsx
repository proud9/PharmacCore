import { pageTenant } from "@/lib/tenant";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { RestoreButton } from "@/components/inventory/RestoreButton";
import { daysLeft, purgeDateOf, purgeExpiredDeletions, RETENTION_DAYS } from "@/lib/deletion";
import { drugTypeOf } from "@/lib/stocksheet";
import { stockOf } from "@/lib/utils";

/** Items deleted from Inventory, restorable until they are permanently deleted. */
export default async function DeleteQueuePage() {
  const t = await pageTenant("catalog");
  const { db } = t;
  await purgeExpiredDeletions(t);
  const items = await db.product.findMany({
    where: { deletedAt: { not: null }, purgedAt: null },
    include: { batches: true },
    orderBy: { deletedAt: "asc" },
  });
  const canRestore = !t.readOnly;

  return (
    <div>
      <Link href="/inventory" className="mb-3 inline-flex items-center gap-1.5 text-sm text-pine-700 hover:text-pine-900">
        <ArrowLeft className="h-4 w-4" />
        Inventory
      </Link>
      <PageHeader
        title="Delete queue"
        description={`Deleted items stay here for ${RETENTION_DAYS} days and can be restored with their stock. After that they are permanently deleted.`}
      />
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <div className="overflow-x-auto">
          <table className="table-grid min-w-[1000px]">
            <thead>
              <tr>
                <th>Stock code</th>
                <th>Description</th>
                <th>Type</th>
                <th className="text-right">Stock held</th>
                <th>Reason</th>
                <th>Deleted by</th>
                <th>Deleted on</th>
                <th>Permanently deleted</th>
                {canRestore ? <th className="sr-only">Restore</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const deletedAt = item.deletedAt!;
                const left = daysLeft(deletedAt);
                const type = drugTypeOf(item.controlled);
                return (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap font-mono text-xs">{item.sku}</td>
                    <td>{item.name}</td>
                    <td>
                      <Badge tone={type === "DDA" ? "bad" : "neutral"}>{type}</Badge>
                    </td>
                    <td className="text-right tabular-nums">{stockOf(item.batches)}</td>
                    <td className="max-w-xs">{item.deleteReason ?? "—"}</td>
                    <td>{item.deletedByName ?? "—"}</td>
                    <td className="whitespace-nowrap">{format(deletedAt, "dd MMM yyyy")}</td>
                    <td className="whitespace-nowrap">
                      {format(purgeDateOf(deletedAt), "dd MMM yyyy")}
                      <div className="mt-1">
                        <Badge tone={left <= 7 ? "bad" : "warn"}>
                          {left === 0 ? "Today" : `${left} day${left === 1 ? "" : "s"} left`}
                        </Badge>
                      </div>
                    </td>
                    {canRestore ? (
                      <td>
                        <RestoreButton id={item.id} name={item.name} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={canRestore ? 9 : 8} className="py-8 text-center text-ink/60">
                    The delete queue is empty. Items you delete in Inventory appear here for {RETENTION_DAYS} days.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/60">
          Items that were never sold, prescribed, ordered or counted are erased completely. Items with history are
          locked instead, so past receipts and reports still show them; their stock code is freed for reuse.
        </p>
      </section>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { canWholesale, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { KIND_LABEL, STATUS_LABEL, statusTone } from "@/lib/wholesale";
import { money } from "@/lib/utils";
import { SearchScope } from "@/components/search/SearchScope";

export default async function WholesaleDeskPage() {
  const user = await requireUser();
  if (!user || !canWholesale(user.role)) redirect("/dashboard");

  const orders = await db.consignment.findMany({
    include: { institution: true, requestedBy: true, items: true },
    orderBy: { createdAt: "desc" },
  });
  const open = orders.filter((o) => !["DELIVERED", "DECLINED", "CANCELLED"].includes(o.status));
  const awaitingQuote = orders.filter((o) => o.status === "REQUESTED");
  const quotedValue = orders
    .filter((o) => o.quotedAmount && !["DECLINED", "CANCELLED"].includes(o.status))
    .reduce((sum, o) => sum + (o.quotedAmount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Wholesale orders"
        description="Hospitals, clinics, and pharmacies send order requests. Reply with a price in Kwacha and when the order will be ready."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Open orders" value={String(open.length)} hint="Not finished yet" />
        <StatCard label="Waiting for a price" value={String(awaitingQuote.length)} hint="New requests" />
        <StatCard label="Quoted total" value={money(quotedValue, "ZMW")} hint="Amount offered to buyers" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <SearchScope placeholder="Search order number or organisation">
        <table className="table-grid">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Organisation</th>
              <th>Items</th>
              <th>Price (ZMW)</th>
              <th>Ready</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                data-search={`${order.reference} ${order.institution.name} ${order.institution.kind} ${order.status} ${STATUS_LABEL[order.status] ?? ""}`.toLowerCase()}
              >
                <td>
                  <Link href={`/wholesale/${order.id}`} className="font-mono text-xs hover:underline">
                    {order.reference}
                  </Link>
                  <p className="text-[11px] text-ink/50">{format(order.createdAt, "dd MMM yyyy HH:mm")}</p>
                </td>
                <td>
                  <p className="font-medium">{order.institution.name}</p>
                  <p className="text-xs text-ink/60">{KIND_LABEL[order.institution.kind] ?? order.institution.kind}</p>
                </td>
                <td>{order.items.length}</td>
                <td>{order.quotedAmount != null ? money(order.quotedAmount, "ZMW") : "—"}</td>
                <td>{order.readyOn ? format(order.readyOn, "dd MMM yyyy") : "—"}</td>
                <td>
                  <Badge tone={statusTone(order.status)}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </SearchScope>
      </section>
    </div>
  );
}

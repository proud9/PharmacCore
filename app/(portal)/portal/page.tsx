import Link from "next/link";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { money } from "@/lib/utils";
import { STATUS_LABEL, statusTone } from "@/lib/wholesale";
import { SearchScope } from "@/components/search/SearchScope";

export default async function PortalHomePage() {
  const user = await requireUser();
  const orders = await db.consignment.findMany({
    where: { institutionId: user?.institutionId ?? "__none__" },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="My orders"
        description="Place an order, then follow the price in Kwacha, the ready date, and delivery progress."
        action={
          <Link href="/portal/new" className="btn btn-primary">
            New order
          </Link>
        }
      />
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
        <SearchScope placeholder="Search order number or status">
        <table className="table-grid">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Submitted</th>
              <th>Items</th>
              <th>Amount (ZMW)</th>
              <th>Ready</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-ink/60">
                  No orders yet. Start a new order to request medicines or equipment.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  data-search={`${order.reference} ${order.status} ${STATUS_LABEL[order.status] ?? ""}`.toLowerCase()}
                >
                  <td>
                    <Link href={`/portal/orders/${order.id}`} className="font-mono text-xs hover:underline">
                      {order.reference}
                    </Link>
                  </td>
                  <td>{format(order.createdAt, "dd MMM yyyy")}</td>
                  <td>{order.items.length}</td>
                  <td>{order.quotedAmount != null ? money(order.quotedAmount, "ZMW") : "Awaiting quote"}</td>
                  <td>{order.readyOn ? format(order.readyOn, "dd MMM yyyy") : "—"}</td>
                  <td>
                    <Badge tone={statusTone(order.status)}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </SearchScope>
      </section>
    </div>
  );
}

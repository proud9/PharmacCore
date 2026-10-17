import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { ReceivePoButton } from "@/components/forms/ReceivePoButton";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { money } from "@/lib/utils";

export default async function PurchasesPage() {
  const user = await requireUser();
  const [orders, suppliers, pharmacy] = await Promise.all([
    db.purchaseOrder.findMany({
      include: { supplier: true, items: { include: { product: true } }, createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
    db.pharmacy.findUnique({ where: { id: "main" } }),
  ]);
  const allow = Boolean(user && canAdjustStock(user.role));

  return (
    <div>
      <PageHeader
        eyebrow="Supply chain"
        title="Purchasing"
        description="Supplier records and goods-in. Receiving a purchase order creates lots against each SKU."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
            <p className="font-medium">{supplier.name}</p>
            <p className="text-sm text-ink/60">{supplier.contact}</p>
            <p className="text-xs text-ink/50">{supplier.email}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {orders.map((order) => {
          const total = order.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
          return (
            <article key={order.id} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs">{order.reference}</p>
                  <h2 className="font-display text-xl">{order.supplier.name}</h2>
                  <p className="text-sm text-ink/60">
                    Raised by {order.createdBy.name} · {format(order.createdAt, "dd MMM yyyy")}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={order.status === "RECEIVED" ? "good" : "warn"}>{order.status}</Badge>
                  <p className="mt-2 font-display text-2xl">{money(total, pharmacy?.currency)}</p>
                </div>
              </div>
              <ul className="mt-3 text-sm">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.product.name} × {item.quantity} @ {money(item.unitCost, pharmacy?.currency)}
                  </li>
                ))}
              </ul>
              {allow && order.status !== "RECEIVED" ? <ReceivePoButton id={order.id} /> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

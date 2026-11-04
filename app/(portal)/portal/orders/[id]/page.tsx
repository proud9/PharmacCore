import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { OrderTrack } from "@/components/wholesale/OrderTrack";
import { StatusActions } from "@/components/wholesale/StatusActions";
import { money } from "@/lib/utils";
import { STATUS_LABEL, statusTone } from "@/lib/wholesale";

export default async function BuyerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user?.institutionId) redirect("/portal");
  const { id } = await params;
  const order = await db.consignment.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order || order.institutionId !== user.institutionId) notFound();

  const buyerOptions =
    order.status === "QUOTED"
      ? ["ACCEPTED", "CANCELLED"]
      : order.status === "REQUESTED"
        ? ["CANCELLED"]
        : [];

  return (
    <div>
      <PageHeader
        eyebrow={order.reference}
        title="Order status"
        description="Price in Kwacha, the date the order can be ready, and each step until delivery."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">State</p>
          <div className="mt-2">
            <Badge tone={statusTone(order.status)}>{STATUS_LABEL[order.status]}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Quoted amount</p>
          <p className="mt-2 font-display text-2xl text-pine-900">
            {order.quotedAmount != null ? money(order.quotedAmount, "ZMW") : "Not yet quoted"}
          </p>
        </div>
        <div className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Ready for delivery</p>
          <p className="mt-2 font-display text-2xl text-pine-900">
            {order.readyOn ? format(order.readyOn, "dd MMM yyyy") : "Pending"}
          </p>
        </div>
      </div>
      {order.adminMessage ? (
        <section className="mb-6 rounded-2xl border border-brass/40 bg-white p-5 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Message from wholesale</p>
          <p className="mt-2 text-sm">{order.adminMessage}</p>
        </section>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="mb-3 font-display text-xl text-pine-900">Lines</h2>
          <ul className="space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.product.name} × {item.quantity}
              </li>
            ))}
          </ul>
          <StatusActions id={order.id} options={buyerOptions} />
        </section>
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="mb-3 font-display text-xl text-pine-900">Progress</h2>
          <OrderTrack events={order.events} />
        </section>
      </div>
    </div>
  );
}

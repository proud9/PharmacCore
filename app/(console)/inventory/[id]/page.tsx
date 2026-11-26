import { pageTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { money, stockOf } from "@/lib/utils";
import { ReceiveForm } from "@/components/forms/ReceiveForm";
import { expiryWindow } from "@/lib/inventory";
import { OfferedToggle } from "@/components/inventory/CatalogItems";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await pageTenant("inventory");
  const { db } = t;
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: { batches: { orderBy: { expiryDate: "asc" } }, category: true },
  });
  if (!product) notFound();
  const pharmacy = t.org;
  const qty = stockOf(product.batches);
  const soon = expiryWindow();

  return (
    <div>
      <PageHeader
        eyebrow={product.sku}
        title={product.name}
        description={`${product.genericName ?? "—"} · ${product.form ?? ""} ${product.strength ?? ""}`}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {product.requiresRx ? <Badge tone="brass">Prescription required</Badge> : <Badge>No prescription</Badge>}
        {product.controlled ? <Badge tone="bad">DDA</Badge> : <Badge>OTC</Badge>}
        {qty <= product.reorderLevel ? <Badge tone="warn">Needs reorder</Badge> : <Badge tone="good">In stock</Badge>}
        <Badge>{product.category?.name ?? "No category"}</Badge>
        {t.readOnly ? null : <OfferedToggle id={product.id} offered={product.offered} />}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">On hand</p>
              <p className="font-display text-3xl">{qty}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Sell / cost</p>
              <p className="font-display text-2xl">
                {money(product.sellingPrice, pharmacy?.currency)} / {money(product.costPrice, pharmacy?.currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Manufacturer</p>
              <p>{product.manufacturer ?? "—"}</p>
            </div>
          </div>
          <table className="table-grid">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Entered</th>
                <th>Expiry</th>
                <th>Qty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {product.batches.map((batch) => (
                <tr key={batch.id}>
                  <td className="font-mono text-xs">{batch.lotNumber}</td>
                  <td>{format(batch.receivedAt, "dd MMM yyyy")}</td>
                  <td>{format(batch.expiryDate, "dd MMM yyyy")}</td>
                  <td>{batch.quantity}</td>
                  <td>
                    {batch.expiryDate <= soon && batch.quantity > 0 ? <Badge tone="warn">Near expiry</Badge> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {!t.readOnly ? <ReceiveForm productId={product.id} /> : null}
      </div>
    </div>
  );
}

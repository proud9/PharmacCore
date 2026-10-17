import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { money, stockOf } from "@/lib/utils";
import { ProductForm } from "@/components/forms/ProductForm";
import { canAdjustStock, requireUser } from "@/lib/auth";

export default async function InventoryPage() {
  const user = await requireUser();
  const [products, categories, suppliers, pharmacy] = await Promise.all([
    db.product.findMany({
      include: { batches: true, category: true, supplier: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
    db.pharmacy.findUnique({ where: { id: "main" } }),
  ]);
  const currency = pharmacy?.currency ?? "USD";

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue & lots"
        title="Inventory"
        description="SKU master, on-hand quantities by FEFO lots, and reorder posture."
      />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white shadow-panel">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Product</th>
                <th>On hand</th>
                <th>Sell</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const qty = stockOf(product.batches);
                return (
                  <tr key={product.id}>
                    <td>
                      <Link href={`/inventory/${product.id}`} className="font-medium hover:underline">
                        {product.name}
                      </Link>
                      <p className="font-mono text-[11px] text-ink/50">
                        {product.sku} · {product.category?.name}
                      </p>
                    </td>
                    <td>
                      <span className={qty <= product.reorderLevel ? "text-rust font-semibold" : ""}>{qty}</span>
                    </td>
                    <td>{money(product.sellingPrice, currency)}</td>
                    <td className="space-x-1">
                      {product.requiresRx ? <Badge tone="brass">Rx</Badge> : <Badge>OTC</Badge>}
                      {qty <= product.reorderLevel ? <Badge tone="warn">Reorder</Badge> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        {user && canAdjustStock(user.role) ? (
          <ProductForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          />
        ) : (
          <p className="text-sm text-ink/60">Inventory officers and pharmacists can add SKUs.</p>
        )}
      </div>
    </div>
  );
}

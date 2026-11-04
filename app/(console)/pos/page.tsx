import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { PosDesk } from "@/components/pos/PosDesk";
import { stockOf } from "@/lib/utils";

export default async function PosPage() {
  const [products, patients, pharmacy] = await Promise.all([
    db.product.findMany({
      where: { active: true },
      include: { batches: true },
      orderBy: { name: "asc" },
    }),
    db.patient.findMany({ orderBy: { lastName: "asc" } }),
    db.pharmacy.findUnique({ where: { id: "main" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Sales counter"
        description="Find a product, add it to the basket, and complete the sale. Stock is taken from the oldest batch first."
      />
      <PosDesk
        currency={pharmacy?.currency ?? "ZMW"}
        patients={patients.map((p) => ({ id: p.id, name: `${p.lastName}, ${p.firstName}` }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          price: p.sellingPrice,
          stock: stockOf(p.batches),
          requiresRx: p.requiresRx,
        }))}
      />
    </div>
  );
}

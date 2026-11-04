import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { ConsignmentRequestForm } from "@/components/wholesale/ConsignmentRequestForm";

export default async function NewConsignmentPage() {
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="New order"
        description="Choose medicines and equipment. The pharmacy will send a price in Kwacha and a date the order can be ready."
      />
      <ConsignmentRequestForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          kind: p.kind,
          form: p.form,
        }))}
      />
    </div>
  );
}

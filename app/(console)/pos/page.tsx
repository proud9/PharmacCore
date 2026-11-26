import { pageTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/PageHeader";
import { PosDesk } from "@/components/pos/PosDesk";

export default async function PosPage() {
  const t = await pageTenant("counter");
  // Products and patients are searched as the cashier types, not sent with the page.
  const pharmacy = t.org;

  return (
    <div>
      <PageHeader
        title="Sales counter"
        description="Find a product, add it to the basket, and complete the sale. Stock is taken from the oldest batch first."
      />
      <PosDesk currency={pharmacy?.currency ?? "ZMW"} />
    </div>
  );
}

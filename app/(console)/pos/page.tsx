import { redirect } from "next/navigation";
import { canSell, requireUser } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { getPharmacy } from "@/lib/pharmacy";
import { PageHeader } from "@/components/PageHeader";
import { PosDesk } from "@/components/pos/PosDesk";

export default async function PosPage() {
  const user = await requireUser();
  if (!user || !canSell(user.role)) redirect(homePath(user?.role ?? ""));
  // Products and patients are searched as the cashier types, not sent with the page.
  const pharmacy = await getPharmacy();

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

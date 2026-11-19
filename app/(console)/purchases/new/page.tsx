import Link from "next/link";
import { redirect } from "next/navigation";
import { canSell, requireUser } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { NewPurchaseOrderForm } from "@/components/purchasing/NewPurchaseOrderForm";

export default async function NewPurchaseOrderPage() {
  const user = await requireUser();
  if (!user || !canSell(user.role)) redirect(homePath(user?.role ?? ""));
  // Manufacturers stay a short list, so a plain select is fine here.
  const suppliers = await db.supplier.findMany({
    select: { id: true, name: true, _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Purchases"
        title="New purchase order"
        description="The manufacturer sees the order in Parallax and replies with a price. Nothing is added to stock until the delivery is received."
      />
      {suppliers.length === 0 ? (
        <p className="rounded-2xl border border-pine-900/10 bg-white p-6 text-sm shadow-panel">
          Add a manufacturer first on{" "}
          <Link href="/purchases/manufacturers" className="underline">
            Manufacturers
          </Link>
          .
        </p>
      ) : (
        <NewPurchaseOrderForm
          suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name, hasLogin: supplier._count.users > 0 }))}
        />
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { isManufacturer, requireUser } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { ROLE_LABEL } from "@/lib/utils";

/** Manufacturer area: one account per manufacturer, seeing only its own purchase orders. */
export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/api/auth/signout");
  if (!isManufacturer(user.role)) redirect(homePath(user.role));
  const supplier = user.supplierId
    ? await db.supplier.findUnique({ where: { id: user.supplierId }, select: { name: true } })
    : null;

  return (
    <Shell
      name={user.name}
      role={ROLE_LABEL[user.role] ?? user.role}
      roleCode={user.role}
      pharmacy={supplier?.name ?? "Manufacturer"}
    >
      {children}
    </Shell>
  );
}

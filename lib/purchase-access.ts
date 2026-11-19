import { NextResponse } from "next/server";
import { isManufacturer, isStaff, requireUser } from "./auth";
import { db } from "./db";

type User = NonNullable<Awaited<ReturnType<typeof requireUser>>>;

/**
 * Loads a purchase order for an API route and checks who may touch it:
 * `"manufacturer"` = only the supplier's own account; `"staff"` = wholesale staff (route adds its own role check).
 * Returns either { user, order } or { error } (a ready NextResponse).
 */
export async function loadPurchaseOrder(id: string, who: "manufacturer" | "staff" | "either") {
  const user = await requireUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const manufacturer = isManufacturer(user.role);
  const allowed = who === "either" ? manufacturer || isStaff(user.role) : who === "manufacturer" ? manufacturer : isStaff(user.role);
  if (!allowed) return { error: NextResponse.json({ error: "Not allowed" }, { status: 403 }) } as const;
  const order = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true, supplier: true } });
  // A manufacturer never learns that another supplier's order exists.
  if (!order || (manufacturer && order.supplierId !== user.supplierId)) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  }
  return { user: user as User, order } as const;
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { isBuyer, isStaff, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * GET: search-as-you-type for pickers (sales counter, prescriptions, buyer orders), so pages no
 * longer send every product or patient to the browser. Returns at most `LIMIT` matches.
 * Buyers may search products only, and see no prices or stock.
 */
const LIMIT = 10;

const schema = z.object({
  kind: z.enum(["products", "patients"]),
  q: z.string().trim().max(100).default(""),
  rx: z.literal("1").optional(),
  type: z.enum(["MEDICINE", "EQUIPMENT"]).optional(),
});

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Search request is not valid." }, { status: 400 });
  const { kind, q, rx, type } = parsed.data;
  const buyer = isBuyer(user.role);
  if (!buyer && !isStaff(user.role)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  if (kind === "patients") {
    if (buyer) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const patients = await db.patient.findMany({
      where: q
        ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { phone: { contains: q } }] }
        : {},
      select: { id: true, firstName: true, lastName: true, phone: true, allergies: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: LIMIT,
    });
    return NextResponse.json({
      results: patients.map((p) => ({
        id: p.id,
        name: `${p.lastName}, ${p.firstName}`,
        detail: p.phone ?? "",
        allergies: p.allergies,
      })),
    });
  }

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(rx ? { requiresRx: true } : {}),
    ...(type ? { kind: type } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
            { barcode: { contains: q } },
            { genericName: { contains: q } },
          ],
        }
      : {}),
  };
  const products = await db.product.findMany({
    where,
    select: { id: true, name: true, sku: true, barcode: true, sellingPrice: true, requiresRx: true, kind: true, form: true },
    orderBy: { name: "asc" },
    take: LIMIT,
  });

  if (buyer) {
    return NextResponse.json({
      results: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, kind: p.kind, form: p.form })),
    });
  }

  const stock = await db.batch.groupBy({
    by: ["productId"],
    where: { productId: { in: products.map((p) => p.id) }, quantity: { gt: 0 } },
    _sum: { quantity: true },
  });
  const onHand = new Map(stock.map((row) => [row.productId, row._sum.quantity ?? 0]));
  return NextResponse.json({
    results: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      price: p.sellingPrice,
      stock: onHand.get(p.id) ?? 0,
      requiresRx: p.requiresRx,
      kind: p.kind,
      form: p.form,
    })),
  });
}

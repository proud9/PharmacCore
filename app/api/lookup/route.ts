import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { apiTenant } from "@/lib/tenant";
import { can } from "@/lib/capabilities";

/**
 * GET: search-as-you-type for pickers (sales counter, prescriptions), over this business's own
 * items and patients only. Returns at most `LIMIT` matches.
 */
const LIMIT = 10;

const schema = z.object({
  kind: z.enum(["products", "patients"]),
  q: z.string().trim().max(100).default(""),
  rx: z.literal("1").optional(),
  type: z.enum(["MEDICINE", "EQUIPMENT"]).optional(),
});

export async function GET(request: Request) {
  const auth = await apiTenant(["catalog", "inventory", "counter"], { write: false });
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db } = t;

  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Search request is not valid." }, { status: 400 });
  const { kind, q, rx, type } = parsed.data;

  if (kind === "patients") {
    if (!can(t.org.kind, "counter")) return NextResponse.json({ error: "Your account can't do that." }, { status: 403 });
    const patients = await db.patient.findMany({
      where: q
        ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] }
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
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q, mode: "insensitive" } },
            { genericName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const products = await db.product.findMany({
    where,
    select: { id: true, name: true, sku: true, barcode: true, sellingPrice: true, requiresRx: true, kind: true, form: true, strength: true, unit: true },
    orderBy: { name: "asc" },
    take: LIMIT,
  });

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
      strength: p.strength,
      unit: p.unit,
    })),
  });
}

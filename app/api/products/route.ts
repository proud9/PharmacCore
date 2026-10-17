import { NextResponse } from "next/server";
import { z } from "zod";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema = z.object({
  sku: z.string().min(2),
  barcode: z.string().optional(),
  name: z.string().min(2),
  genericName: z.string().optional(),
  form: z.string().optional(),
  strength: z.string().optional(),
  manufacturer: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  unit: z.string().default("pack"),
  sellingPrice: z.number().positive(),
  costPrice: z.number().min(0),
  reorderLevel: z.number().int().min(0).default(20),
  reorderQty: z.number().int().min(0).default(50),
  requiresRx: z.boolean().default(false),
  controlled: z.boolean().default(false),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user || !canAdjustStock(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the product fields." }, { status: 400 });
  }
  const product = await db.product.create({ data: parsed.data });
  await audit({
    userId: user.id,
    action: "PRODUCT_CREATED",
    entity: "Product",
    entityId: product.id,
    details: product.name,
  });
  return NextResponse.json(product);
}

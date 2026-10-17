import { NextResponse } from "next/server";
import { z } from "zod";
import { canAdjustStock, requireUser } from "@/lib/auth";
import { receiveBatch } from "@/lib/inventory";
import { audit } from "@/lib/audit";

const schema = z.object({
  productId: z.string(),
  lotNumber: z.string().min(1),
  expiryDate: z.string(),
  quantity: z.number().int().positive(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user || !canAdjustStock(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Batch details are incomplete." }, { status: 400 });
  }
  await receiveBatch({
    productId: parsed.data.productId,
    lotNumber: parsed.data.lotNumber,
    expiryDate: new Date(parsed.data.expiryDate),
    quantity: parsed.data.quantity,
  });
  await audit({
    userId: user.id,
    action: "STOCK_RECEIVED",
    entity: "Product",
    entityId: parsed.data.productId,
    details: `${parsed.data.quantity} of lot ${parsed.data.lotNumber}`,
  });
  return NextResponse.json({ ok: true });
}

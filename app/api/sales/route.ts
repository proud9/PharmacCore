import { NextResponse } from "next/server";
import { z } from "zod";
import { isStaff, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deductStock } from "@/lib/inventory";
import { audit } from "@/lib/audit";
import { ref } from "@/lib/utils";

const schema = z.object({
  patientId: z.string().optional().nullable(),
  payment: z.enum(["CASH", "CARD", "MOBILE", "INSURANCE"]).default("CASH"),
  discount: z.number().min(0).default(0),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(user.role)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Sale is incomplete." }, { status: 400 });
  }

  try {
    const sale = await db.$transaction(async (tx) => {
      let subtotal = 0;
      let tax = 0;
      const lines = [];
      for (const item of parsed.data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.active) throw new Error("Unknown product");
        const line = product.sellingPrice * item.quantity;
        subtotal += line;
        tax += line * ((product.taxRate ?? 0) / 100);
        lines.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          total: line,
        });
      }
      const total = Math.max(0, subtotal + tax - parsed.data.discount);

      for (const line of lines) {
        await deductStock(tx, line.productId, line.quantity);
      }

      return tx.sale.create({
        data: {
          invoiceNo: ref("INV"),
          cashierId: user.id,
          patientId: parsed.data.patientId || null,
          subtotal,
          tax,
          discount: parsed.data.discount,
          total,
          payment: parsed.data.payment,
          items: { create: lines },
        },
      });
    });

    await audit({
      userId: user.id,
      action: "SALE_COMPLETED",
      entity: "Sale",
      entityId: sale.id,
      details: sale.invoiceNo,
    });

    return NextResponse.json(sale);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sale failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiTenant } from "@/lib/tenant";
import { deductStock } from "@/lib/inventory";
import { audit } from "@/lib/audit";
import { ref } from "@/lib/utils";
import { COUNTER_PAYMENTS } from "@/lib/counter";

const schema = z.object({
  patientId: z.string().optional().nullable(),
  payment: z.enum(COUNTER_PAYMENTS).default("CASH"),
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
  const auth = await apiTenant("counter");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db, user } = t;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Sale is incomplete." }, { status: 400 });
  }

  try {
    if (parsed.data.patientId && (await db.patient.count({ where: { id: parsed.data.patientId } })) === 0) {
      return NextResponse.json({ error: "Choose the patient again." }, { status: 400 });
    }
    const sale = await t.tx(async (tx) => {
      let subtotal = 0;
      let tax = 0;
      const lines = [];
      for (const item of parsed.data.items) {
        const product = await tx.product.findFirst({ where: { id: item.productId } });
        if (!product || !product.active) throw new Error("Unknown product");
        const line = product.sellingPrice * item.quantity;
        subtotal += line;
        tax += line * ((product.taxRate ?? 0) / 100);
        lines.push({
          orgId: t.org.id,
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
          orgId: t.org.id,
          invoiceNo: ref("INV"),
          cashierId: user.id,
          cashierName: user.name,
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

    await audit(t, {
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

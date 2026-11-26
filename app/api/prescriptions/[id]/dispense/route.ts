import { NextResponse } from "next/server";
import { apiTenant } from "@/lib/tenant";
import { deductStock } from "@/lib/inventory";
import { audit } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiTenant("counter");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db, user } = t;
  const { id } = await params;
  const rx = await db.prescription.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!rx || rx.status === "DISPENSED") {
    return NextResponse.json({ error: "Prescription cannot be dispensed." }, { status: 400 });
  }
  try {
    await t.tx(async (tx) => {
      for (const item of rx.items) {
        await deductStock(tx, item.productId, item.quantity);
      }
      await tx.prescription.update({
        where: { id },
        data: { status: "DISPENSED", dispensedAt: new Date(), dispensedById: user.id, dispensedBy: user.name },
      });
    });
    await audit(t, {
      action: "RX_DISPENSED",
      entity: "Prescription",
      entityId: id,
      details: rx.rxNumber,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispense failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

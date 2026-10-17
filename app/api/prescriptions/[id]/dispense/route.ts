import { NextResponse } from "next/server";
import { canDispense, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deductStock } from "@/lib/inventory";
import { audit } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !canDispense(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const rx = await db.prescription.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!rx || rx.status === "DISPENSED") {
    return NextResponse.json({ error: "Prescription cannot be dispensed." }, { status: 400 });
  }
  try {
    for (const item of rx.items) {
      await deductStock(item.productId, item.quantity);
    }
    await db.prescription.update({
      where: { id },
      data: { status: "DISPENSED", dispensedAt: new Date(), pharmacistId: user.id },
    });
    await audit({
      userId: user.id,
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

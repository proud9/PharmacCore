import { NextResponse } from "next/server";
import { z } from "zod";
import { apiTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { ref } from "@/lib/utils";

const schema = z.object({
  patientId: z.string(),
  prescriber: z.string().min(2),
  clinic: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        dosage: z.string().optional(),
        instructions: z.string().optional(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const auth = await apiTenant("counter");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db } = t;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Prescription is incomplete." }, { status: 400 });
  }
  const known = await Promise.all([
    db.patient.count({ where: { id: parsed.data.patientId } }),
    db.product.count({ where: { id: { in: parsed.data.items.map((item) => item.productId) }, active: true } }),
  ]);
  if (known[0] === 0 || known[1] !== new Set(parsed.data.items.map((item) => item.productId)).size) {
    return NextResponse.json({ error: "Choose the patient and items again." }, { status: 400 });
  }
  const rx = await db.prescription.create({
    data: {
      orgId: t.org.id,
      rxNumber: ref("RX"),
      patientId: parsed.data.patientId,
      prescriber: parsed.data.prescriber,
      clinic: parsed.data.clinic,
      notes: parsed.data.notes,
      items: { create: parsed.data.items.map((item) => ({ ...item, orgId: t.org.id })) },
    },
  });
  await audit(t, {
    action: "RX_CREATED",
    entity: "Prescription",
    entityId: rx.id,
    details: rx.rxNumber,
  });
  return NextResponse.json(rx);
}

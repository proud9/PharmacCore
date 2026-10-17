import { NextResponse } from "next/server";
import { z } from "zod";
import { canDispense, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
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
  const user = await requireUser();
  if (!user || !canDispense(user.role)) {
    return NextResponse.json({ error: "Only a pharmacist can file prescriptions." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Prescription is incomplete." }, { status: 400 });
  }
  const rx = await db.prescription.create({
    data: {
      rxNumber: ref("RX"),
      patientId: parsed.data.patientId,
      pharmacistId: user.id,
      prescriber: parsed.data.prescriber,
      clinic: parsed.data.clinic,
      notes: parsed.data.notes,
      items: { create: parsed.data.items },
    },
  });
  await audit({
    userId: user.id,
    action: "RX_CREATED",
    entity: "Prescription",
    entityId: rx.id,
    details: rx.rxNumber,
  });
  return NextResponse.json(rx);
}

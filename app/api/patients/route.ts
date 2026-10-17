import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  allergies: z.string().optional(),
  insurance: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Patient details are incomplete." }, { status: 400 });
  }
  const patient = await db.patient.create({
    data: {
      ...parsed.data,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
    },
  });
  await audit({
    userId: user.id,
    action: "PATIENT_CREATED",
    entity: "Patient",
    entityId: patient.id,
    details: `${patient.firstName} ${patient.lastName}`,
  });
  return NextResponse.json(patient);
}

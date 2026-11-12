import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditSettings, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1),
  license: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  address: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEditSettings(user.role)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the pharmacy name and email." }, { status: 400 });
  }

  const data = {
    name: parsed.data.name,
    license: parsed.data.license || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
  };
  const pharmacy = await db.pharmacy.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });

  await audit({
    userId: user.id,
    action: "SETTINGS_UPDATED",
    entity: "Pharmacy",
    entityId: pharmacy.id,
    details: pharmacy.name,
  });

  return NextResponse.json(pharmacy);
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditCompany, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1),
  license: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  tpin: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
  swiftCode: z.string().optional(),
});

const OPTIONAL_FIELDS = [
  "license",
  "phone",
  "email",
  "address",
  "website",
  "tpin",
  "bankName",
  "accountName",
  "accountNumber",
  "bankBranch",
  "swiftCode",
] as const;

type OptionalField = (typeof OPTIONAL_FIELDS)[number];

/**
 * Only fields present in the request are changed: an omitted field keeps its
 * stored value, and a field sent as an empty string is cleared.
 */
function sentFields(data: z.infer<typeof schema>) {
  const fields: Partial<Record<OptionalField, string | null>> = {};
  for (const key of OPTIONAL_FIELDS) {
    const value = data[key];
    if (value === undefined) continue;
    const trimmed = value.trim();
    fields[key] = trimmed ? trimmed : null;
  }
  return fields;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user || !canEditCompany(user.role)) {
    return NextResponse.json({ error: "Only administrators and finance staff can change company details." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the pharmacy trading name." }, { status: 400 });
  }

  const fields = sentFields(parsed.data);
  const pharmacy = await db.pharmacy.upsert({
    where: { id: "main" },
    update: { name: parsed.data.name, ...fields },
    create: { id: "main", name: parsed.data.name, currency: "ZMW", ...fields },
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

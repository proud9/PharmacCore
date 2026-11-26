import { NextResponse } from "next/server";
import { z } from "zod";
import { apiTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { PAYMENT_TERMS } from "@/lib/trade";

/** The signed-in business's own details, bank details and trading defaults. */
const schema = z.object({
  name: z.string().trim().min(1, "Enter the business name.").max(150),
  licenceNo: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  town: z.string().optional(),
  website: z.string().optional(),
  tpin: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
  swiftCode: z.string().optional(),
  listed: z.boolean().optional(),
  defaultPaymentTerms: z.enum(PAYMENT_TERMS).optional(),
  creditDays: z.number().int().min(0).max(365).optional(),
});

const OPTIONAL_FIELDS = [
  "licenceNo",
  "phone",
  "email",
  "address",
  "town",
  "website",
  "tpin",
  "bankName",
  "accountName",
  "accountNumber",
  "bankBranch",
  "swiftCode",
] as const;

type OptionalField = (typeof OPTIONAL_FIELDS)[number];

/** Only fields present are changed: omitted keeps the stored value, an empty string clears it. */
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
  const auth = await apiTenant();
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }
  const { name, listed, defaultPaymentTerms, creditDays } = parsed.data;
  const org = await db.organization.update({
    where: { id: t.org.id },
    data: {
      name,
      ...sentFields(parsed.data),
      ...(listed === undefined ? {} : { listed }),
      ...(defaultPaymentTerms ? { defaultPaymentTerms } : {}),
      ...(creditDays === undefined ? {} : { creditDays }),
    },
  });
  await audit(t, { action: "SETTINGS_UPDATED", entity: "Organization", entityId: org.id, details: org.name });
  return NextResponse.json({ ok: true });
}

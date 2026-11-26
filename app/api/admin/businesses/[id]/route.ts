import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/db";
import { apiAdmin } from "@/lib/admin";
import { platformAudit } from "@/lib/audit";

/** Edits a business's account details (not its bank details, stock or documents). */
const schema = z.object({
  name: z.string().trim().min(2, "Enter the business name.").max(150),
  town: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(254).optional(),
  website: z.string().trim().max(200).optional(),
  listed: z.boolean().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const { id } = await params;
  const admin = adminDb();
  if (!(await admin.organization.count({ where: { id } }))) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  const data = parsed.data;
  await admin.organization.update({
    where: { id },
    data: {
      name: data.name,
      town: data.town || null,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      ...(data.listed === undefined ? {} : { listed: data.listed }),
    },
  });
  await platformAudit({ userId: auth.user.id, action: "BUSINESS_EDITED", orgId: id, details: data.name });
  return NextResponse.json({ ok: true });
}

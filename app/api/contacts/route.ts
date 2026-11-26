import { NextResponse } from "next/server";
import { apiTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { contactData, contactSchema } from "@/lib/contacts";

/** Adds a private contact (a customer or supplier for documents, often not on Parallax). */
export async function POST(request: Request) {
  const auth = await apiTenant();
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const contact = await t.db.contact.create({ data: { orgId: t.org.id, ...contactData(parsed.data) } });
  await audit(t, { action: "CONTACT_ADDED", entity: "Contact", entityId: contact.id, details: contact.name });
  return NextResponse.json({ ok: true, id: contact.id }, { status: 201 });
}

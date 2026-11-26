import { NextResponse } from "next/server";
import { apiTenant, notFound } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { contactData, contactSchema } from "@/lib/contacts";

/** Edits a private contact, or deletes it with `{ delete: true }` (orders keep the name they were made with). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiTenant();
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { id } = await params;
  const existing = await t.db.contact.findFirst({ where: { id } });
  if (!existing) return notFound("That contact");
  const body = await request.json().catch(() => null);
  if (body && body.delete === true) {
    await t.db.contact.delete({ where: { id } });
    await audit(t, { action: "CONTACT_DELETED", entity: "Contact", entityId: id, details: existing.name });
    return NextResponse.json({ ok: true });
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  await t.db.contact.update({ where: { id }, data: contactData(parsed.data) });
  await audit(t, { action: "CONTACT_UPDATED", entity: "Contact", entityId: id, details: parsed.data.name });
  return NextResponse.json({ ok: true });
}

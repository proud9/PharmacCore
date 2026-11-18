import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * Public "Request a demo" form on the landing page (no sign-in). Requests are stored and
 * listed for administrators at /demo-requests. `website` is a hidden honeypot field:
 * people never fill it, simple bots usually do, so those are accepted silently and dropped.
 */
const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  company: z.string().trim().min(2, "Enter your wholesale's name.").max(150),
  phone: z.string().trim().min(6, "Enter a phone number.").max(30),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  notes: z.string().trim().max(1000).optional(),
  website: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }
  const { website, notes, ...data } = parsed.data;
  if (website) return NextResponse.json({ ok: true }, { status: 201 });

  const created = await db.demoRequest.create({
    data: { ...data, email: data.email.toLowerCase(), notes: notes || null },
  });
  await audit({
    action: "DEMO_REQUESTED",
    entity: "DemoRequest",
    entityId: created.id,
    details: `${created.company} · ${created.name}`,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

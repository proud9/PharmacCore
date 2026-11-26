import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/db";
import { apiAdmin } from "@/lib/admin";
import { platformAudit } from "@/lib/audit";
import { ORG_KINDS } from "@/lib/capabilities";

const schema = z.discriminatedUnion("audience", [
  z.object({ audience: z.literal("ALL"), title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(2000) }),
  z.object({ audience: z.literal("KIND"), kind: z.enum(ORG_KINDS), title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(2000) }),
  z.object({ audience: z.literal("ORG"), orgId: z.string().min(1), title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(2000) }),
]);

export async function POST(request: Request) {
  const auth = await apiAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a title and a message." }, { status: 400 });
  const data = parsed.data;
  if (data.audience === "ORG") {
    const org = await adminDb().organization.findFirst({ where: { id: data.orgId, status: "ACTIVE" }, select: { id: true } });
    if (!org) return NextResponse.json({ error: "Choose a business from the list." }, { status: 400 });
  }
  const created = await adminDb().announcement.create({
    data: {
      audience: data.audience,
      kind: data.audience === "KIND" ? data.kind : null,
      orgId: data.audience === "ORG" ? data.orgId : null,
      title: data.title,
      body: data.body,
      createdById: auth.user.id,
    },
  });
  await platformAudit({ userId: auth.user.id, action: "ANNOUNCEMENT_SENT", orgId: created.orgId, details: data.title });
  return NextResponse.json({ ok: true }, { status: 201 });
}

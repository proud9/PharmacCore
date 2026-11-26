import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/db";
import { apiAdmin } from "@/lib/admin";
import { platformAudit } from "@/lib/audit";
import { pays } from "@/lib/subscription";
import { money } from "@/lib/utils";

/** The team sets the agreed monthly fee for a paying account (null clears it). */
const schema = z.object({ monthlyFee: z.number().min(0, "The fee can't be negative.").max(1_000_000).nullable() });

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await apiAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter the fee per month." }, { status: 400 });
  const { orgId } = await params;
  const admin = adminDb();
  const org = await admin.organization.findUnique({ where: { id: orgId }, select: { kind: true, subscription: { select: { id: true } } } });
  if (!org) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  if (!pays(org.kind) || !org.subscription) return NextResponse.json({ error: "This account has no subscription." }, { status: 400 });
  await admin.subscription.update({ where: { id: org.subscription.id }, data: { monthlyFee: parsed.data.monthlyFee } });
  await platformAudit({
    userId: auth.user.id,
    action: "SUBSCRIPTION_FEE_SET",
    orgId,
    details: parsed.data.monthlyFee === null ? "Fee cleared" : `${money(parsed.data.monthlyFee)} per month`,
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { addMonths, max } from "date-fns";
import { adminDb } from "@/lib/db";
import { apiAdmin } from "@/lib/admin";
import { platformAudit } from "@/lib/audit";
import { pays } from "@/lib/subscription";
import { money } from "@/lib/utils";

/** Records a subscription payment (made outside Parallax) and extends the paid-up period. */
const schema = z.object({
  amount: z.number().min(0, "Enter the amount."),
  paidOn: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter the payment date."),
  months: z.number().int().min(1).max(36),
  reference: z.string().trim().max(100).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const { id } = await params;
  const admin = adminDb();
  const org = await admin.organization.findUnique({ where: { id }, select: { kind: true, name: true, subscription: true } });
  if (!org) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  if (!pays(org.kind)) return NextResponse.json({ error: "Clients use Parallax free; there is nothing to record." }, { status: 400 });

  const now = new Date();
  const start = org.subscription && !org.subscription.trialEndsAt ? max([org.subscription.periodEnd, now]) : now;
  const end = addMonths(start, parsed.data.months);
  await admin.subscription.upsert({
    where: { orgId: id },
    create: {
      orgId: id,
      plan: "STANDARD",
      periodEnd: end,
      payments: {
        create: { amount: parsed.data.amount, paidOn: new Date(parsed.data.paidOn), periodStart: start, periodEnd: end, reference: parsed.data.reference || null, recordedById: auth.user.id },
      },
    },
    update: {
      plan: "STANDARD",
      trialEndsAt: null,
      periodEnd: end,
      payments: {
        create: { amount: parsed.data.amount, paidOn: new Date(parsed.data.paidOn), periodStart: start, periodEnd: end, reference: parsed.data.reference || null, recordedById: auth.user.id },
      },
    },
  });
  await platformAudit({
    userId: auth.user.id,
    action: "SUBSCRIPTION_PAID",
    orgId: id,
    details: `${money(parsed.data.amount)} · ${parsed.data.months} months`,
  });
  return NextResponse.json({ ok: true });
}

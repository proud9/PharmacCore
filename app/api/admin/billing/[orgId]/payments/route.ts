import { NextResponse } from "next/server";
import { z } from "zod";
import { apiAdmin } from "@/lib/admin";
import { platformAudit } from "@/lib/audit";
import { BILLING_METHODS, BILLING_METHOD_LABEL } from "@/lib/billing";
import { BillingError, recordSubscriptionPayment } from "@/lib/billing-server";
import { money } from "@/lib/utils";

/** The team marks an account as paid: records the payment, extends the period, issues a receipt. */
const schema = z.object({
  amount: z.number().positive("Enter the amount received."),
  paidOn: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter the payment date."),
  months: z.number().int().min(1, "Enter the months covered.").max(36, "At most 36 months at a time."),
  method: z.enum(BILLING_METHODS),
  reference: z.string().trim().max(100).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await apiAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const { orgId } = await params;
  const paidOn = new Date(parsed.data.paidOn);
  if (paidOn > new Date()) return NextResponse.json({ error: "The payment date can't be in the future." }, { status: 400 });

  try {
    const payment = await recordSubscriptionPayment({
      orgId,
      amount: parsed.data.amount,
      paidOn,
      months: parsed.data.months,
      method: parsed.data.method,
      reference: parsed.data.reference,
      source: "MANUAL",
      recordedBy: { id: auth.user.id, name: auth.user.name },
    });
    await platformAudit({
      userId: auth.user.id,
      action: "SUBSCRIPTION_PAID",
      orgId,
      details: `${payment.receiptNo} · ${money(payment.amount)} · ${payment.months} month${payment.months === 1 ? "" : "s"} · ${BILLING_METHOD_LABEL[payment.method]}`,
    });
    return NextResponse.json({ ok: true, id: payment.id, receiptNo: payment.receiptNo });
  } catch (error) {
    if (error instanceof BillingError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

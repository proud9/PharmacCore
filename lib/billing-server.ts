import { addDays, addMonths, max } from "date-fns";
import type { Prisma } from "@prisma/client";
import { adminDb } from "./db";
import { PAYING_KINDS } from "./capabilities";
import { DUE_SOON_DAYS, type BillingMethod } from "./billing";
import { GRACE_DAYS, pays } from "./subscription";

type Admin = ReturnType<typeof adminDb>;

/**
 * The team's account filters as a Prisma `where` on Organization (paying kinds, not deleted).
 * Mirrors subscriptionState(): due soon = ends within DUE_SOON_DAYS, payment due = ended within
 * GRACE_DAYS, overdue = ended before that (read-only) or never subscribed.
 */
export function billingWhere(filter: string, q: string, now = new Date()): Prisma.OrganizationWhereInput {
  const graceStart = addDays(now, -GRACE_DAYS);
  const soon = addDays(now, DUE_SOON_DAYS);
  const base: Prisma.OrganizationWhereInput = {
    kind: { in: [...PAYING_KINDS] },
    status: { not: "DELETED" },
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
  };
  const overdue: Prisma.OrganizationWhereInput = { OR: [{ subscription: { is: null } }, { subscription: { periodEnd: { lt: graceStart } } }] };
  switch (filter) {
    case "attention":
      return { ...base, OR: [{ subscription: { is: null } }, { subscription: { periodEnd: { lt: soon } } }] };
    case "due-soon":
      return { ...base, subscription: { periodEnd: { gte: now, lte: soon } } };
    case "grace":
      return { ...base, subscription: { periodEnd: { gte: graceStart, lt: now } } };
    case "overdue":
      return { ...base, ...overdue };
    case "trial":
      return { ...base, subscription: { trialEndsAt: { not: null }, periodEnd: { gte: now } } };
    case "active":
      return { ...base, subscription: { trialEndsAt: null, periodEnd: { gte: now } } };
    case "suspended":
      return { ...base, status: "SUSPENDED" };
    default:
      return base;
  }
}

/** Receipt number after `last` in its year: RCT-<year>-<5 digits>. */
function receiptAfter(last: string | undefined, year: number) {
  const prefix = `RCT-${year}-`;
  const next = last ? Number(last.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

export type PaymentInput = {
  orgId: string;
  amount: number;
  paidOn: Date;
  months: number;
  method: BillingMethod;
  reference?: string | null;
  /** MANUAL: the team recorded it. ONLINE: a payment provider confirmed it (planned). */
  source: "MANUAL" | "ONLINE";
  recordedBy?: { id: string; name: string } | null;
  provider?: string | null;
  providerRef?: string | null;
};

/**
 * Records a paid subscription payment, extends the paid-up period and issues the receipt number,
 * in one transaction. The period runs on from the current end date, or from today if it has
 * already ended or the account was on trial. Used by the team today; a provider webhook will call
 * it with source ONLINE (and the same provider + providerRef twice is refused by the unique index).
 */
export async function recordSubscriptionPayment(input: PaymentInput, admin: Admin = adminDb()) {
  return admin.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({ where: { id: input.orgId }, select: { id: true, kind: true, name: true, subscription: true } });
    if (!org) throw new BillingError("Business not found.", 404);
    if (!pays(org.kind)) throw new BillingError("Clients use Parallax free; there is nothing to record.");

    const now = new Date();
    const current = org.subscription;
    const start = current && !current.trialEndsAt ? max([current.periodEnd, now]) : now;
    const end = addMonths(start, input.months);
    const subscription = current
      ? await tx.subscription.update({ where: { id: current.id }, data: { plan: "STANDARD", trialEndsAt: null, periodEnd: end } })
      : await tx.subscription.create({ data: { orgId: org.id, plan: "STANDARD", periodEnd: end } });

    // One receipt number at a time: hold a lock until this transaction ends.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(724501)`;
    const year = input.paidOn.getFullYear();
    const last = await tx.subscriptionPayment.findFirst({
      where: { receiptNo: { startsWith: `RCT-${year}-` } },
      orderBy: { receiptNo: "desc" },
      select: { receiptNo: true },
    });
    return tx.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        orgId: org.id,
        orgName: org.name,
        receiptNo: receiptAfter(last?.receiptNo, year),
        amount: input.amount,
        paidOn: input.paidOn,
        months: input.months,
        periodStart: start,
        periodEnd: end,
        method: input.method,
        source: input.source,
        status: "PAID",
        reference: input.reference || null,
        provider: input.provider ?? null,
        providerRef: input.providerRef ?? null,
        recordedById: input.recordedBy?.id ?? null,
        recordedByName: input.recordedBy?.name ?? null,
      },
    });
  });
}

export class BillingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

import { format, subDays } from "date-fns";
import type { Tenant } from "./tenant";
import { pays, subscriptionState } from "./subscription";
import { money } from "./utils";

/** Days before the end of a trial or paid period when the bell starts reminding. */
export const REMINDER_DAYS = 7;

type Reminder = { dedupeKey: string; title: string; body: string; link: string };

/**
 * Subscription reminders in the notification bell, worked out when a business opens a page
 * (there is no scheduler). Each reminder has a key tied to the period's end date, so it is added
 * once per period, and again after a renewal reaches the next one:
 * - trial ending / payment due within REMINDER_DAYS,
 * - payment due (period ended, still working), and read-only,
 * - "payment received" with the receipt, for payments recorded in the last two weeks.
 * Clients are free and get none.
 */
export async function subscriptionReminders(t: Tenant, now = new Date()) {
  if (!pays(t.org.kind)) return;
  const sub = t.org.subscription;
  const state = subscriptionState(t.org.kind, sub, now);
  const end = state.periodEnd;
  const day = end ? format(end, "yyyy-MM-dd") : "none";
  const notes: Reminder[] = [];

  if (state.state === "TRIAL" && end && (state.daysLeft ?? 99) <= REMINDER_DAYS) {
    notes.push({
      dedupeKey: `sub:trial-ending:${day}`,
      title: `Your free trial ends on ${format(end, "dd MMM yyyy")}`,
      body: "Subscribe before then to keep everything working. Billing shows how to pay.",
      link: "/billing",
    });
  }
  if (state.state === "ACTIVE" && end && (state.daysLeft ?? 99) <= REMINDER_DAYS) {
    notes.push({
      dedupeKey: `sub:due-soon:${day}`,
      title: `Your Parallax subscription is due on ${format(end, "dd MMM yyyy")}`,
      body: "Pay before then to carry on without a break. Billing shows how to pay.",
      link: "/billing",
    });
  }
  if (state.state === "GRACE" && state.readOnlyOn) {
    notes.push({
      dedupeKey: `sub:due:${day}`,
      title: "Your subscription payment is due",
      body: `Everything keeps working until ${format(state.readOnlyOn, "dd MMM yyyy")}; after that the account becomes read-only until it is paid.`,
      link: "/billing",
    });
  }
  if (state.state === "READ_ONLY") {
    notes.push({
      dedupeKey: `sub:read-only:${day}`,
      title: "Your account is now read-only",
      body: "You can still view and print, but not create or change anything. Pay your subscription to switch everything back on.",
      link: "/billing",
    });
  }

  const recent = await t.db.subscriptionPayment.findMany({
    where: { status: "PAID", createdAt: { gte: subDays(now, 14) }, paidOn: { gte: subDays(now, 30) } },
    select: { id: true, receiptNo: true, amount: true, periodEnd: true },
  });
  for (const payment of recent) {
    notes.push({
      dedupeKey: `sub:paid:${payment.receiptNo}`,
      title: `Payment received: ${money(payment.amount)}`,
      body: `Thank you. Receipt ${payment.receiptNo}; paid up to ${format(payment.periodEnd, "dd MMM yyyy")}.`,
      link: `/documents/subscription/${payment.id}`,
    });
  }

  if (!notes.length) return;
  // createMany: no RETURNING (row-level security), and skipDuplicates makes repeats a no-op.
  await t.db.notification.createMany({
    data: notes.map((note) => ({ orgId: t.org.id, type: "SUBSCRIPTION", ...note })),
    skipDuplicates: true,
  });
}

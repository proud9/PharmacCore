import { addDays, differenceInCalendarDays } from "date-fns";
import { PAYING_KINDS, type OrgKind } from "./capabilities";

/**
 * Subscriptions are recorded by the Parallax team by hand (no payment gateway).
 * Manufacturers, wholesalers and retailers pay; clients are free.
 * After the period ends there are GRACE_DAYS of reminders, then the account is read-only:
 * it can sign in, view and download, but not create or change anything.
 */
export const TRIAL_DAYS = 30;
export const GRACE_DAYS = 14;

export type SubscriptionState = "FREE" | "TRIAL" | "ACTIVE" | "GRACE" | "READ_ONLY";

export const SUBSCRIPTION_LABEL: Record<SubscriptionState, string> = {
  FREE: "Free",
  TRIAL: "Trial",
  ACTIVE: "Active",
  GRACE: "Payment due",
  READ_ONLY: "Lapsed (read-only)",
};

export function pays(kind: string) {
  return (PAYING_KINDS as readonly string[]).includes(kind as OrgKind);
}

export function subscriptionState(
  kind: string,
  sub: { periodEnd: Date; trialEndsAt: Date | null } | null | undefined,
  now = new Date(),
): { state: SubscriptionState; periodEnd: Date | null; readOnlyOn: Date | null; daysLeft: number | null } {
  if (!pays(kind)) return { state: "FREE", periodEnd: null, readOnlyOn: null, daysLeft: null };
  if (!sub) return { state: "READ_ONLY", periodEnd: null, readOnlyOn: null, daysLeft: 0 };
  const readOnlyOn = addDays(sub.periodEnd, GRACE_DAYS);
  if (now <= sub.periodEnd) {
    const trial = !!sub.trialEndsAt && sub.trialEndsAt >= sub.periodEnd;
    return {
      state: trial ? "TRIAL" : "ACTIVE",
      periodEnd: sub.periodEnd,
      readOnlyOn,
      daysLeft: differenceInCalendarDays(sub.periodEnd, now),
    };
  }
  if (now <= readOnlyOn) {
    return { state: "GRACE", periodEnd: sub.periodEnd, readOnlyOn, daysLeft: differenceInCalendarDays(readOnlyOn, now) };
  }
  return { state: "READ_ONLY", periodEnd: sub.periodEnd, readOnlyOn, daysLeft: 0 };
}

export const READ_ONLY_MESSAGE =
  "Your Parallax subscription has lapsed, so this account is read-only. Contact the Parallax team to renew.";

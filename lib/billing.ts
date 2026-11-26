/**
 * Subscription billing: labels and filters shared by the business Billing page (/billing), the
 * team's Billing page (/admin/billing) and receipts. Client-safe (no database).
 *
 * Today the Parallax team records each payment by hand. Online card and mobile-money payments are
 * planned (docs/payment-integration.md): they will write the same SubscriptionPayment rows through
 * recordSubscriptionPayment() in lib/billing-server.ts, with source ONLINE.
 */

/** How a subscription was paid. Stored as the code. */
export const BILLING_METHODS = ["BANK_TRANSFER", "MOBILE_MONEY", "CARD", "CASH", "CHEQUE"] as const;
export type BillingMethod = (typeof BILLING_METHODS)[number];

export const BILLING_METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  MOBILE_MONEY: "Mobile money",
  CARD: "Card",
  CASH: "Cash",
  CHEQUE: "Cheque",
};

/** Who wrote the payment record. */
export const PAYMENT_SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Recorded by the Parallax team",
  ONLINE: "Paid online",
};

/** Online payment by card or mobile money. Off until a provider is integrated. */
export const ONLINE_PAYMENTS_ENABLED = false;

/** Account filters on the team's Billing page, in menu order. */
export const BILLING_FILTERS = [
  { value: "", label: "All paying accounts" },
  { value: "attention", label: "Needs attention" },
  { value: "due-soon", label: "Due within 14 days" },
  { value: "grace", label: "Payment due" },
  { value: "overdue", label: "Overdue (read-only)" },
  { value: "trial", label: "On trial" },
  { value: "active", label: "Paid up" },
  { value: "suspended", label: "Suspended" },
] as const;

export const DUE_SOON_DAYS = 14;

/** "in 5 days", "today", "12 days ago" for a due date. */
export function relativeDays(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

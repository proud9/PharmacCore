/**
 * Trade between two businesses: statuses, labels and rules. Client-safe (no database).
 *
 * INQUIRY → QUOTED → ORDERED → (PREPARING → READY) → DISPATCHED → RECEIVED → CLOSED
 * Exits: DECLINED (seller), CANCELLED (buyer before ORDERED; seller before DISPATCHED),
 * EXPIRED (quote past its valid-until date, shown when read; see effectiveStatus()).
 */
export const TRADE_STATUSES = [
  "INQUIRY",
  "QUOTED",
  "ORDERED",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "RECEIVED",
  "CLOSED",
  "DECLINED",
  "CANCELLED",
] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

/** Seller's wording. */
export const SELLER_LABEL: Record<string, string> = {
  INQUIRY: "New inquiry",
  QUOTED: "Quote sent",
  ORDERED: "Order received",
  PREPARING: "Preparing",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  RECEIVED: "Delivered",
  CLOSED: "Closed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Quote expired",
};

/** Buyer's wording. */
export const BUYER_LABEL: Record<string, string> = {
  INQUIRY: "Inquiry sent",
  QUOTED: "Quote received",
  ORDERED: "Order placed",
  PREPARING: "Being prepared",
  READY: "Ready",
  DISPATCHED: "On the way",
  RECEIVED: "Received",
  CLOSED: "Closed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Quote expired",
};

export type Side = "seller" | "buyer";

export function statusLabel(status: string, side: Side) {
  return (side === "seller" ? SELLER_LABEL : BUYER_LABEL)[status] ?? status;
}

export function statusTone(status: string): "neutral" | "info" | "warn" | "good" | "bad" {
  switch (status) {
    case "INQUIRY":
    case "QUOTED":
      return "warn";
    case "ORDERED":
    case "PREPARING":
    case "READY":
    case "DISPATCHED":
      return "info";
    case "RECEIVED":
    case "CLOSED":
      return "good";
    case "DECLINED":
    case "CANCELLED":
    case "EXPIRED":
      return "bad";
    default:
      return "neutral";
  }
}

/** A quote past its valid-until date reads as EXPIRED until the seller re-quotes. */
export function effectiveStatus(order: { status: string; validUntil: Date | null }, now = new Date()) {
  if (order.status === "QUOTED" && order.validUntil && order.validUntil < now) return "EXPIRED";
  return order.status;
}

export const OPEN_STATUSES = ["INQUIRY", "QUOTED", "ORDERED", "PREPARING", "READY", "DISPATCHED", "RECEIVED"] as const;

export const PAYMENT_TERMS = ["PREPAY", "ON_DELIVERY", "CREDIT"] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const PAYMENT_TERMS_LABEL: Record<string, string> = {
  PREPAY: "Pay before delivery",
  ON_DELIVERY: "Pay on delivery",
  CREDIT: "Pay on account (credit)",
};

export function termsText(terms: string, creditDays: number) {
  return terms === "CREDIT" ? `${PAYMENT_TERMS_LABEL.CREDIT}, ${creditDays} days` : PAYMENT_TERMS_LABEL[terms] ?? terms;
}

export const PAYMENT_METHODS = ["BANK_TRANSFER", "MOBILE_MONEY", "CASH", "CHEQUE"] as const;
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  MOBILE_MONEY: "Mobile money",
  CASH: "Cash",
  CHEQUE: "Cheque",
};

export const LINK_STATUS_LABEL: Record<string, string> = {
  PENDING: "Waiting for reply",
  ACTIVE: "Connected",
  DECLINED: "Declined",
  ENDED: "Ended",
};

/**
 * The only Product fields a connected buyer ever receives from a seller's item list.
 * Never add price, cost, stock or reorder fields here.
 */
export const CATALOG_SELECT = {
  id: true,
  name: true,
  genericName: true,
  form: true,
  strength: true,
  unit: true,
  kind: true,
  manufacturer: true,
} as const;

/** Money owed on an order: invoiced total minus payments, never below zero. */
export function balanceOf(order: { quotedAmount: number | null; amountPaid: number; invoicedAt: Date | null }) {
  if (!order.invoicedAt || order.quotedAmount == null) return 0;
  return Math.max(0, Math.round((order.quotedAmount - order.amountPaid) * 100) / 100);
}

export function orderTotal(items: { quantity: number; unitPrice: number | null }[], taxRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * (item.unitPrice ?? 0), 0);
  return Math.round(subtotal * (1 + taxRate / 100) * 100) / 100;
}

/** Turns status codes in free text (history, activity log) into plain words. */
export function plainStatus(text: string, side: Side = "seller") {
  const labels = side === "seller" ? SELLER_LABEL : BUYER_LABEL;
  return text.replace(/\b[A-Z][A-Z_]{3,}\b/g, (code) => labels[code] ?? PAYMENT_TERMS_LABEL[code] ?? code);
}

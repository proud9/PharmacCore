/**
 * Purchase orders to manufacturers (client-safe: no db).
 * SENT → QUOTED → ACCEPTED → DISPATCHED → RECEIVED, with DECLINED (manufacturer) and CANCELLED (wholesale).
 * Older orders may still say DRAFT or ORDERED; they behave like ACCEPTED.
 */
export const PO_STATUS_LABEL: Record<string, string> = {
  SENT: "Waiting for price",
  QUOTED: "Price received",
  ACCEPTED: "Price accepted",
  DISPATCHED: "On the way",
  RECEIVED: "Received",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  DRAFT: "Ordered",
  ORDERED: "Ordered",
};

/** The same steps, worded for the manufacturer. */
export const PO_SUPPLIER_LABEL: Record<string, string> = {
  SENT: "New order",
  QUOTED: "Price sent",
  ACCEPTED: "Accepted",
  DISPATCHED: "Dispatched",
  RECEIVED: "Delivered",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  DRAFT: "Accepted",
  ORDERED: "Accepted",
};

export const PO_FILTER_STATUSES = ["SENT", "QUOTED", "ACCEPTED", "DISPATCHED", "RECEIVED", "DECLINED", "CANCELLED"] as const;

export const PO_CLOSED = ["RECEIVED", "DECLINED", "CANCELLED"];
/** The manufacturer can send or change a price. */
export const PO_QUOTABLE = ["SENT", "QUOTED"];
/** Price agreed: the manufacturer can invoice and dispatch. */
export const PO_ACCEPTED = ["ACCEPTED", "DRAFT", "ORDERED"];
/** An invoice can be issued or corrected. */
export const PO_INVOICEABLE = [...PO_ACCEPTED, "DISPATCHED", "RECEIVED"];
/** The wholesale can cancel before anything is dispatched. */
export const PO_CANCELLABLE = ["SENT", "QUOTED", ...PO_ACCEPTED];

export function poStatusTone(status: string): "neutral" | "good" | "warn" | "bad" | "brass" {
  if (status === "RECEIVED" || PO_ACCEPTED.includes(status)) return "good";
  if (status === "DECLINED" || status === "CANCELLED") return "bad";
  if (status === "QUOTED" || status === "DISPATCHED") return "brass";
  return "warn";
}

/** Order total: quoted total when the manufacturer has priced it, otherwise the expected cost. */
export function poTotal(order: { quotedAmount: number | null; items: { quantity: number; unitCost: number }[] }) {
  if (order.quotedAmount != null) return order.quotedAmount;
  return order.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
}

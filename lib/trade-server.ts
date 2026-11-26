import type { Prisma } from "@prisma/client";
import { addDays } from "date-fns";
import type { Tenant, Tx } from "./tenant";
import type { Side } from "./trade";

/**
 * Server-side order helpers. Every order is loaded through loadOrder(), which returns it only
 * when this business is the seller or the buyer, and says which side it is on.
 */
export const ORDER_INCLUDE = {
  items: { orderBy: { id: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
  payments: { orderBy: { paidOn: "asc" } },
} satisfies Prisma.TradeOrderInclude;

export type LoadedOrder = Prisma.TradeOrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export async function loadOrder(t: Tenant, id: string) {
  const order = await t.db.tradeOrder.findFirst({
    where: { id, OR: [{ sellerOrgId: t.org.id }, { buyerOrgId: t.org.id }] },
    include: ORDER_INCLUDE,
  });
  if (!order) return null;
  const side: Side = order.sellerOrgId === t.org.id ? "seller" : "buyer";
  return { order, side };
}

/**
 * Whether this business may take `side`'s steps on the order: it is that side, or the order is
 * OFFLINE (the other side isn't on Parallax) and this business created it, so it records both
 * sides' steps itself (e.g. types in a supplier's paper quote).
 */
export function actsAs(order: { sellerOrgId: string | null; buyerOrgId: string | null; channel: string; createdByOrgId: string }, orgId: string, side: Side) {
  if (side === "seller" && order.sellerOrgId === orgId) return true;
  if (side === "buyer" && order.buyerOrgId === orgId) return true;
  return order.channel === "OFFLINE" && order.createdByOrgId === orgId;
}

/** The other business on the order (null when it isn't on Parallax). */
export function otherOrgId(order: { sellerOrgId: string | null; buyerOrgId: string | null }, side: Side) {
  return side === "seller" ? order.buyerOrgId : order.sellerOrgId;
}

/**
 * Removes what the other side must never see before an order is passed to a client component:
 * the other side's private notes and its own item ids.
 */
export function viewFor<T extends LoadedOrder>(order: T, side: Side) {
  return {
    ...order,
    sellerNotes: side === "seller" ? order.sellerNotes : null,
    buyerNotes: side === "buyer" ? order.buyerNotes : null,
    items: order.items.map((item) => ({
      ...item,
      sellerProductId: side === "seller" ? item.sellerProductId : null,
      buyerProductId: side === "buyer" ? item.buyerProductId : null,
    })),
  };
}

export async function addEvent(
  tx: Tx,
  t: Tenant,
  orderId: string,
  status: string,
  message?: string,
) {
  await tx.tradeOrderEvent.create({
    data: { orderId, status, message, actorOrgId: t.org.id, actorName: `${t.user.name} (${t.org.name})` },
  });
}

/** Default due date for an invoice from the order's payment terms. */
export function dueDate(terms: string, creditDays: number, from = new Date()) {
  return terms === "CREDIT" ? addDays(from, creditDays) : from;
}

export function linesTotal(items: { quantity: number; unitPrice: number | null; qtyDispatched?: number | null }[], taxRate: number, useDispatched = false) {
  const subtotal = items.reduce((sum, item) => sum + (useDispatched ? item.qtyDispatched ?? item.quantity : item.quantity) * (item.unitPrice ?? 0), 0);
  return Math.round(subtotal * (1 + taxRate / 100) * 100) / 100;
}

export function paidInFull(order: { quotedAmount: number | null; amountPaid: number }) {
  return order.quotedAmount != null && order.amountPaid + 0.005 >= order.quotedAmount;
}

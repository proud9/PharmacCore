import { NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { apiTenant, notFound, type Tenant, type Tx } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { can } from "@/lib/capabilities";
import { deductStock } from "@/lib/inventory";
import { PAYMENT_METHODS, PAYMENT_TERMS, statusLabel, type Side } from "@/lib/trade";
import { actsAs, addEvent, dueDate, linesTotal, loadOrder, otherOrgId, paidInFull, type LoadedOrder } from "@/lib/trade-server";
import { money, ref } from "@/lib/utils";

/**
 * Every step of an order after it is created. Each action says which side takes it; on OFFLINE
 * orders the business that created the order takes both sides' steps (see actsAs()).
 *
 * INQUIRY → QUOTED → ORDERED → (PREPARING → READY) → DISPATCHED → RECEIVED → CLOSED
 */
const date = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), "Enter a valid date.");

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("QUOTE"),
    lines: z
      .array(
        z.object({
          id: z.string(),
          unitPrice: z.number().min(0, "Prices can't be negative."),
          quantity: z.number().int().positive().optional(),
          sellerProductId: z.string().nullable().optional(),
        }),
      )
      .min(1),
    taxRate: z.number().min(0).max(100).default(0),
    readyOn: date,
    validUntil: date,
    terms: z.string().trim().max(1000).optional(),
    message: z.string().trim().max(2000).optional(),
    paymentTerms: z.enum(PAYMENT_TERMS).optional(),
    creditDays: z.number().int().min(0).max(365).optional(),
  }),
  z.object({ action: z.literal("ACCEPT"), poNumber: z.string().trim().max(60).optional() }),
  z.object({ action: z.literal("DECLINE"), message: z.string().trim().max(1000).optional() }),
  z.object({ action: z.literal("CANCEL"), message: z.string().trim().max(1000).optional() }),
  z.object({ action: z.literal("PROGRESS"), status: z.enum(["PREPARING", "READY"]) }),
  z.object({ action: z.literal("INVOICE"), invoiceNo: z.string().trim().max(60).optional(), dueOn: date }),
  z.object({
    action: z.literal("DISPATCH"),
    lines: z.array(z.object({ id: z.string(), qtyDispatched: z.number().int().min(0) })).min(1),
    deliveryNoteNo: z.string().trim().max(60).optional(),
    deliveryMethod: z.string().trim().max(100).optional(),
    vehicleDriver: z.string().trim().max(100).optional(),
    dispatchFrom: z.string().trim().max(100).optional(),
    deliveryNotes: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("RECEIVE"),
    lines: z.array(z.object({ id: z.string(), qtyReceived: z.number().int().min(0) })).min(1),
  }),
  z.object({
    action: z.literal("PAYMENT"),
    amount: z.number().positive("Enter the amount paid."),
    method: z.enum(PAYMENT_METHODS),
    paidOn: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter the payment date."),
    reference: z.string().trim().max(100).optional(),
  }),
  z.object({ action: z.literal("NOTES"), notes: z.string().trim().max(2000) }),
]);

type Body = z.infer<typeof schema>;
type Fail = { error: string; status?: number };
type Done = { event?: { status: string; message: string }; notify?: { title: string } };

class StepError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Moves the order only if it is still in `from` (guards against double clicks and races). */
async function move(tx: Tx, order: LoadedOrder, from: string[], data: Parameters<Tx["tradeOrder"]["updateMany"]>[0]["data"]) {
  const moved = await tx.tradeOrder.updateMany({ where: { id: order.id, status: { in: from } }, data });
  if (moved.count === 0) throw new StepError("This order has changed since you opened it. Reload the page.", 409);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiTenant();
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const { id } = await params;
  const loaded = await loadOrder(t, id);
  if (!loaded) return notFound("That order");
  const { order, side } = loaded;
  const body = parsed.data;

  try {
    const done = await t.tx((tx) => step(tx, t, order, side, body), { timeout: 30_000 });
    if ("error" in done) return NextResponse.json({ error: done.error }, { status: done.status ?? 400 });
    if (done.notify) {
      const target = otherOrgId(order, side);
      if (target) {
        await t.db.notification.createMany({
          data: [{
            orgId: target,
            type: body.action,
            title: done.notify.title,
            link: side === "seller" ? `/purchases/${order.id}` : `/orders/${order.id}`,
          }],
        });
      }
    }
    await audit(t, {
      action: `ORDER_${body.action}`,
      entity: "TradeOrder",
      entityId: order.id,
      details: `${order.inquiryNo}${done.event ? ` · ${done.event.message}` : ""}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StepError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Error && error.message === "Insufficient stock") {
      return NextResponse.json({ error: "Not enough stock for one of the lines. Check Inventory, or dispatch a smaller quantity." }, { status: 400 });
    }
    throw error;
  }
}

async function step(tx: Tx, t: Tenant, order: LoadedOrder, side: Side, body: Body): Promise<Fail | Done> {
  const me = t.org.id;
  const asSeller = actsAs(order, me, "seller");
  const asBuyer = actsAs(order, me, "buyer");
  const need = (ok: boolean, who: string): Fail | null => (ok ? null : { error: `Only the ${who} can do this.`, status: 403 });
  const lineIds = new Set(order.items.map((item) => item.id));
  const now = new Date();

  switch (body.action) {
    case "QUOTE": {
      const denied = need(asSeller, "seller");
      if (denied) return denied;
      if (!["INQUIRY", "QUOTED", "ORDERED", "PREPARING", "READY"].includes(order.status)) return { error: "This order can no longer be priced." };
      if (order.invoicedAt) return { error: "This order is invoiced, so its price can't change." };
      if (body.lines.some((line) => !lineIds.has(line.id))) return { error: "Reload the page: the order's lines have changed." };
      // Only the real seller links lines to its own items (for stock at dispatch).
      const ownIds = body.lines.map((l) => l.sellerProductId).filter((v): v is string => !!v);
      if (ownIds.length && order.sellerOrgId === me) {
        const found = await tx.product.count({ where: { id: { in: [...new Set(ownIds)] }, active: true } });
        if (found !== new Set(ownIds).size) return { error: "One of the chosen items was not found." };
      }
      for (const line of body.lines) {
        await tx.tradeOrderItem.update({
          where: { id: line.id },
          data: {
            unitPrice: line.unitPrice,
            ...(line.quantity ? { quantity: line.quantity } : {}),
            ...(order.sellerOrgId === me && line.sellerProductId !== undefined ? { sellerProductId: line.sellerProductId } : {}),
          },
        });
      }
      const items = await tx.tradeOrderItem.findMany({ where: { orderId: order.id } });
      const total = linesTotal(items, body.taxRate);
      const wasAccepted = ["ORDERED", "PREPARING", "READY"].includes(order.status);
      await move(tx, order, [order.status], {
        status: "QUOTED",
        quoteNo: order.quoteNo ?? ref("QT"),
        quotedAmount: total,
        taxRate: body.taxRate,
        readyOn: body.readyOn,
        validUntil: body.validUntil,
        terms: body.terms || null,
        sellerMessage: body.message || null,
        quotedAt: now,
        ...(body.paymentTerms ? { paymentTerms: body.paymentTerms } : {}),
        ...(body.creditDays !== undefined ? { creditDays: body.creditDays } : {}),
        ...(wasAccepted ? { orderedAt: null } : {}),
      });
      const message = wasAccepted ? `Price changed to ${money(total)}; waiting for the buyer to accept again` : `Quote sent: ${money(total)}`;
      await addEvent(tx, t, order.id, "QUOTED", message);
      return { event: { status: "QUOTED", message }, notify: { title: `${wasAccepted ? "New price" : "Quote received"} from ${order.sellerName}: ${order.inquiryNo}` } };
    }

    case "ACCEPT": {
      const denied = need(asBuyer, "buyer");
      if (denied) return denied;
      if (order.status !== "QUOTED") return { error: "There is no quote waiting to be accepted." };
      if (order.validUntil && order.validUntil < startOfDay(now)) return { error: "This quote has expired. Ask the seller for a new price." };
      const poNumber = body.poNumber || order.poNumber || ref("PO");
      await move(tx, order, ["QUOTED"], { status: "ORDERED", orderedAt: now, poNumber });
      const message = `Quote accepted; purchase order ${poNumber} sent`;
      await addEvent(tx, t, order.id, "ORDERED", message);
      return { event: { status: "ORDERED", message }, notify: { title: `Purchase order ${poNumber} from ${order.buyerName}` } };
    }

    case "DECLINE": {
      const denied = need(asSeller, "seller");
      if (denied) return denied;
      if (!["INQUIRY", "QUOTED"].includes(order.status)) return { error: "Only an inquiry or an open quote can be declined." };
      await move(tx, order, ["INQUIRY", "QUOTED"], { status: "DECLINED" });
      const message = body.message ? `Declined: ${body.message}` : "Declined by the seller";
      await addEvent(tx, t, order.id, "DECLINED", message);
      return { event: { status: "DECLINED", message }, notify: { title: `${order.sellerName} declined ${order.inquiryNo}` } };
    }

    case "CANCEL": {
      const open = asSeller ? ["INQUIRY", "QUOTED", "ORDERED", "PREPARING", "READY"] : ["INQUIRY", "QUOTED"];
      if (!asSeller && !asBuyer) return { error: "You can't cancel this order.", status: 403 };
      if (!open.includes(order.status)) {
        return { error: asSeller ? "Dispatched orders can't be cancelled." : "Once a purchase order is sent, ask the seller to cancel it." };
      }
      if (order.invoicedAt && order.amountPaid > 0) return { error: "Payments are recorded on this order, so it can't be cancelled." };
      await move(tx, order, open, { status: "CANCELLED" });
      const who = side === "seller" ? "seller" : "buyer";
      const message = body.message ? `Cancelled by the ${who}: ${body.message}` : `Cancelled by the ${who}`;
      await addEvent(tx, t, order.id, "CANCELLED", message);
      return { event: { status: "CANCELLED", message }, notify: { title: `${order.inquiryNo} was cancelled by ${t.org.name}` } };
    }

    case "PROGRESS": {
      const denied = need(asSeller, "seller");
      if (denied) return denied;
      const from = body.status === "PREPARING" ? ["ORDERED"] : ["ORDERED", "PREPARING"];
      if (!from.includes(order.status)) return { error: "The order can't move to that step now." };
      await move(tx, order, from, { status: body.status });
      const message = statusLabel(body.status, "seller");
      await addEvent(tx, t, order.id, body.status, message);
      return { event: { status: body.status, message }, notify: { title: `${order.inquiryNo}: ${statusLabel(body.status, "buyer").toLowerCase()}` } };
    }

    case "INVOICE": {
      const denied = need(asSeller, "seller");
      if (denied) return denied;
      if (!["ORDERED", "PREPARING", "READY", "DISPATCHED", "RECEIVED"].includes(order.status)) {
        return { error: "Invoice an order once the buyer has accepted the price." };
      }
      if (order.invoicedAt) return { error: "This order is already invoiced." };
      const dispatched = ["DISPATCHED", "RECEIVED"].includes(order.status);
      const total = linesTotal(order.items, order.taxRate, dispatched);
      const invoiceNo = body.invoiceNo || ref("INV");
      await move(tx, order, [order.status], {
        invoiceNo,
        invoicedAt: now,
        dueOn: body.dueOn ?? dueDate(order.paymentTerms, order.creditDays, now),
        quotedAmount: total,
      });
      const message = `Invoice ${invoiceNo} issued: ${money(total)}`;
      await addEvent(tx, t, order.id, order.status, message);
      return { event: { status: order.status, message }, notify: { title: `Invoice ${invoiceNo} from ${order.sellerName}` } };
    }

    case "DISPATCH": {
      const denied = need(asSeller, "seller");
      if (denied) return denied;
      const from = ["ORDERED", "PREPARING", "READY"];
      if (!from.includes(order.status)) return { error: "Only an accepted order can be dispatched." };
      if (order.paymentTerms === "PREPAY" && !(order.invoicedAt && paidInFull(order))) {
        return { error: "This order is paid before delivery: invoice it and record the payment before dispatching." };
      }
      if (body.lines.some((line) => !lineIds.has(line.id))) return { error: "Reload the page: the order's lines have changed." };
      const sent = new Map(body.lines.map((line) => [line.id, line.qtyDispatched]));
      if (![...sent.values()].some((qty) => qty > 0)) return { error: "Enter the quantity sent for at least one line." };
      const stocked = order.sellerOrgId === me && can(t.org.kind, "inventory");
      for (const item of order.items) {
        const qty = sent.get(item.id) ?? 0;
        if (qty > item.quantity) return { error: `More than ordered on ${item.name}.` };
        if (stocked && qty > 0) {
          if (!item.sellerProductId) {
            return { error: `Choose which of your items "${item.name}" is (in the price form), so its stock can leave Inventory.` };
          }
          await deductStock(tx, item.sellerProductId, qty);
        }
        await tx.tradeOrderItem.update({ where: { id: item.id }, data: { qtyDispatched: qty } });
      }
      const deliveryNoteNo = body.deliveryNoteNo || ref("DN");
      await move(tx, order, from, {
        status: "DISPATCHED",
        dispatchedAt: now,
        deliveryNoteNo,
        deliveryMethod: body.deliveryMethod || null,
        vehicleDriver: body.vehicleDriver || null,
        dispatchFrom: body.dispatchFrom || null,
        deliveryNotes: body.deliveryNotes || null,
      });
      const message = `Dispatched with delivery note ${deliveryNoteNo}`;
      await addEvent(tx, t, order.id, "DISPATCHED", message);
      return { event: { status: "DISPATCHED", message }, notify: { title: `${order.inquiryNo} is on the way (${deliveryNoteNo})` } };
    }

    case "RECEIVE": {
      const denied = need(asBuyer, "buyer");
      if (denied) return denied;
      if (order.status !== "DISPATCHED") return { error: "Only a dispatched order can be received." };
      if (body.lines.some((line) => !lineIds.has(line.id))) return { error: "Reload the page: the order's lines have changed." };
      const got = new Map(body.lines.map((line) => [line.id, line.qtyReceived]));
      // The real buyer with inventory gets delivery lines in its Inventory queue; stock is added
      // when each line is completed there with its batch and expiry.
      const stocked = order.buyerOrgId === me && can(t.org.kind, "inventory");
      const links = stocked
        ? await tx.productLink.findMany({
            where: { sellerProductId: { in: order.items.map((i) => i.sellerProductId).filter((v): v is string => !!v) } },
          })
        : [];
      const linked = new Map(links.map((link) => [link.sellerProductId, link.productId]));
      for (const item of order.items) {
        const qty = got.get(item.id) ?? 0;
        if (qty > (item.qtyDispatched ?? item.quantity)) return { error: `More than was sent on ${item.name}.` };
        await tx.tradeOrderItem.update({ where: { id: item.id }, data: { qtyReceived: qty } });
        if (stocked && qty > 0) {
          await tx.stockIntake.create({
            data: {
              orgId: me,
              tradeOrderId: order.id,
              productId: item.buyerProductId ?? (item.sellerProductId ? linked.get(item.sellerProductId) ?? null : null),
              itemName: item.name,
              itemStrength: item.strength,
              itemForm: item.form,
              itemUnit: item.unit,
              sellerProductId: item.sellerProductId,
              deliveryNoteNo: order.deliveryNoteNo ?? order.inquiryNo,
              supplierName: order.sellerName,
              quantity: qty,
              unitCost: item.unitPrice ?? 0,
            },
          });
        }
      }
      const closes = !!order.invoicedAt && paidInFull(order);
      await move(tx, order, ["DISPATCHED"], { status: closes ? "CLOSED" : "RECEIVED", receivedAt: now, ...(closes ? { closedAt: now } : {}) });
      const message = stocked ? "Received; lines added to the Inventory delivery queue" : "Received";
      await addEvent(tx, t, order.id, "RECEIVED", message);
      if (closes) await addEvent(tx, t, order.id, "CLOSED", "Received and paid in full");
      return { event: { status: "RECEIVED", message }, notify: { title: `${order.buyerName} received ${order.inquiryNo}` } };
    }

    case "PAYMENT": {
      const denied = need(asSeller, "seller");
      if (denied) return denied;
      if (!order.invoicedAt || order.quotedAmount == null) return { error: "Issue the invoice before recording payments." };
      if (["CANCELLED", "DECLINED"].includes(order.status)) return { error: "This order was cancelled." };
      const balance = Math.round((order.quotedAmount - order.amountPaid) * 100) / 100;
      if (body.amount > balance + 0.005) return { error: `That is more than the balance of ${money(balance)}.` };
      await tx.tradePayment.create({
        data: {
          orderId: order.id,
          amount: body.amount,
          method: body.method,
          paidOn: new Date(body.paidOn),
          reference: body.reference || null,
          recordedBy: `${t.user.name} (${t.org.name})`,
        },
      });
      const amountPaid = Math.round((order.amountPaid + body.amount) * 100) / 100;
      const full = amountPaid + 0.005 >= order.quotedAmount;
      const closes = full && order.status === "RECEIVED";
      await move(tx, order, [order.status], { amountPaid, ...(closes ? { status: "CLOSED", closedAt: now } : {}) });
      const message = full ? `Paid in full (${money(body.amount)} received)` : `Payment recorded: ${money(body.amount)}`;
      await addEvent(tx, t, order.id, closes ? "CLOSED" : order.status, message);
      return { event: { status: order.status, message }, notify: { title: `${order.sellerName} recorded your payment on ${order.invoiceNo}` } };
    }

    case "NOTES": {
      await tx.tradeOrder.update({
        where: { id: order.id },
        data: side === "seller" ? { sellerNotes: body.notes || null } : { buyerNotes: body.notes || null },
      });
      return {};
    }
  }
}

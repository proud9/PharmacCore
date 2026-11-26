import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiTenant, partyDb } from "@/lib/tenant";
import { db as platform } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canTrade } from "@/lib/capabilities";
import { CATALOG_SELECT } from "@/lib/trade";
import { addEvent } from "@/lib/trade-server";
import { ref } from "@/lib/utils";

/**
 * Starts an order.
 * - side "buyer": an inquiry to a connected seller (lines from its item list, or typed) or to a
 *   private supplier contact (OFFLINE: you print or download the inquiry and record the replies).
 * - side "seller": an order for a connected customer or a private customer contact, which you
 *   then price (a quotation).
 */
const line = z.object({
  /** The seller's item, when picked from its list. */
  sellerProductId: z.string().optional(),
  /** Your own item, when you pick it from your stock. */
  productId: z.string().optional(),
  name: z.string().trim().max(200).optional(),
  strength: z.string().trim().max(60).optional(),
  form: z.string().trim().max(60).optional(),
  unit: z.string().trim().max(60).optional(),
  quantity: z.number().int().positive("Quantities must be at least 1.").max(1_000_000),
});

const schema = z
  .object({
    side: z.enum(["buyer", "seller"]),
    orgId: z.string().optional(),
    contactId: z.string().optional(),
    message: z.string().trim().max(2000).optional(),
    deliveryAddress: z.string().trim().max(300).optional(),
    lines: z.array(line).min(1, "Add at least one item.").max(300),
  })
  .refine((body) => !!body.orgId !== !!body.contactId, { message: "Choose who the order is with." });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the order." }, { status: 400 });
  const body = parsed.data;
  const auth = await apiTenant(body.side === "buyer" ? "buy" : "sell");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { org } = t;

  // The other side: a connected business, or one of this business's private contacts.
  let other: { id: string; name: string; kind: string } | null = null;
  let contact: { id: string; name: string } | null = null;
  let terms = { paymentTerms: "ON_DELIVERY", creditDays: 30 };
  if (body.orgId) {
    other = await platform.organization.findFirst({ where: { id: body.orgId, status: "ACTIVE" }, select: { id: true, name: true, kind: true } });
    const sellerId = body.side === "buyer" ? body.orgId : org.id;
    const buyerId = body.side === "buyer" ? org.id : body.orgId;
    const link = other
      ? await t.db.tradeLink.findFirst({ where: { sellerOrgId: sellerId, buyerOrgId: buyerId, status: "ACTIVE" } })
      : null;
    if (!other || !link) return NextResponse.json({ error: "You need an active connection with that business first." }, { status: 400 });
    const sellerOrg =
      body.side === "buyer"
        ? await platform.organization.findUnique({ where: { id: sellerId }, select: { defaultPaymentTerms: true, creditDays: true } })
        : org;
    terms = {
      paymentTerms: link.paymentTerms ?? sellerOrg?.defaultPaymentTerms ?? "ON_DELIVERY",
      creditDays: link.creditDays ?? sellerOrg?.creditDays ?? 30,
    };
    const sellerKind = body.side === "buyer" ? other.kind : org.kind;
    const buyerKind = body.side === "buyer" ? org.kind : other.kind;
    if (!canTrade(sellerKind, buyerKind)) return NextResponse.json({ error: "These businesses can't trade with each other." }, { status: 400 });
  } else {
    contact = await t.db.contact.findFirst({
      where: { id: body.contactId, role: body.side === "buyer" ? "SUPPLIER" : "CUSTOMER" },
      select: { id: true, name: true },
    });
    if (!contact) return NextResponse.json({ error: "That contact was not found." }, { status: 404 });
    if (body.side === "seller") terms = { paymentTerms: org.defaultPaymentTerms, creditDays: org.creditDays };
  }

  // Lines: names always come from the item record when one is picked (never trust typed names for those).
  const sellerIds = body.lines.map((l) => l.sellerProductId).filter((id): id is string => !!id);
  const ownIds = body.lines.map((l) => l.productId).filter((id): id is string => !!id);
  const catalog =
    body.side === "buyer" && other && sellerIds.length
      ? await partyDb(org.id).product.findMany({ where: { id: { in: sellerIds }, orgId: other.id, offered: true, active: true }, select: CATALOG_SELECT })
      : [];
  const own = ownIds.length ? await t.db.product.findMany({ where: { id: { in: ownIds }, active: true } }) : [];
  const links =
    body.side === "buyer" && sellerIds.length
      ? await t.db.productLink.findMany({ where: { sellerProductId: { in: sellerIds } } })
      : [];
  const catalogById = new Map(catalog.map((p) => [p.id, p]));
  const ownById = new Map(own.map((p) => [p.id, p]));
  const linkBySeller = new Map(links.map((l) => [l.sellerProductId, l.productId]));

  const items: Prisma.TradeOrderItemCreateWithoutOrderInput[] = [];
  for (const l of body.lines) {
    const fromCatalog = l.sellerProductId ? catalogById.get(l.sellerProductId) : undefined;
    const fromOwn = l.productId ? ownById.get(l.productId) : undefined;
    if (l.sellerProductId && !fromCatalog) return NextResponse.json({ error: "An item is no longer on the seller's list. Reload and try again." }, { status: 400 });
    if (l.productId && !fromOwn) return NextResponse.json({ error: "One of your items was not found. Reload and try again." }, { status: 400 });
    const source = fromCatalog ?? fromOwn;
    const name = source?.name ?? l.name;
    if (!name) return NextResponse.json({ error: "Every line needs an item name." }, { status: 400 });
    const ownProductId = body.side === "seller" ? fromOwn?.id : fromOwn?.id ?? (l.sellerProductId ? linkBySeller.get(l.sellerProductId) : undefined);
    items.push({
      name,
      strength: source?.strength ?? l.strength ?? null,
      form: source?.form ?? l.form ?? null,
      unit: source?.unit ?? l.unit ?? null,
      quantity: l.quantity,
      sellerProductId: body.side === "buyer" ? fromCatalog?.id ?? null : ownProductId ?? null,
      buyerProductId: body.side === "buyer" ? ownProductId ?? null : null,
      unitPrice: body.side === "seller" && fromOwn ? fromOwn.sellingPrice : null,
    });
  }

  const order = await t.tx(async (tx) => {
    const created = await tx.tradeOrder.create({
      data: {
        sellerOrgId: body.side === "seller" ? org.id : other?.id ?? null,
        buyerOrgId: body.side === "buyer" ? org.id : other?.id ?? null,
        sellerContactId: body.side === "buyer" ? contact?.id ?? null : null,
        buyerContactId: body.side === "seller" ? contact?.id ?? null : null,
        createdByOrgId: org.id,
        channel: contact ? "OFFLINE" : "ONLINE",
        sellerName: body.side === "seller" ? org.name : other?.name ?? contact!.name,
        buyerName: body.side === "buyer" ? org.name : other?.name ?? contact!.name,
        inquiryNo: ref("INQ"),
        paymentTerms: terms.paymentTerms,
        creditDays: terms.creditDays,
        buyerMessage: body.side === "buyer" ? body.message || null : null,
        sellerMessage: body.side === "seller" ? body.message || null : null,
        deliveryAddress: body.deliveryAddress || null,
        items: { create: items },
      },
    });
    await addEvent(tx, t, created.id, "INQUIRY", body.side === "buyer" ? "Inquiry sent" : "Order started by the seller");
    if (other) {
      await tx.notification.createMany({
        data: [{
          orgId: other.id,
          type: "INQUIRY",
          title: body.side === "buyer" ? `New inquiry from ${org.name}` : `${org.name} started an order for you`,
          link: body.side === "buyer" ? `/orders/${created.id}` : `/purchases/${created.id}`,
        }],
      });
    }
    return created;
  });
  await audit(t, { action: "ORDER_CREATED", entity: "TradeOrder", entityId: order.id, details: `${order.inquiryNo} · ${body.side === "buyer" ? order.sellerName : order.buyerName}` });
  return NextResponse.json({ ok: true, id: order.id, href: body.side === "buyer" ? `/purchases/${order.id}` : `/orders/${order.id}` }, { status: 201 });
}

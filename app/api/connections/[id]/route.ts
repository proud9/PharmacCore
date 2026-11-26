import { NextResponse } from "next/server";
import { z } from "zod";
import { apiTenant, notFound } from "@/lib/tenant";
import { db as platform } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { PAYMENT_TERMS } from "@/lib/trade";

/**
 * ACCEPT / DECLINE: the business that was asked. END: either side (open orders carry on).
 * TERMS: the seller sets payment terms for this customer (blank = its default).
 */
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ACCEPT") }),
  z.object({ action: z.literal("DECLINE") }),
  z.object({ action: z.literal("END") }),
  z.object({
    action: z.literal("TERMS"),
    paymentTerms: z.enum(PAYMENT_TERMS).nullable(),
    creditDays: z.number().int().min(0).max(365).nullable(),
  }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiTenant();
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an action." }, { status: 400 });
  const { id } = await params;
  const link = await t.db.tradeLink.findFirst({ where: { id, OR: [{ sellerOrgId: t.org.id }, { buyerOrgId: t.org.id }] } });
  if (!link) return notFound("That connection");
  const selling = link.sellerOrgId === t.org.id;
  const otherId = selling ? link.buyerOrgId : link.sellerOrgId;
  const other = await platform.organization.findUnique({ where: { id: otherId }, select: { name: true } });
  const page = selling ? "/suppliers" : "/customers"; // where the other side sees it
  const action = parsed.data.action;

  if (action === "ACCEPT" || action === "DECLINE") {
    if (link.status !== "PENDING" || link.requestedByOrgId === t.org.id) {
      return NextResponse.json({ error: "There is no request here for you to answer." }, { status: 400 });
    }
    await t.db.tradeLink.update({
      where: { id },
      data: { status: action === "ACCEPT" ? "ACTIVE" : "DECLINED", respondedAt: new Date() },
    });
    await notify(t, otherId, {
      type: "CONNECTION",
      title: action === "ACCEPT" ? `${t.org.name} accepted your request to connect` : `${t.org.name} declined your request to connect`,
      link: page,
    });
  } else if (action === "END") {
    if (link.status === "ENDED" || link.status === "DECLINED") return NextResponse.json({ ok: true });
    await t.db.tradeLink.update({ where: { id }, data: { status: "ENDED", respondedAt: new Date() } });
    await notify(t, otherId, { type: "CONNECTION", title: `${t.org.name} ended your connection`, link: page });
  } else {
    if (!selling) return NextResponse.json({ error: "Only the supplier sets payment terms." }, { status: 403 });
    await t.db.tradeLink.update({
      where: { id },
      data: { paymentTerms: parsed.data.paymentTerms, creditDays: parsed.data.creditDays },
    });
  }
  await audit(t, { action: `CONNECTION_${action}`, entity: "TradeLink", entityId: id, details: other?.name });
  return NextResponse.json({ ok: true });
}

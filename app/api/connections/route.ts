import { NextResponse } from "next/server";
import { z } from "zod";
import { apiTenant } from "@/lib/tenant";
import { db as platform } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { canTrade } from "@/lib/capabilities";

/**
 * Ask a business on Parallax to connect. Who sells to whom follows TRADE_PAIRS: a retailer asking a
 * wholesaler becomes its customer; a manufacturer asking a wholesaler becomes its supplier.
 * If the other business already asked, this accepts their request instead.
 */
const schema = z.object({ orgId: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await apiTenant();
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a business." }, { status: 400 });
  const other = await platform.organization.findFirst({
    where: { id: parsed.data.orgId, status: "ACTIVE" },
    select: { id: true, kind: true, name: true },
  });
  if (!other || other.id === t.org.id) return NextResponse.json({ error: "That business was not found." }, { status: 404 });

  const iSell = canTrade(t.org.kind, other.kind);
  const iBuy = canTrade(other.kind, t.org.kind);
  if (!iSell && !iBuy) {
    return NextResponse.json({ error: "Your account type doesn't trade with that kind of business." }, { status: 400 });
  }
  const sellerOrgId = iSell ? t.org.id : other.id;
  const buyerOrgId = iSell ? other.id : t.org.id;

  const existing = await t.db.tradeLink.findUnique({ where: { sellerOrgId_buyerOrgId: { sellerOrgId, buyerOrgId } } });
  if (existing?.status === "ACTIVE") return NextResponse.json({ ok: true, status: "ACTIVE" });
  if (existing?.status === "PENDING" && existing.requestedByOrgId !== t.org.id) {
    await t.db.tradeLink.update({ where: { id: existing.id }, data: { status: "ACTIVE", respondedAt: new Date() } });
    await notify(t, other.id, { type: "CONNECTION", title: `${t.org.name} accepted your request to connect`, link: iSell ? "/suppliers" : "/customers" });
    await audit(t, { action: "CONNECTION_ACCEPTED", entity: "TradeLink", entityId: existing.id, details: other.name });
    return NextResponse.json({ ok: true, status: "ACTIVE" });
  }
  if (existing?.status === "PENDING") return NextResponse.json({ ok: true, status: "PENDING" });

  const link = existing
    ? await t.db.tradeLink.update({
        where: { id: existing.id },
        data: { status: "PENDING", requestedByOrgId: t.org.id, respondedAt: null },
      })
    : await t.db.tradeLink.create({ data: { sellerOrgId, buyerOrgId, requestedByOrgId: t.org.id } });
  await notify(t, other.id, {
    type: "CONNECTION",
    title: `${t.org.name} asked to connect`,
    body: iSell ? "They want to supply you." : "They want to buy from you.",
    link: iSell ? "/suppliers" : "/customers",
  });
  await audit(t, { action: "CONNECTION_REQUESTED", entity: "TradeLink", entityId: link.id, details: other.name });
  return NextResponse.json({ ok: true, status: "PENDING" }, { status: 201 });
}

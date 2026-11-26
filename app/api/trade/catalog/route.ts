import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { apiTenant, partyDb } from "@/lib/tenant";
import { CATALOG_SELECT } from "@/lib/trade";

/**
 * GET: a connected seller's item list for building an inquiry: names, forms and pack sizes only,
 * never prices or stock (CATALOG_SELECT). Row-level security also refuses unconnected sellers.
 */
const schema = z.object({
  seller: z.string().min(1),
  q: z.string().trim().max(100).default(""),
  skip: z.coerce.number().int().min(0).default(0),
});
const TAKE = 20;

export async function GET(request: Request) {
  const auth = await apiTenant("buy", { write: false });
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Search request is not valid." }, { status: 400 });
  const { seller, q, skip } = parsed.data;
  const link = await t.db.tradeLink.findFirst({ where: { sellerOrgId: seller, buyerOrgId: t.org.id, status: "ACTIVE" } });
  if (!link) return NextResponse.json({ error: "You aren't connected to that supplier." }, { status: 404 });

  const text = { contains: q, mode: "insensitive" as const };
  const where: Prisma.ProductWhereInput = {
    orgId: seller,
    offered: true,
    active: true,
    ...(q ? { OR: [{ name: text }, { genericName: text }, { manufacturer: text }] } : {}),
  };
  const db = partyDb(t.org.id);
  const [items, total] = await Promise.all([
    db.product.findMany({ where, select: CATALOG_SELECT, orderBy: { name: "asc" }, take: TAKE, skip }),
    db.product.count({ where }),
  ]);
  return NextResponse.json({ items, total });
}

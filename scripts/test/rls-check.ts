/**
 * Quick check of the database-level locks (row-level security and the admin role), outside the app.
 *   npx tsx scripts/test/rls-check.ts
 */
import { loadEnv } from "../db";
loadEnv(); // values already in the environment (a test database) win over .env

async function main() {
  const { db, adminDb, base } = await import("../../lib/db");
  const { forOrg, partyDb } = await import("../../lib/tenant");
  const results: [string, boolean, unknown][] = [];
  const check = (name: string, ok: boolean, detail?: unknown) => results.push([name, ok, detail]);

  const orgs = await db.organization.findMany({ select: { id: true, name: true, kind: true } });
  const byName = (part: string) => orgs.find((o) => o.name.includes(part))!;
  const kilmers = byName("Kilmer");
  const copper = byName("Copperbelt");
  const central = byName("Lusaka Central");
  const zpi = byName("Zambia Pharma");
  const uth = byName("Teaching");

  check("app role without a business sees no items", (await db.product.count()) === 0);
  const raw = await base.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM "Product"`);
  check("raw SQL without a business sees no items", Number(raw[0].n) === 0);

  const k = forOrg(kilmers.id);
  const c = forOrg(copper.id);
  const kCount = await k.db.product.count();
  check("Kilmer's sees its own 8 items", kCount === 8, kCount);
  check("Copperbelt sees its own 5 items", (await c.db.product.count()) === 5);
  const kProduct = await k.db.product.findFirstOrThrow({ select: { id: true } });
  check("Copperbelt can't read a Kilmer's item by id", (await c.db.product.findFirst({ where: { id: kProduct.id } })) === null);
  // Bypass the app-side filter: RLS alone must still hide it.
  const viaRls = await base.$transaction([
    base.$executeRaw`SELECT set_config('app.org_id', ${copper.id}, true)`,
    base.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE id = ${kProduct.id}`,
  ]);
  check("RLS alone hides a Kilmer's item from Copperbelt", viaRls[1].length === 0);
  const write = await base
    .$transaction([
      base.$executeRaw`SELECT set_config('app.org_id', ${copper.id}, true)`,
      base.$executeRaw`UPDATE "Product" SET "sellingPrice" = 1 WHERE id = ${kProduct.id}`,
    ])
    .then((r) => r[1]);
  check("Copperbelt can't change a Kilmer's price", write === 0);
  const insert = await base
    .$transaction([
      base.$executeRaw`SELECT set_config('app.org_id', ${copper.id}, true)`,
      base.$executeRaw`INSERT INTO "Product" (id, "orgId", sku, name, "updatedAt") VALUES ('x1', ${kilmers.id}, 'HACK', 'Hack', now())`,
    ])
    .then(() => "inserted")
    .catch(() => "refused");
  check("Copperbelt can't add an item to Kilmer's", insert === "refused");

  // Catalog: Lusaka Central is connected to Kilmer's and Copperbelt, not to Zambia Pharma.
  const catalog = await partyDb(central.id).product.findMany({ where: { orgId: { not: central.id } }, select: { orgId: true } });
  const sellers = new Set(catalog.map((p) => p.orgId));
  check("Retailer sees connected wholesalers' item lists", sellers.has(kilmers.id) && sellers.has(copper.id));
  check("Retailer doesn't see an unconnected manufacturer's items", !sellers.has(zpi.id));

  // Orders: only the two parties.
  const uthOrders = await forOrg(uth.id).db.tradeOrder.count();
  const copperOrders = await c.db.tradeOrder.count();
  check("Client sees only its own order", uthOrders === 1, uthOrders);
  check("Copperbelt sees none of Kilmer's orders", copperOrders === 0, copperOrders);
  const items = await c.db.tradeOrderItem.count();
  check("Copperbelt sees no order lines", items === 0, items);

  // The Parallax team's role can't touch business tables at all.
  const adminRead = await adminDb()
    .product.count()
    .then(() => "read")
    .catch((e: Error) => (e.message.includes("permission denied") ? "denied" : e.message));
  check("Admin role is refused on items", adminRead === "denied", adminRead);
  const adminOrders = await adminDb()
    .tradeOrder.count()
    .then(() => "read")
    .catch((e: Error) => (e.message.includes("permission denied") ? "denied" : e.message));
  check("Admin role is refused on orders", adminOrders === "denied", adminOrders);
  check("Admin role can list businesses", (await adminDb().organization.count()) === 8);

  // Subscription payments: a business reads only its own receipts and can never write one.
  const kPayments = await k.db.subscriptionPayment.count();
  check("Kilmer's sees its own 3 subscription payments", kPayments === 3, kPayments);
  const kReceipt = await adminDb().subscriptionPayment.findFirstOrThrow({ where: { orgId: kilmers.id }, select: { id: true } });
  const peek = await base.$transaction([
    base.$executeRaw`SELECT set_config('app.org_id', ${copper.id}, true)`,
    base.$queryRaw<{ id: string }[]>`SELECT id FROM "SubscriptionPayment" WHERE id = ${kReceipt.id}`,
  ]);
  check("RLS hides Kilmer's receipts from Copperbelt", peek[1].length === 0);
  const fakePayment = await base
    .$transaction([
      base.$executeRaw`SELECT set_config('app.org_id', ${copper.id}, true)`,
      base.$executeRaw`UPDATE "SubscriptionPayment" SET amount = 0 WHERE "orgId" = ${copper.id}`,
    ])
    .then(() => "changed")
    .catch((e: Error) => (e.message.includes("permission denied") ? "denied" : e.message));
  check("A business can't change its own payments", fakePayment === "denied", fakePayment);
  check("The team can read every payment", (await adminDb().subscriptionPayment.count()) >= 8);

  // Encryption round trip
  const org = await db.organization.findUniqueOrThrow({ where: { id: kilmers.id } });
  check("Bank number decrypts for the app", !!org.accountNumber && !org.accountNumber.startsWith("enc:"));

  let failed = 0;
  for (const [name, ok, detail] of results) {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === undefined ? "" : `  (${JSON.stringify(detail)})`}`);
  }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
main();

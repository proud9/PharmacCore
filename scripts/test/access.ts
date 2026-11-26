/**
 * On the seeded demo network: which pages each account type can open, and that no business can
 * reach another's records (always "not found"), prices or documents. Also runs the database-level
 * checks (row-level security, admin role) and a code check that tenant tables are only touched
 * through lib/tenant.ts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { Client, ROOT, check, runScript, section, signedIn } from "./harness";

const PASSWORD = "Parallax2026!";

const PAGES = ["/dashboard", "/orders", "/purchases", "/payments", "/customers", "/suppliers", "/directory", "/items", "/inventory", "/stock-take", "/pos", "/sales", "/patients", "/prescriptions", "/reports", "/audit", "/settings", "/notifications", "/guide", "/billing"];

/** Pages each type opens; every other page sends it to /dashboard. */
const ALLOWED: Record<string, string[]> = {
  MANUFACTURER: ["/dashboard", "/orders", "/payments", "/customers", "/directory", "/items", "/audit", "/settings", "/notifications", "/guide", "/billing"],
  WHOLESALER: ["/dashboard", "/orders", "/purchases", "/payments", "/customers", "/suppliers", "/directory", "/items", "/inventory", "/stock-take", "/audit", "/settings", "/notifications", "/guide", "/billing"],
  RETAILER: PAGES,
  CLIENT: ["/dashboard", "/purchases", "/payments", "/suppliers", "/directory", "/audit", "/settings", "/notifications", "/guide"],
};

const TENANT_MODELS = ["subscriptionPayment", "category", "product", "batch", "stockIntake", "stockTake", "stockTakeItem", "patient", "prescription", "prescriptionItem", "sale", "saleItem", "auditLog", "contact", "notification", "productLink", "tradeLink", "tradeOrder", "tradeOrderItem", "tradeOrderEvent", "tradePayment"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

export async function accessSuite(base: string, db: PrismaClient, env: NodeJS.ProcessEnv) {
  const login = (email: string) => signedIn(base, email, PASSWORD);
  const zpi = await login("zpi@parallax.local");
  const kilmers = await login("kilmers@parallax.local");
  const copper = await login("copperbelt@parallax.local");
  const central = await login("central@parallax.local");
  const uth = await login("uth@parallax.local");
  const team = await login("team@parallax.local");

  section("Pages by account type");
  for (const [client, kind] of [[zpi, "MANUFACTURER"], [kilmers, "WHOLESALER"], [central, "RETAILER"], [uth, "CLIENT"]] as const) {
    for (const url of PAGES) {
      const page = await client.page(url);
      const allowed = ALLOWED[kind].includes(url);
      const ok = allowed ? page.status === 200 && page.path === url : page.path === "/dashboard";
      check(`${kind.toLowerCase()} ${allowed ? "opens" : "is sent away from"} ${url}`, ok, `${page.status} ${page.path}`);
    }
    check(`${kind.toLowerCase()} can't open the team area`, (await client.page("/admin")).path === "/dashboard");
    const guide = (await client.page("/guide")).html;
    const sellsHere = kind !== "CLIENT";
    check(
      `${kind.toLowerCase()} guide shows only its own sections`,
      guide.includes("Selling: from inquiry to payment") === sellsHere &&
        guide.includes("Buying: getting quotes") === (kind !== "MANUFACTURER") &&
        guide.includes("Sales counter, patients and prescriptions") === (kind === "RETAILER") &&
        guide.includes("Billing and your subscription") === sellsHere,
    );
    const search = await client.json("GET", "/api/admin/businesses?q=a");
    check(`${kind.toLowerCase()} can't search the team's business list`, search.status !== 200 || !Array.isArray(search.data.results), String(search.status));
  }
  for (const url of ["/admin", "/admin/businesses", "/admin/announcements", "/admin/demo-requests", "/admin/activity", "/admin/guide", "/admin/billing"]) {
    check(`team opens ${url}`, (await team.page(url)).status === 200);
  }
  check("team is sent from business pages to /admin", (await team.page("/dashboard")).path === "/admin");
  check("signed-out visitors go to sign-in", (await new Client(base, "anon").page("/orders")).path.startsWith("/login"));
  check("signed-out API calls get 401", (await new Client(base, "anon").json("GET", "/api/search?q=am")).status === 401);

  section("Orders stay between the two businesses");
  const orgs = await db.organization.findMany();
  const id = (part: string) => orgs.find((o) => o.name.includes(part))!.id;
  const K = id("Kilmer");
  const CENTRAL = id("Lusaka Central");
  const toCentral = await db.tradeOrder.findFirstOrThrow({ where: { sellerOrgId: K, buyerOrgId: CENTRAL, status: "INQUIRY" } });
  const toUth = await db.tradeOrder.findFirstOrThrow({ where: { sellerOrgId: K, buyerOrgId: id("Teaching") } });
  check("the seller opens its order", (await kilmers.page(`/orders/${toCentral.id}`)).status === 200);
  check("the buyer opens it as a purchase", (await central.page(`/purchases/${toCentral.id}`)).status === 200);
  check("a competing wholesaler gets not found", (await copper.page(`/orders/${toCentral.id}`)).status === 404);
  check("…and can't act on it", (await copper.json("POST", `/api/trade/orders/${toCentral.id}`, { action: "DECLINE" })).status === 404);
  check("…or open its documents", (await copper.page(`/documents/${toCentral.id}/inquiry`)).status === 404);
  check("another buyer can't see Kilmer's quote to UTH", (await central.page(`/purchases/${toUth.id}`)).status === 404);
  check("…or its quotation document", (await central.page(`/documents/${toUth.id}/quotation`)).status === 404);
  check("a manufacturer can't see its customer's sales", (await zpi.page(`/orders/${toUth.id}`)).status === 404);
  const search = await copper.json("GET", `/api/search?q=${encodeURIComponent(toUth.inquiryNo)}`);
  check("search never finds another business's orders", search.status === 200 && search.data.hits.length === 0, JSON.stringify(search.data));

  section("Items, prices and stock stay private");
  const kItem = await db.product.findFirstOrThrow({ where: { orgId: K } });
  check("another wholesaler can't open the item", (await copper.page(`/inventory/${kItem.id}`)).status === 404);
  check("…or edit it", (await copper.json("POST", `/api/items/${kItem.id}`, { offered: false })).status === 404);
  const stockTry = await copper.json("POST", `/api/inventory/items/${kItem.id}`, { stockCode: "X1", description: "Hijack", type: "OTC", unit: "x", price: 1, currentStock: 0, reason: "testing access" });
  const kAfter = await db.product.findUniqueOrThrow({ where: { id: kItem.id } });
  check("…or change its stock", stockTry.status === 404 && kAfter.name === kItem.name, `${stockTry.status} ${JSON.stringify(stockTry.data)}`);
  const sale = await copper.json("POST", "/api/sales", { items: [{ productId: kItem.id, quantity: 1 }] });
  check("…or sell it", sale.status === 403 || sale.status === 400, String(sale.status));
  const catalog = await central.json("GET", `/api/trade/catalog?seller=${K}`);
  check("a connected retailer sees Kilmer's item names", catalog.status === 200 && catalog.data.items.length > 0);
  check("…with no prices or stock", !/price|cost|quantity|reorder|batch/i.test(JSON.stringify(catalog.data)), JSON.stringify(catalog.data.items[0]));
  check("an unconnected manufacturer's list is refused", (await central.json("GET", `/api/trade/catalog?seller=${id("Zambia Pharma")}`)).status === 404);
  check("a pending connection shows nothing yet", (await (await login("kabwe@parallax.local")).json("GET", `/api/trade/catalog?seller=${K}`)).status === 404);
  const lookup = await copper.json("GET", "/api/lookup?kind=products&q=Amox");
  check("pickers only search your own items", lookup.status === 200 && lookup.data.results.every((r: { id: string }) => r.id !== kItem.id));
  const kContact = await db.contact.findFirstOrThrow({ where: { orgId: K } });
  check("another business can't edit a private contact", (await copper.json("POST", `/api/contacts/${kContact.id}`, { delete: true })).status === 404);
  check("…or start an order with it", (await copper.json("POST", "/api/trade/orders", { side: "seller", contactId: kContact.id, lines: [{ name: "x", quantity: 1 }] })).status === 404);
  check("you can't order from a business you're not connected to", (await uth.json("POST", "/api/trade/orders", { side: "buyer", orgId: id("Copperbelt"), lines: [{ name: "x", quantity: 1 }] })).status === 400);

  section("The Parallax team sees accounts, not business data");
  check("team can't search business records", (await team.json("GET", "/api/search?q=amox")).status === 403);
  check("team can't read an item list", (await team.json("GET", `/api/trade/catalog?seller=${K}`)).status === 403);
  const businessPage = await team.page(`/admin/businesses/${K}`);
  const accountNumber = (await db.$queryRawUnsafe<{ n: string }[]>(`SELECT "accountNumber" AS n FROM "Organization" WHERE id = '${K}'`))[0].n;
  check("team's business page opens", businessPage.status === 200);
  check("…without bank details", !businessPage.html.includes("Zanaco") && !businessPage.html.includes(accountNumber));
  check("…or order totals", !businessPage.html.includes(toUth.inquiryNo));

  section("Read-only after a lapsed subscription");
  const grace = await copper.json("POST", "/api/contacts", { role: "CUSTOMER", kind: "CLIENT", name: "In grace" });
  check("an account in its grace period can still write", grace.status === 201, String(grace.status));
  check("…and sees a payment-due notice", (await copper.page("/dashboard")).html.includes("payment is due"));

  section("Bell reminders");
  const kinds = async (name: string) => (await db.organization.findFirstOrThrow({ where: { name: { contains: name } } })).id;
  const notesFor = (orgId: string, prefix: string) => db.notification.count({ where: { orgId, dedupeKey: { startsWith: prefix } } });
  const copperId = await kinds("Copperbelt");
  await copper.page("/dashboard");
  check("payment due: a reminder in the bell", (await notesFor(copperId, "sub:due:")) === 1);
  await copper.page("/orders");
  check("…added only once", (await notesFor(copperId, "sub:")) === 1);
  const kabwe = await login("kabwe@parallax.local");
  check("trial ending within a week: listed on the very first visit to Notifications", (await kabwe.page("/notifications")).html.includes("Your free trial ends on"));
  await kabwe.page("/dashboard");
  check("…and added once", (await notesFor(await kinds("Kabwe"), "sub:trial-ending:")) === 1);
  const apex = await login("apex@parallax.local");
  await apex.page("/dashboard");
  check("read-only: a reminder", (await notesFor(await kinds("Apex"), "sub:read-only:")) === 1);
  const centralId = await kinds("Lusaka Central");
  check("paid up for months: no reminder", (await notesFor(centralId, "sub:")) === 0);
  const hope = await login("hope@parallax.local");
  await hope.page("/dashboard");
  check("clients (free): no reminder", (await notesFor(await kinds("Hope"), "sub:")) === 0);
  check("the reminder links to Billing", (await copper.page("/notifications")).html.includes('href="/billing"'));
  const nav = async (client: Awaited<ReturnType<typeof login>>) => (await client.page("/guide")).html.includes('href="/billing"');
  check("Billing is in the menu for paying accounts", await nav(apex));
  check("…and not for clients", !(await nav(hope)));

  section("Database locks");
  const rls = runScript(env, "scripts/test/rls-check.ts");
  const lines = rls.stdout.split("\n").filter((line) => /^(PASS|FAIL) /.test(line));
  for (const line of lines) check(`database: ${line.slice(5).trim()}`, line.startsWith("PASS"));
  check("database checks ran", lines.length > 10, rls.stderr.slice(0, 300));

  section("Code: tenant tables only through lib/tenant.ts");
  const offenders: string[] = [];
  for (const file of [...sourceFiles(path.join(ROOT, "app")), ...sourceFiles(path.join(ROOT, "components")), ...sourceFiles(path.join(ROOT, "lib"))]) {
    const text = readFileSync(file, "utf8");
    const imported = /import \{([^}]*)\} from "(?:@\/lib\/db|\.\/db)"/.exec(text);
    if (!imported) continue;
    const names = imported[1]
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/).pop()!)
      .filter((name) => ["db", "base", "platform"].includes(name) || /^[a-z]+$/i.test(name));
    for (const name of names) {
      if (["adminDb", "withCrypto", "Db"].includes(name)) continue;
      const hit = new RegExp(`(?<![.\\w])${name}\\.(${TENANT_MODELS.join("|")})\\b`).exec(text);
      if (hit && !file.endsWith(path.join("lib", "tenant.ts"))) offenders.push(`${path.relative(ROOT, file)}: ${hit[0]}`);
    }
  }
  check("no page, route or helper reads tenant tables without the business set", offenders.length === 0, offenders.join("; "));
}

/**
 * Plays the whole trading network from an empty installation: sign-ups of every account type,
 * the Parallax team's work, connections, and orders along the chain
 * manufacturer → wholesaler → retailer / client, with stock moving at dispatch and delivery.
 */
import type { PrismaClient } from "@prisma/client";
import { Client, check, iso, runScript, scanLabels, section } from "./harness";

const PASSWORD = "Passw0rd!2026";
type Json = Record<string, any>;

async function signUp(base: string, kind: string, businessName: string, email: string, name: string) {
  const client = new Client(base, email.split("@")[0]);
  const { status, data } = await client.json("POST", "/api/auth/register", { kind, businessName, town: "Lusaka", phone: "0977000000", name, email, password: PASSWORD });
  check(`${kind.toLowerCase()} signs up`, status === 201, `${status} ${JSON.stringify(data)}`);
  return client;
}

async function act(client: Client, orderId: string, body: Json, expect = 200) {
  const { status, data } = await client.json("POST", `/api/trade/orders/${orderId}`, body);
  return { ok: status === expect, status, data, detail: `${status} ${JSON.stringify(data)}` };
}

export async function workflowSuite(base: string, db: PrismaClient, env: NodeJS.ProcessEnv) {
  section("Sign-up");
  const maker = await signUp(base, "MANUFACTURER", "Copper Pharma Ltd", "maker@copper.test", "Mwila Banda");
  const whole = await signUp(base, "WHOLESALER", "Kilmers Wholesale", "owner@kilmers.test", "Chanda Mulenga");
  const shop = await signUp(base, "RETAILER", "Banda Pharmacy", "grace@banda.test", "Grace Banda");
  const clinic = await signUp(base, "CLIENT", "Hope Clinic", "stores@hope.test", "Sister Agnes");
  const dup = await new Client(base, "dup").json("POST", "/api/auth/register", { kind: "CLIENT", businessName: "Again", name: "Again", email: "stores@hope.test", password: PASSWORD });
  check("a used email can't sign up again", dup.status === 409, String(dup.status));
  const short = await new Client(base, "short").json("POST", "/api/auth/register", { kind: "CLIENT", businessName: "Short", name: "Short", email: "short@x.test", password: "short" });
  check("short passwords are refused", short.status === 400);

  const orgs = await db.organization.findMany({ include: { subscription: true } });
  const org = (name: string) => orgs.find((o) => o.name === name)!;
  check("paying businesses start on a trial", ["Copper Pharma Ltd", "Kilmers Wholesale", "Banda Pharmacy"].every((n) => org(n).subscription?.trialEndsAt));
  check("clients have no subscription (free)", !org("Hope Clinic").subscription);
  for (const [client, path] of [[whole, "/inventory"], [shop, "/pos"], [maker, "/items"], [clinic, "/purchases"]] as const) {
    const page = await client.page(path);
    check(`${client.label} opens ${path}`, page.status === 200 && page.path === path, `${page.status} ${page.path}`);
  }
  check("a client can't open Inventory", (await clinic.page("/inventory")).path === "/dashboard");
  check("a manufacturer can't open the sales counter", (await maker.page("/pos")).path === "/dashboard");
  check("a wholesaler has no sales counter", (await whole.page("/pos")).path === "/dashboard");

  section("Business details are encrypted at rest");
  const saved = await whole.json("POST", "/api/company", { name: "Kilmers Wholesale", tpin: "1002003004", bankName: "Zanaco", accountName: "Kilmers", accountNumber: "0011223344", listed: true });
  check("wholesaler saves bank details", saved.status === 200, JSON.stringify(saved.data));
  const rawBank = await db.$queryRawUnsafe<{ accountNumber: string; tpin: string }[]>(`SELECT "accountNumber", tpin FROM "Organization" WHERE name = 'Kilmers Wholesale'`);
  check("account number is stored encrypted", rawBank[0].accountNumber.startsWith("enc:1:"), rawBank[0].accountNumber);
  check("TPIN is stored encrypted", rawBank[0].tpin.startsWith("enc:1:"));
  const settings = await whole.page("/settings");
  check("the business still reads its own bank details", settings.html.includes("0011223344"));

  section("Parallax team");
  const created = runScript(env, "scripts/create-admin.ts", ["--email", "team@parallax.test", "--name", "Team Member"]);
  const temp = /Temporary password: (\S+)/.exec(created.stdout)?.[1];
  check("admin:create makes a team login", created.status === 0 && !!temp, created.stderr);
  const team = new Client(base, "team");
  const teamLogin = await team.login("team@parallax.test", temp ?? "");
  check("team login must choose a new password", teamLogin.data.home === "/account/password", JSON.stringify(teamLogin.data));
  check("team pages wait for the new password", (await team.page("/admin")).path === "/account/password");
  const changed = await team.json("POST", "/api/account/password", { current: temp, password: PASSWORD });
  check("team member sets a password", changed.status === 200, JSON.stringify(changed.data));
  check("team member opens the overview", (await team.page("/admin")).status === 200);
  const made = await team.json("POST", "/api/admin/businesses", { kind: "CLIENT", businessName: "Mansa District Hospital", name: "Dr Mansa", email: "stores@mansa.test" });
  check("team creates a business account", made.status === 201 && !!made.data.temporaryPassword, JSON.stringify(made.data));
  const mansa = new Client(base, "mansa");
  const mansaLogin = await mansa.login("stores@mansa.test", made.data.temporaryPassword);
  check("new owner signs in with the temporary password", mansaLogin.status === 200 && mansaLogin.data.home === "/account/password");
  const mansaUser = await db.user.findUniqueOrThrow({ where: { email: "stores@mansa.test" } });
  const reset = await team.json("POST", `/api/admin/users/${mansaUser.id}`, { action: "RESET_PASSWORD" });
  check("team resets a password", reset.status === 200 && !!reset.data.temporaryPassword);
  check("the reset signs the owner out", (await mansa.page("/dashboard")).path.startsWith("/login"));
  const mansaOrg = await db.organization.findFirstOrThrow({ where: { name: "Mansa District Hospital" } });
  const sus = await team.json("POST", `/api/admin/businesses/${mansaOrg.id}/status`, { status: "SUSPENDED" });
  check("team suspends a business", sus.status === 200);
  const suspendedLogin = await new Client(base, "mansa2").login("stores@mansa.test", reset.data.temporaryPassword);
  check("a suspended business can't sign in", suspendedLogin.status === 403, String(suspendedLogin.status));
  const ann = await team.json("POST", "/api/admin/announcements", { audience: "KIND", kind: "WHOLESALER", title: "Maintenance on Sunday", body: "Parallax is down 2–3 am." });
  check("team sends an announcement", ann.status === 201);
  const found = await team.json("GET", "/api/admin/businesses?q=" + encodeURIComponent("kilmers wh"));
  const pickedOrg = found.data.results?.find((row: { name: string }) => row.name === "Kilmers Wholesale");
  check("team finds a business by typing part of its name", Boolean(pickedOrg), JSON.stringify(found.data));
  const one = await team.json("POST", "/api/admin/announcements", { audience: "ORG", orgId: pickedOrg?.id, title: "Hello", body: "Just for you." });
  check("team sends an announcement to one business", one.status === 201);
  check("…but not to a business that doesn't exist", (await team.json("POST", "/api/admin/announcements", { audience: "ORG", orgId: "nope", title: "Hi", body: "x x" })).status === 400);
  check("a wholesaler sees it in notifications", (await whole.page("/notifications")).html.includes("Maintenance on Sunday"));
  check("a client doesn't", !(await clinic.page("/notifications")).html.includes("Maintenance on Sunday"));
  const teamApi = await team.json("POST", "/api/trade/orders", { side: "buyer", orgId: org("Kilmers Wholesale").id, lines: [{ name: "x", quantity: 1 }] });
  check("the team can't use business routes", teamApi.status === 403, String(teamApi.status));
  check("the team can't open business pages", (await team.page("/orders")).path === "/admin");
  check("a business can't open the team area", (await whole.page("/admin")).path === "/dashboard");
  check("a business can't call team routes", (await whole.json("POST", "/api/admin/businesses", {})).status === 403);

  section("Connections");
  const W = org("Kilmers Wholesale").id;
  const M = org("Copper Pharma Ltd").id;
  const R = org("Banda Pharmacy").id;
  const C = org("Hope Clinic").id;
  const directory = await shop.page("/directory");
  check("retailer finds the wholesaler in the directory", directory.html.includes("Kilmers Wholesale"));
  check("retailer's directory leaves out manufacturers", !directory.html.includes("Copper Pharma Ltd"));
  check("a client can't ask a manufacturer to connect", (await clinic.json("POST", "/api/connections", { orgId: M })).status === 400);
  const ask = async (from: Client, to: string) => (await from.json("POST", "/api/connections", { orgId: to })).status;
  check("wholesaler asks the manufacturer", (await ask(whole, M)) === 201);
  check("retailer asks the wholesaler", (await ask(shop, W)) === 201);
  check("client asks the wholesaler", (await ask(clinic, W)) === 201);
  check("client asks the retailer", (await ask(clinic, R)) === 201);
  const links = await db.tradeLink.findMany();
  const linkOf = (seller: string, buyer: string) => links.find((l) => l.sellerOrgId === seller && l.buyerOrgId === buyer)!;
  check("manufacturer accepts", (await maker.json("POST", `/api/connections/${linkOf(M, W).id}`, { action: "ACCEPT" })).status === 200);
  check("the asker can't accept its own request", (await shop.json("POST", `/api/connections/${linkOf(W, R).id}`, { action: "ACCEPT" })).status === 400);
  check("wholesaler accepts the retailer", (await whole.json("POST", `/api/connections/${linkOf(W, R).id}`, { action: "ACCEPT" })).status === 200);
  check("wholesaler accepts the client", (await whole.json("POST", `/api/connections/${linkOf(W, C).id}`, { action: "ACCEPT" })).status === 200);
  check("retailer accepts the client", (await shop.json("POST", `/api/connections/${linkOf(R, C).id}`, { action: "ACCEPT" })).status === 200);
  check("wholesaler: retailer pays before delivery", (await whole.json("POST", `/api/connections/${linkOf(W, R).id}`, { action: "TERMS", paymentTerms: "PREPAY", creditDays: null })).status === 200);
  check("wholesaler: client buys on 30 days' credit", (await whole.json("POST", `/api/connections/${linkOf(W, C).id}`, { action: "TERMS", paymentTerms: "CREDIT", creditDays: 30 })).status === 200);
  check("only the seller sets terms", (await clinic.json("POST", `/api/connections/${linkOf(W, C).id}`, { action: "TERMS", paymentTerms: "PREPAY", creditDays: null })).status === 403);
  const noteCount = await db.notification.count({ where: { orgId: W } });
  check("the asked business gets notifications", noteCount >= 2, String(noteCount));

  section("Items");
  check("manufacturer adds items", (await maker.json("POST", "/api/items", { sku: "CP-AMX", name: "Amoxicillin 500 mg capsules", strength: "500 mg", form: "capsule", unit: "box of 100", sellingPrice: 90, offered: true })).status === 201);
  check("…and a hidden one", (await maker.json("POST", "/api/items", { sku: "CP-NEW", name: "Unreleased syrup", unit: "bottle", sellingPrice: 10, offered: false })).status === 201);
  const stockRows = [
    { row: 1, input: { stockCode: "K-PCM", description: "Paracetamol 500 mg tablets", type: "OTC", unit: "box of 100", price: 40, openingStock: "200", expiry: iso(400) } },
    { row: 2, input: { stockCode: "K-ORS", description: "Oral rehydration salts", type: "OTC", unit: "box of 50", price: 70, openingStock: "100", expiry: iso(300) } },
  ];
  const wItems = await whole.json("POST", "/api/inventory/items", { rows: stockRows });
  check("wholesaler adds stocked items", wItems.status === 200 && wItems.data.results?.length === 2, JSON.stringify(wItems.data));
  const rItems = await shop.json("POST", "/api/inventory/items", { rows: [{ row: 1, input: { stockCode: "B-PCM", description: "Paracetamol 500 mg tablets", type: "OTC", unit: "box of 100", price: 55, openingStock: "20", expiry: iso(200) } }] });
  check("retailer adds a stocked item", rItems.status === 200 && rItems.data.results?.length === 1, JSON.stringify(rItems.data));
  check("both may use the same stock code as others", (await db.product.count({ where: { sku: { endsWith: "-PCM" } } })) === 2);

  section("Wholesaler buys from the manufacturer");
  const catalog = await whole.json("GET", `/api/trade/catalog?seller=${M}`);
  check("wholesaler sees the manufacturer's shown items", catalog.status === 200 && catalog.data.items.length === 1, JSON.stringify(catalog.data));
  const leaked = JSON.stringify(catalog.data);
  check("the item list carries no prices or stock", !/sellingPrice|costPrice|price|quantity|reorder/i.test(leaked), leaked);
  const mItem = catalog.data.items[0];
  const inquiry = await whole.json("POST", "/api/trade/orders", { side: "buyer", orgId: M, lines: [{ sellerProductId: mItem.id, quantity: 50 }, { name: "Gloves (typed line)", unit: "box", quantity: 10 }], message: "Need by month end" });
  check("wholesaler sends an inquiry", inquiry.status === 201, JSON.stringify(inquiry.data));
  const po = inquiry.data.id as string;
  check("manufacturer gets a notification", (await db.notification.count({ where: { orgId: M, type: "INQUIRY" } })) === 1);
  const poLines = await db.tradeOrderItem.findMany({ where: { orderId: po }, orderBy: { id: "asc" } });
  const q1 = await act(maker, po, { action: "QUOTE", lines: poLines.map((l) => ({ id: l.id, unitPrice: l.sellerProductId ? 92 : 45 })), taxRate: 0, validUntil: iso(14) });
  check("manufacturer quotes", q1.ok, q1.detail);
  check("the buyer can't send the seller's quote", !(await act(whole, po, { action: "QUOTE", lines: [], taxRate: 0 })).ok);
  const accept = await act(whole, po, { action: "ACCEPT", poNumber: "KW-PO-001" });
  check("wholesaler accepts and sends its purchase order", accept.ok, accept.detail);
  check("purchase order document opens for both", (await whole.page(`/documents/${po}/purchase-order`)).html.includes("KW-PO-001") && (await maker.page(`/documents/${po}/purchase-order`)).status === 200);
  const sent = await act(maker, po, { action: "DISPATCH", lines: poLines.map((l) => ({ id: l.id, qtyDispatched: l.quantity })), deliveryNoteNo: "CP-DN-77" });
  check("manufacturer dispatches (no stock kept)", sent.ok, sent.detail);
  const invoiced = await act(maker, po, { action: "INVOICE", invoiceNo: "CP-INV-9" });
  check("manufacturer invoices after delivery", invoiced.ok, invoiced.detail);
  const got = await act(whole, po, { action: "RECEIVE", lines: poLines.map((l) => ({ id: l.id, qtyReceived: l.quantity })) });
  check("wholesaler receives", got.ok, got.detail);
  const intakes = await db.stockIntake.findMany({ where: { orgId: W, tradeOrderId: po } });
  check("received lines wait in the wholesaler's Inventory", intakes.length === 2);
  const intakeAmx = intakes.find((i) => i.sellerProductId)!;
  const done = await whole.json("POST", `/api/inventory/intake/${intakeAmx.id}`, { stockCode: "K-AMX", description: "Amoxicillin 500 mg capsules", type: "OTC", unit: "box of 100", price: 140, quantity: 50, expiry: iso(500), lotNumber: "CP2407" });
  check("wholesaler completes the delivery line", done.status === 200, JSON.stringify(done.data));
  const amx = await db.product.findFirstOrThrow({ where: { orgId: W, sku: "K-AMX" }, include: { batches: true } });
  check("stock arrives only after the line is completed", amx.batches.reduce((s, b) => s + b.quantity, 0) === 50);
  check("the supplier's item is remembered", (await db.productLink.count({ where: { orgId: W, sellerProductId: mItem.id } })) === 1);
  const paid = await act(maker, po, { action: "PAYMENT", amount: 50 * 92 + 10 * 45, method: "BANK_TRANSFER", paidOn: iso(0), reference: "ZAN-1" });
  check("manufacturer records the payment", paid.ok, paid.detail);
  check("the order closes when received and paid", (await db.tradeOrder.findUniqueOrThrow({ where: { id: po } })).status === "CLOSED");

  section("Wholesaler sells to the retailer (pay before delivery)");
  const wCatalog = await shop.json("GET", `/api/trade/catalog?seller=${W}`);
  const pcm = wCatalog.data.items.find((i: Json) => i.name.startsWith("Paracetamol"));
  const rInq = await shop.json("POST", "/api/trade/orders", { side: "buyer", orgId: W, lines: [{ sellerProductId: pcm.id, quantity: 30 }] });
  check("retailer sends an inquiry", rInq.status === 201);
  const rOrder = rInq.data.id as string;
  const rLine = (await db.tradeOrderItem.findFirstOrThrow({ where: { orderId: rOrder } })).id;
  check("the line is already linked to the wholesaler's item", !!(await db.tradeOrderItem.findUniqueOrThrow({ where: { id: rLine } })).sellerProductId);
  check("wholesaler quotes", (await act(whole, rOrder, { action: "QUOTE", lines: [{ id: rLine, unitPrice: 50 }], taxRate: 16 })).ok);
  const rQuoteView = await shop.page(`/purchases/${rOrder}`);
  check("retailer sees the quoted price", rQuoteView.html.includes("50.00"));
  check("retailer accepts", (await act(shop, rOrder, { action: "ACCEPT" })).ok);
  const early = await act(whole, rOrder, { action: "DISPATCH", lines: [{ id: rLine, qtyDispatched: 30 }] }, 400);
  check("pay-before-delivery orders can't dispatch unpaid", early.ok, early.detail);
  check("wholesaler invoices", (await act(whole, rOrder, { action: "INVOICE" })).ok);
  const total = (await db.tradeOrder.findUniqueOrThrow({ where: { id: rOrder } })).quotedAmount!;
  check("invoice includes tax", Math.abs(total - 30 * 50 * 1.16) < 0.01, String(total));
  check("overpayment is refused", !(await act(whole, rOrder, { action: "PAYMENT", amount: total + 100, method: "CASH", paidOn: iso(0) })).ok);
  check("wholesaler records the payment", (await act(whole, rOrder, { action: "PAYMENT", amount: total, method: "MOBILE_MONEY", paidOn: iso(0) })).ok);
  const pcmW = await db.product.findFirstOrThrow({ where: { orgId: W, sku: "K-PCM" }, include: { batches: true } });
  const before = pcmW.batches.reduce((s, b) => s + b.quantity, 0);
  check("wholesaler dispatches", (await act(whole, rOrder, { action: "DISPATCH", lines: [{ id: rLine, qtyDispatched: 30 }] })).ok);
  const after = (await db.batch.aggregate({ where: { productId: pcmW.id }, _sum: { quantity: true } }))._sum.quantity;
  check("stock leaves the wholesaler at dispatch", before - (after ?? 0) === 30, `${before} → ${after}`);
  check("delivery note opens", (await shop.page(`/documents/${rOrder}/delivery-note`)).status === 200);
  check("retailer receives", (await act(shop, rOrder, { action: "RECEIVE", lines: [{ id: rLine, qtyReceived: 30 }] })).ok);
  check("paid and received closes the order", (await db.tradeOrder.findUniqueOrThrow({ where: { id: rOrder } })).status === "CLOSED");
  const rIntake = await db.stockIntake.findFirstOrThrow({ where: { orgId: R, tradeOrderId: rOrder } });
  const rDone = await shop.json("POST", `/api/inventory/intake/${rIntake.id}`, { stockCode: "B-PCM", description: "Paracetamol 500 mg tablets", type: "OTC", unit: "box of 100", price: 55, quantity: 30, expiry: iso(380) });
  check("retailer puts the delivery into its existing paracetamol", rDone.status === 200, JSON.stringify(rDone.data));
  check("retailer now has 50 on hand", (await db.batch.aggregate({ where: { orgId: R }, _sum: { quantity: true } }))._sum.quantity === 50);
  const again = await shop.json("POST", "/api/trade/orders", { side: "buyer", orgId: W, lines: [{ sellerProductId: pcm.id, quantity: 1 }] });
  check("next time the supplier's item is matched to the retailer's own", !!(await db.tradeOrderItem.findFirstOrThrow({ where: { orderId: again.data.id } })).buyerProductId);
  await act(shop, again.data.id, { action: "CANCEL" });

  section("Wholesaler sells to the client (30 days' credit)");
  const cCat = await clinic.json("GET", `/api/trade/catalog?seller=${W}`);
  const ors = cCat.data.items.find((i: Json) => i.name.startsWith("Oral"));
  const cInq = await clinic.json("POST", "/api/trade/orders", { side: "buyer", orgId: W, lines: [{ sellerProductId: ors.id, quantity: 20 }] });
  const cOrder = cInq.data.id as string;
  const cLine = (await db.tradeOrderItem.findFirstOrThrow({ where: { orderId: cOrder } })).id;
  check("client sends an inquiry", cInq.status === 201);
  check("wholesaler quotes the client", (await act(whole, cOrder, { action: "QUOTE", lines: [{ id: cLine, unitPrice: 80 }], taxRate: 0 })).ok);
  check("client sees a different price than the retailer would", !(await clinic.page(`/purchases/${cOrder}`)).html.includes("50.00"));
  check("client accepts", (await act(clinic, cOrder, { action: "ACCEPT" })).ok);
  check("wholesaler dispatches first on credit", (await act(whole, cOrder, { action: "DISPATCH", lines: [{ id: cLine, qtyDispatched: 20 }] })).ok);
  check("wholesaler invoices", (await act(whole, cOrder, { action: "INVOICE" })).ok);
  const cInv = await db.tradeOrder.findUniqueOrThrow({ where: { id: cOrder } });
  const days = Math.round(((cInv.dueOn?.getTime() ?? 0) - (cInv.invoicedAt?.getTime() ?? 0)) / 86_400_000);
  check("due in 30 days", days === 30, String(days));
  check("client receives", (await act(clinic, cOrder, { action: "RECEIVE", lines: [{ id: cLine, qtyReceived: 20 }] })).ok);
  check("a client keeps no stock, so no delivery queue", (await db.stockIntake.count({ where: { orgId: C } })) === 0);
  check("part payment", (await act(whole, cOrder, { action: "PAYMENT", amount: 600, method: "CHEQUE", paidOn: iso(0) })).ok);
  check("still open with a balance", (await db.tradeOrder.findUniqueOrThrow({ where: { id: cOrder } })).status === "RECEIVED");
  const payPage = await whole.page("/payments");
  check("Payments lists the client's balance", payPage.html.includes("Hope Clinic"));
  check("rest paid closes it", (await act(whole, cOrder, { action: "PAYMENT", amount: 1000, method: "CHEQUE", paidOn: iso(0) })).ok && (await db.tradeOrder.findUniqueOrThrow({ where: { id: cOrder } })).status === "CLOSED");

  section("Retailer sells to the client");
  const bCat = await clinic.json("GET", `/api/trade/catalog?seller=${R}`);
  check("client sees the retailer's items", bCat.status === 200 && bCat.data.items.length === 1);
  const bInq = await clinic.json("POST", "/api/trade/orders", { side: "buyer", orgId: R, lines: [{ sellerProductId: bCat.data.items[0].id, quantity: 5 }] });
  const bOrder = bInq.data.id as string;
  const bLine = (await db.tradeOrderItem.findFirstOrThrow({ where: { orderId: bOrder } })).id;
  check("retailer quotes", (await act(shop, bOrder, { action: "QUOTE", lines: [{ id: bLine, unitPrice: 60 }], taxRate: 0 })).ok);
  check("client accepts", (await act(clinic, bOrder, { action: "ACCEPT" })).ok);
  check("retailer dispatches from its stock", (await act(shop, bOrder, { action: "DISPATCH", lines: [{ id: bLine, qtyDispatched: 5 }] })).ok);
  const bStock = await db.batch.aggregate({ where: { orgId: R }, _sum: { quantity: true } });
  check("retailer's stock went down", bStock._sum.quantity === 45, String(bStock._sum.quantity));

  section("Changing an accepted price, declining, cancelling");
  const xInq = await shop.json("POST", "/api/trade/orders", { side: "buyer", orgId: W, lines: [{ sellerProductId: pcm.id, quantity: 5 }] });
  const xOrder = xInq.data.id as string;
  const xLine = (await db.tradeOrderItem.findFirstOrThrow({ where: { orderId: xOrder } })).id;
  await act(whole, xOrder, { action: "QUOTE", lines: [{ id: xLine, unitPrice: 50 }], taxRate: 0 });
  await act(shop, xOrder, { action: "ACCEPT" });
  check("a new price after acceptance goes back to the buyer", (await act(whole, xOrder, { action: "QUOTE", lines: [{ id: xLine, unitPrice: 48 }], taxRate: 0 })).ok && (await db.tradeOrder.findUniqueOrThrow({ where: { id: xOrder } })).status === "QUOTED");
  check("the buyer can cancel while the price is open", (await act(shop, xOrder, { action: "CANCEL" })).ok);
  const yInq = await shop.json("POST", "/api/trade/orders", { side: "buyer", orgId: W, lines: [{ name: "Something rare", quantity: 1 }] });
  check("wholesaler declines an inquiry", (await act(whole, yInq.data.id, { action: "DECLINE", message: "Not stocked" })).ok);
  const expired = await shop.json("POST", "/api/trade/orders", { side: "buyer", orgId: W, lines: [{ sellerProductId: pcm.id, quantity: 1 }] });
  const eLine = (await db.tradeOrderItem.findFirstOrThrow({ where: { orderId: expired.data.id } })).id;
  await act(whole, expired.data.id, { action: "QUOTE", lines: [{ id: eLine, unitPrice: 50 }], taxRate: 0, validUntil: iso(-2) });
  check("an expired quote can't be accepted", !(await act(shop, expired.data.id, { action: "ACCEPT" })).ok);

  section("Customers and suppliers off Parallax");
  const contact = await whole.json("POST", "/api/contacts", { role: "CUSTOMER", kind: "CLIENT", name: "Kasama Mission Hospital", town: "Kasama", phone: "0212 000 111" });
  check("wholesaler adds a private customer", contact.status === 201);
  const rawContact = await db.$queryRawUnsafe<{ phone: string }[]>(`SELECT phone FROM "Contact" LIMIT 1`);
  check("contact details are stored encrypted", rawContact[0].phone.startsWith("enc:1:"));
  const ownPcm = await db.product.findFirstOrThrow({ where: { orgId: W, sku: "K-PCM" } });
  const off = await whole.json("POST", "/api/trade/orders", { side: "seller", contactId: contact.data.id, lines: [{ productId: ownPcm.id, quantity: 10 }] });
  check("wholesaler starts a quotation for them", off.status === 201, JSON.stringify(off.data));
  const offId = off.data.id as string;
  const offLine = await db.tradeOrderItem.findFirstOrThrow({ where: { orderId: offId } });
  check("own item's price is filled in", offLine.unitPrice === 40);
  check("quote", (await act(whole, offId, { action: "QUOTE", lines: [{ id: offLine.id, unitPrice: 45 }], taxRate: 0 })).ok);
  const quoteDoc = await whole.page(`/documents/${offId}/quotation`);
  check("the quotation prints with the customer's name", quoteDoc.status === 200 && quoteDoc.html.includes("Kasama Mission Hospital"));
  check("wholesaler records their acceptance", (await act(whole, offId, { action: "ACCEPT" })).ok);
  check("…dispatches", (await act(whole, offId, { action: "DISPATCH", lines: [{ id: offLine.id, qtyDispatched: 10 }] })).ok);
  check("…and records delivery", (await act(whole, offId, { action: "RECEIVE", lines: [{ id: offLine.id, qtyReceived: 10 }] })).ok);
  const supplier = await clinic.json("POST", "/api/contacts", { role: "SUPPLIER", kind: "WHOLESALER", name: "Northern Medical (paper)" });
  const paperInq = await clinic.json("POST", "/api/trade/orders", { side: "buyer", contactId: supplier.data.id, lines: [{ name: "Syringes 5 ml", unit: "box of 100", quantity: 4 }] });
  check("client writes an inquiry to a supplier off Parallax", paperInq.status === 201);
  check("…and downloads it", (await clinic.page(`/documents/${paperInq.data.id}/inquiry`)).html.includes("Syringes 5 ml"));

  section("Retail counter");
  const patient = await shop.json("POST", "/api/patients", { firstName: "Thandiwe", lastName: "Mbewe", phone: "0977123456", dateOfBirth: "1990-02-03" });
  check("retailer adds a patient", patient.status === 200);
  const rawPatient = await db.$queryRawUnsafe<{ phone: string }[]>(`SELECT phone FROM "Patient" LIMIT 1`);
  check("patient phone is stored encrypted", rawPatient[0].phone.startsWith("enc:1:"));
  const bPcm = await db.product.findFirstOrThrow({ where: { orgId: R, sku: "B-PCM" } });
  const sale = await shop.json("POST", "/api/sales", { items: [{ productId: bPcm.id, quantity: 2 }], payment: "CASH" });
  check("retailer sells at the counter", sale.status === 200, JSON.stringify(sale.data));
  check("a wholesaler's item can't be sold at the retailer's counter", (await shop.json("POST", "/api/sales", { items: [{ productId: ownPcm.id, quantity: 1 }] })).status === 400);
  const rx = await shop.json("POST", "/api/prescriptions", { patientId: patient.data.id, prescriber: "Dr Siame", items: [{ productId: bPcm.id, quantity: 1 }] });
  check("retailer files a prescription", rx.status === 200);
  check("…and dispenses it", (await shop.json("POST", `/api/prescriptions/${rx.data.id}/dispense`, {})).status === 200);

  section("Stock take");
  const pcmStock = (await db.batch.aggregate({ where: { productId: ownPcm.id }, _sum: { quantity: true } }))._sum.quantity ?? 0;
  const over = await whole.json("POST", "/api/stock-take", { items: [{ productId: ownPcm.id, countedQty: pcmStock + 1 }] });
  check("a stock take can't count more than is on hand", over.status === 400, String(over.status));
  const take = await whole.json("POST", "/api/stock-take", { items: [{ productId: ownPcm.id, countedQty: Math.max(pcmStock - 1, 0) }] });
  check("wholesaler finishes a stock take", take.status === 200, JSON.stringify(take.data));
  const takePage = await whole.page(`/stock-take/${take.data.id}`);
  check("stock take report opens", takePage.status === 200);

  section("Subscription lapse");
  await db.subscription.update({ where: { orgId: W }, data: { periodEnd: new Date(Date.now() - 20 * 86_400_000), trialEndsAt: null } });
  const ro = await whole.json("POST", "/api/contacts", { role: "CUSTOMER", kind: "CLIENT", name: "Blocked" });
  check("a lapsed wholesaler is read-only", ro.status === 403, String(ro.status));
  check("…but can still read its pages", (await whole.page("/orders")).status === 200);
  check("…and shows the read-only notice", (await whole.page("/dashboard")).html.includes("read-only"));
  const freeClient = await clinic.json("POST", "/api/contacts", { role: "SUPPLIER", kind: "WHOLESALER", name: "Still free" });
  check("a client never lapses (free)", freeClient.status === 201);
  const renew = await team.json("POST", `/api/admin/businesses/${W}/subscription`, { amount: 1200, paidOn: iso(0), months: 12, reference: "ZAN-SUB-1" });
  check("team records a subscription payment", renew.status === 200, JSON.stringify(renew.data));
  check("the wholesaler can write again", (await whole.json("POST", "/api/contacts", { role: "CUSTOMER", kind: "CLIENT", name: "Unblocked" })).status === 201);
  check("clients have nothing to pay", (await team.json("POST", `/api/admin/businesses/${C}/subscription`, { amount: 1, paidOn: iso(0), months: 1 })).status === 400);

  section("Logs and wording");
  check("wholesaler's activity log has its own actions", (await whole.page("/audit")).html.includes("Order"));
  const teamActivity = await team.page("/admin/activity");
  check("team activity lists its actions", teamActivity.html.includes("business created") && teamActivity.html.includes("subscription paid"));
  const otherLog = await db.auditLog.findMany({ where: { orgId: W, action: { startsWith: "LOGIN_" } } });
  check("team actions are not in a business's own log", otherLog.length === 0);
  const pages: [Client, string][] = [
    [whole, "/dashboard"],
    [whole, "/orders"],
    [whole, `/orders/${rOrder}`],
    [whole, "/customers"],
    [whole, "/payments"],
    [shop, `/purchases/${rOrder}`],
    [shop, "/suppliers"],
    [clinic, `/purchases/${cOrder}`],
    [maker, "/items"],
    [maker, `/orders/${po}`],
    [team, "/admin/businesses"],
  ];
  for (const [client, path] of pages) {
    const page = await client.page(path);
    check(`${client.label} ${path} opens`, page.status === 200, `${page.status} ${page.path}`);
    scanLabels(client.label, path, page.html, [/\bconsignment/gi, /\bbuyer portal\b/gi]);
  }
}

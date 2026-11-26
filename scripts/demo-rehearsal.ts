/**
 * Plays the whole LAN presentation (docs/demo/README.md) end to end, as each device would, so you
 * know every step works before the audience arrives.
 *
 *   npm run demo:rehearse
 *
 * It uses its own empty database (parallax_test_rehearsal) and the demo build (.next-demo), serves
 * it on this computer's network address (port 3400) and talks to it over that address, like the
 * other devices will. Your demo database is not touched. Every step prints ✓ or ✗; it stops at
 * the first failure.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { addDays, format } from "date-fns";
import { ensureProdBuild } from "./prod-build";
import { Client, ROOT, freshDatabase, runScript } from "./test/harness";
import { CAST, DEMO_PASSWORD, MAKER_ITEMS, TEAM } from "./demo-cast";
import { OPENING_STOCK_FILE, writeOpeningStock } from "./demo-files";

const PORT = 3400;
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
type Json = Record<string, any>;

let stepNo = 0;
function step(label: string, ok: unknown, detail = "") {
  stepNo++;
  if (!ok) {
    console.log(`✗ ${stepNo}. ${label}${detail ? `\n    ${detail}` : ""}`);
    throw new Error(`Rehearsal stopped at step ${stepNo}: ${label}`);
  }
  console.log(`✓ ${stepNo}. ${label}`);
}
const act = (title: string) => console.log(`\n── ${title}`);
const iso = (days: number) => format(addDays(new Date(), days), "yyyy-MM-dd");

function lanAddress() {
  const found = Object.values(networkInterfaces())
    .flat()
    .find((a) => a && a.family === "IPv4" && !a.internal);
  return found?.address;
}

async function serve(env: NodeJS.ProcessEnv): Promise<ChildProcess> {
  const server = spawn(process.execPath, [NEXT_BIN, "start", "-H", "0.0.0.0", "-p", String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, ...env, COOKIE_SECURE: "false", NODE_ENV: "production", NEXT_DIST_DIR: ".next-demo" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  server.stdout?.on("data", (c) => (log += c));
  server.stderr?.on("data", (c) => (log += c));
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}/login`, { redirect: "manual" })).status < 500) return server;
    } catch {
      // starting
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error(`The demo build did not start:\n${log}`);
}

async function main() {
  ensureProdBuild(".next-demo", process.argv.includes("--build"));
  await writeOpeningStock();
  const { env, db } = await freshDatabase("rehearsal", false);
  const server = await serve(env);
  const address = lanAddress();
  const base = `http://${address ?? "localhost"}:${PORT}`;
  console.log(`Rehearsing against ${base}${address ? " (this computer's network address)" : " (no network address found: check Wi-Fi)"}`);

  const people = {
    team: new Client(base, "team"),
    maker: new Client(base, "maker"),
    whole: new Client(base, "wholesale"),
    shop: new Client(base, "pharmacy"),
    clinic: new Client(base, "clinic"),
  };
  const order = async (who: Client, id: string, body: Json) => {
    const r = await who.json("POST", `/api/trade/orders/${id}`, body);
    return { ok: r.status === 200, detail: JSON.stringify(r.data) };
  };
  const lines = (orderId: string) => db.tradeOrderItem.findMany({ where: { orderId }, orderBy: { id: "asc" } });
  const link = (seller: string, buyer: string) => db.tradeLink.findFirstOrThrow({ where: { sellerOrgId: seller, buyerOrgId: buyer } });

  try {
    act("Before the audience: the server and the team login");
    step("demo server answers on the network address", (await fetch(`${base}/login`)).status === 200);
    const created = runScript(env, "scripts/create-admin.ts", ["--email", TEAM.email, "--name", TEAM.name]);
    const temp = /Temporary password: (\S+)/.exec(created.stdout)?.[1];
    step("team login created with a temporary password (npm run demo:admin)", !!temp, created.stderr);
    step("team signs in with it", (await people.team.login(TEAM.email, temp!)).status === 200);
    step("…and must choose a new password first", (await people.team.page("/admin")).path === "/account/password");
    step("team sets its own password", (await people.team.json("POST", "/api/account/password", { current: temp, password: DEMO_PASSWORD })).status === 200);

    act("Act 1: each device creates its account");
    for (const [key, who] of [["maker", CAST.manufacturer], ["whole", CAST.wholesaler], ["shop", CAST.retailer], ["clinic", CAST.client]] as const) {
      const r = await people[key].json("POST", "/api/auth/register", { ...who, password: DEMO_PASSWORD });
      step(`${who.device}: ${who.businessName} signs up as ${who.kind.toLowerCase()}`, r.status === 201 || r.status === 200, JSON.stringify(r.data));
      step(`…and lands on Home`, (await people[key].page("/dashboard")).status === 200);
    }
    const orgs = await db.organization.findMany();
    const id = (name: string) => orgs.find((o) => o.name === name)!.id;
    const M = id(CAST.manufacturer.businessName);
    const W = id(CAST.wholesaler.businessName);
    const R = id(CAST.retailer.businessName);
    const C = id(CAST.client.businessName);
    step("wholesaler adds bank details (they print on invoices)", (await people.whole.json("POST", "/api/company", { name: CAST.wholesaler.businessName, town: "Lusaka", bankName: "Zanaco", accountName: CAST.wholesaler.businessName, accountNumber: "0123456789", listed: true })).status === 200);

    act("Act 2: the team sees them arrive and says hello");
    const businesses = await people.team.page("/admin/businesses");
    step("team's Businesses lists all four", Object.values(CAST).every((c) => businesses.html.includes(c.businessName.replace("'", "&#x27;"))));
    const trials = await people.team.page("/admin/billing?status=trial");
    step(
      "team's Billing shows three on trial (the clinic is free, so not listed)",
      [CAST.manufacturer, CAST.wholesaler, CAST.retailer].every((c) => trials.html.includes(c.businessName)) && !trials.html.includes(CAST.client.businessName),
    );
    step("team sends a welcome announcement to everyone", (await people.team.json("POST", "/api/admin/announcements", { audience: "ALL", title: "Welcome to Parallax", body: "Your accounts are ready. Connect with your suppliers and customers in Find businesses." })).status === 201);
    step("it shows in the clinic's notifications", (await people.clinic.page("/notifications")).html.includes("Welcome to Parallax"));

    act("Act 3: connecting");
    const ask = async (from: Client, to: string) => (await from.json("POST", "/api/connections", { orgId: to })).status;
    step("wholesaler finds the manufacturer in Find businesses", (await people.whole.page("/directory")).html.includes(CAST.manufacturer.businessName));
    step("wholesaler asks the manufacturer to connect", [200, 201].includes(await ask(people.whole, M)));
    step("manufacturer accepts", (await people.maker.json("POST", `/api/connections/${(await link(M, W)).id}`, { action: "ACCEPT" })).status === 200);
    step("pharmacy asks the wholesaler; wholesaler accepts", [200, 201].includes(await ask(people.shop, W)) && (await people.whole.json("POST", `/api/connections/${(await link(W, R)).id}`, { action: "ACCEPT" })).status === 200);
    step("wholesaler sets the pharmacy to pay before delivery", (await people.whole.json("POST", `/api/connections/${(await link(W, R)).id}`, { action: "TERMS", paymentTerms: "PREPAY", creditDays: null })).status === 200);
    step("clinic asks the wholesaler and the pharmacy", [200, 201].includes(await ask(people.clinic, W)) && [200, 201].includes(await ask(people.clinic, R)));
    step("both accept", (await people.whole.json("POST", `/api/connections/${(await link(W, C)).id}`, { action: "ACCEPT" })).status === 200 && (await people.shop.json("POST", `/api/connections/${(await link(R, C)).id}`, { action: "ACCEPT" })).status === 200);
    step("wholesaler gives the clinic 30 days' credit", (await people.whole.json("POST", `/api/connections/${(await link(W, C)).id}`, { action: "TERMS", paymentTerms: "CREDIT", creditDays: 30 })).status === 200);

    act("Act 4: items and opening stock");
    for (const item of MAKER_ITEMS) {
      step(`manufacturer adds ${item.name}`, (await people.maker.json("POST", "/api/items", { ...item, offered: true })).status === 201);
    }
    const file = new Blob([readFileSync(OPENING_STOCK_FILE)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const form = new FormData();
    form.append("file", file, "wholesaler-opening-stock.xlsx");
    const upload = await people.whole.req("POST", "/api/inventory/import", undefined, { data: form });
    step("wholesaler uploads its opening stock sheet (docs/demo)", upload.status === 200, upload.text.slice(0, 300));
    const wStock = await db.batch.aggregate({ where: { orgId: W }, _sum: { quantity: true } });
    step("…420 units on hand across 4 items", wStock._sum.quantity === 420, String(wStock._sum.quantity));

    act("Act 5: wholesaler buys from the manufacturer (pay on delivery)");
    const mList = await people.whole.json("GET", `/api/trade/catalog?seller=${M}`);
    step("wholesaler sees the manufacturer's item names, no prices", mList.status === 200 && mList.data.items.length === 3 && !/price/i.test(JSON.stringify(mList.data)));
    const pick = (name: string) => mList.data.items.find((i: Json) => i.name.startsWith(name));
    const inq1 = await people.whole.json("POST", "/api/trade/orders", { side: "buyer", orgId: M, lines: [{ sellerProductId: pick("Amoxicillin").id, quantity: 100 }, { sellerProductId: pick("Metformin").id, quantity: 60 }], message: "Needed this week" });
    step("wholesaler sends the inquiry", inq1.status === 201, JSON.stringify(inq1.data));
    const o1 = inq1.data.id as string;
    const l1 = await lines(o1);
    step("manufacturer sends a quotation", (await order(people.maker, o1, { action: "QUOTE", lines: l1.map((l) => ({ id: l.id, unitPrice: l.name.startsWith("Amox") ? 92 : 48 })), taxRate: 0, readyOn: iso(2), validUntil: iso(14) })).ok);
    step("wholesaler accepts: purchase order sent", (await order(people.whole, o1, { action: "ACCEPT" })).ok);
    step("manufacturer dispatches with a delivery note", (await order(people.maker, o1, { action: "DISPATCH", lines: l1.map((l) => ({ id: l.id, qtyDispatched: l.quantity })), deliveryMethod: "Own truck" })).ok);
    step("manufacturer issues the invoice", (await order(people.maker, o1, { action: "INVOICE" })).ok);
    step("wholesaler confirms what arrived", (await order(people.whole, o1, { action: "RECEIVE", lines: l1.map((l) => ({ id: l.id, qtyReceived: l.quantity })) })).ok);
    const intakes1 = await db.stockIntake.findMany({ where: { orgId: W, tradeOrderId: o1 } });
    step("two lines wait in Inventory → Waiting from deliveries", intakes1.length === 2);
    for (const intake of intakes1) {
      const amox = intake.itemName.startsWith("Amox");
      const r = await people.whole.json("POST", `/api/inventory/intake/${intake.id}`, {
        stockCode: amox ? "W-AMX" : "W-MET",
        description: amox ? "Amoxicillin 500 mg capsules" : "Metformin 500 mg tablets",
        type: "OTC",
        unit: amox ? "box of 100" : "box of 60",
        price: amox ? 150 : 85,
        quantity: intake.quantity,
        expiry: iso(540),
        lotNumber: amox ? "ZP-AMX-2411" : "ZP-MET-2411",
      });
      step(`wholesaler enters batch and expiry: ${amox ? "Amoxicillin goes into its existing item" : "Metformin becomes a new item"}`, r.status === 200, JSON.stringify(r.data));
    }
    const wAfter = await db.batch.aggregate({ where: { orgId: W }, _sum: { quantity: true } });
    step("wholesaler now has 580 units", wAfter._sum.quantity === 580, String(wAfter._sum.quantity));
    const o1Total = l1.reduce((s, l) => s + l.quantity * (l.name.startsWith("Amox") ? 92 : 48), 0);
    step("manufacturer records the payment; the order closes", (await order(people.maker, o1, { action: "PAYMENT", amount: o1Total, method: "BANK_TRANSFER", paidOn: iso(0), reference: "ZAN-DEMO-1" })).ok && (await db.tradeOrder.findUniqueOrThrow({ where: { id: o1 } })).status === "CLOSED");

    act("Act 6: pharmacy buys from the wholesaler (pay before delivery)");
    const wList = await people.shop.json("GET", `/api/trade/catalog?seller=${W}`);
    const wPick = (name: string) => wList.data.items.find((i: Json) => i.name.startsWith(name));
    step("pharmacy sees the wholesaler's 5 items", wList.data.items.length === 5, String(wList.data.items.length));
    const inq2 = await people.shop.json("POST", "/api/trade/orders", { side: "buyer", orgId: W, lines: [{ sellerProductId: wPick("Paracetamol").id, quantity: 50 }, { sellerProductId: wPick("Amoxicillin").id, quantity: 20 }] });
    step("pharmacy sends an inquiry", inq2.status === 201);
    const o2 = inq2.data.id as string;
    const l2 = await lines(o2);
    const price2 = (l: { name: string }) => (l.name.startsWith("Para") ? 60 : 165);
    step("wholesaler quotes (16% VAT)", (await order(people.whole, o2, { action: "QUOTE", lines: l2.map((l) => ({ id: l.id, unitPrice: price2(l) })), taxRate: 16, validUntil: iso(7) })).ok);
    step("pharmacy accepts", (await order(people.shop, o2, { action: "ACCEPT", poNumber: "KP-PO-001" })).ok);
    step("dispatch is refused until it is paid", !(await order(people.whole, o2, { action: "DISPATCH", lines: l2.map((l) => ({ id: l.id, qtyDispatched: l.quantity })) })).ok);
    step("wholesaler issues the invoice", (await order(people.whole, o2, { action: "INVOICE" })).ok);
    const o2Total = (await db.tradeOrder.findUniqueOrThrow({ where: { id: o2 } })).quotedAmount!;
    step("pharmacy sees it under Payments → You owe", (await people.shop.page("/payments?view=owing")).html.includes(CAST.wholesaler.businessName.replace("'", "&#x27;")));
    step("wholesaler records the pharmacy's mobile-money payment", (await order(people.whole, o2, { action: "PAYMENT", amount: o2Total, method: "MOBILE_MONEY", paidOn: iso(0), reference: "MTN-778812" })).ok);
    step("wholesaler dispatches: stock leaves, earliest expiry first", (await order(people.whole, o2, { action: "DISPATCH", lines: l2.map((l) => ({ id: l.id, qtyDispatched: l.quantity })) })).ok);
    const wAfter2 = await db.batch.aggregate({ where: { orgId: W }, _sum: { quantity: true } });
    step("wholesaler is down to 510 units", wAfter2._sum.quantity === 510, String(wAfter2._sum.quantity));
    step("pharmacy confirms the delivery; paid and received, it closes", (await order(people.shop, o2, { action: "RECEIVE", lines: l2.map((l) => ({ id: l.id, qtyReceived: l.quantity })) })).ok && (await db.tradeOrder.findUniqueOrThrow({ where: { id: o2 } })).status === "CLOSED");
    for (const intake of await db.stockIntake.findMany({ where: { orgId: R, tradeOrderId: o2 } })) {
      const para = intake.itemName.startsWith("Para");
      const r = await people.shop.json("POST", `/api/inventory/intake/${intake.id}`, {
        stockCode: para ? "KP-PCM" : "KP-AMX",
        description: para ? "Paracetamol 500 mg tablets" : "Amoxicillin 500 mg capsules",
        type: "OTC",
        unit: para ? "box of 100" : "box of 100",
        price: para ? 75 : 210,
        quantity: intake.quantity,
        expiry: iso(400),
      });
      step(`pharmacy puts ${para ? "paracetamol" : "amoxicillin"} into stock`, r.status === 200, JSON.stringify(r.data));
    }

    act("Act 7: the clinic buys from both (credit from the wholesaler, on delivery from the pharmacy)");
    const cW = await people.clinic.json("GET", `/api/trade/catalog?seller=${W}`);
    const cR = await people.clinic.json("GET", `/api/trade/catalog?seller=${R}`);
    step("clinic sees both suppliers' items (names only)", cW.data.items.length === 5 && cR.data.items.length === 2);
    const inq3 = await people.clinic.json("POST", "/api/trade/orders", { side: "buyer", orgId: W, lines: [{ sellerProductId: cW.data.items.find((i: Json) => i.name.startsWith("Oral")).id, quantity: 30 }], deliveryAddress: "Chongwe Rural Health Centre, Chongwe" });
    const inq4 = await people.clinic.json("POST", "/api/trade/orders", { side: "buyer", orgId: R, lines: [{ sellerProductId: cR.data.items.find((i: Json) => i.name.startsWith("Para")).id, quantity: 10 }] });
    step("clinic sends an inquiry to each", inq3.status === 201 && inq4.status === 201);
    const o3 = inq3.data.id as string;
    const o4 = inq4.data.id as string;
    const l3 = await lines(o3);
    const l4 = await lines(o4);
    step("wholesaler quotes the clinic (its price to the pharmacy stays private)", (await order(people.whole, o3, { action: "QUOTE", lines: l3.map((l) => ({ id: l.id, unitPrice: 85 })), taxRate: 0 })).ok);
    step("pharmacy quotes the clinic", (await order(people.shop, o4, { action: "QUOTE", lines: l4.map((l) => ({ id: l.id, unitPrice: 80 })), taxRate: 0 })).ok);
    step("pharmacy can't open the wholesaler's quote to the clinic", (await people.shop.page(`/orders/${o3}`)).status === 404 && (await people.shop.page(`/purchases/${o3}`)).status === 404);
    step("clinic accepts both", (await order(people.clinic, o3, { action: "ACCEPT" })).ok && (await order(people.clinic, o4, { action: "ACCEPT" })).ok);
    step("wholesaler dispatches first (credit) and invoices, due in 30 days", (await order(people.whole, o3, { action: "DISPATCH", lines: l3.map((l) => ({ id: l.id, qtyDispatched: l.quantity })) })).ok && (await order(people.whole, o3, { action: "INVOICE" })).ok);
    step("pharmacy dispatches from its own stock and invoices", (await order(people.shop, o4, { action: "DISPATCH", lines: l4.map((l) => ({ id: l.id, qtyDispatched: l.quantity })) })).ok && (await order(people.shop, o4, { action: "INVOICE" })).ok);
    step("clinic confirms both deliveries", (await order(people.clinic, o3, { action: "RECEIVE", lines: l3.map((l) => ({ id: l.id, qtyReceived: l.quantity })) })).ok && (await order(people.clinic, o4, { action: "RECEIVE", lines: l4.map((l) => ({ id: l.id, qtyReceived: l.quantity })) })).ok);
    const owe = await people.clinic.page("/payments");
    step("clinic's Payments shows what it owes each", owe.html.includes("2,550.00") && owe.html.includes("800.00"));
    step("delivery note and invoice open for printing", (await people.clinic.page(`/documents/${o3}/delivery-note`)).status === 200 && (await people.clinic.page(`/documents/${o3}/invoice`)).status === 200);
    step("pharmacy records the clinic's cash payment; its order closes", (await order(people.shop, o4, { action: "PAYMENT", amount: 800, method: "CASH", paidOn: iso(0) })).ok && (await db.tradeOrder.findUniqueOrThrow({ where: { id: o4 } })).status === "CLOSED");

    act("Act 8: the pharmacy's counter");
    const patient = await people.shop.json("POST", "/api/patients", { firstName: "Mwape", lastName: "Chileshe", phone: "0966 123 456", dateOfBirth: "1988-05-14", allergies: "Sulfa drugs" });
    step("pharmacy registers a patient", patient.status === 200, JSON.stringify(patient.data));
    const kpPcm = await db.product.findFirstOrThrow({ where: { orgId: R, sku: "KP-PCM" } });
    const kpAmx = await db.product.findFirstOrThrow({ where: { orgId: R, sku: "KP-AMX" } });
    const sale = await people.shop.json("POST", "/api/sales", { patientId: patient.data.id, items: [{ productId: kpPcm.id, quantity: 2 }], payment: "MOBILE" });
    step("sells 2 boxes of paracetamol at the counter (mobile money)", sale.status === 200, JSON.stringify(sale.data));
    step("the receipt opens", (await people.shop.page(`/documents/sales/${sale.data.id}`)).status === 200);
    const rx = await people.shop.json("POST", "/api/prescriptions", { patientId: patient.data.id, prescriber: "Dr Siame", items: [{ productId: kpAmx.id, quantity: 1 }] });
    step("records a prescription", rx.status === 200);
    step("…and dispenses it", (await people.shop.json("POST", `/api/prescriptions/${rx.data.id}/dispense`, {})).status === 200);

    act("Act 9: the team's billing");
    step("team sets the wholesaler's fee", (await people.team.json("POST", `/api/admin/billing/${W}`, { monthlyFee: 1200 })).status === 200);
    const paid = await people.team.json("POST", `/api/admin/billing/${W}/payments`, { amount: 14400, months: 12, paidOn: iso(0), method: "BANK_TRANSFER", reference: "ZAN-SUB-DEMO" });
    step("team marks the wholesaler as paid: receipt issued", paid.status === 200 && /^RCT-/.test(String(paid.data.receiptNo)), JSON.stringify(paid.data));
    step("wholesaler's Billing shows the receipt", (await people.whole.page("/billing")).html.includes(String(paid.data.receiptNo)));
    step("…and the bell says thank you", (await people.whole.page("/notifications")).html.includes(`Receipt ${paid.data.receiptNo}`));
    step("team can't open any order", (await people.team.page(`/documents/${o2}/invoice`)).path === "/admin");

    console.log(`\nAll ${stepNo} steps passed. The demo flow works on this computer's network address.`);
    console.log("Reset the real demo before presenting: npm run demo -- --reset");
  } finally {
    server.kill();
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
});

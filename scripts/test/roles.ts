/**
 * Account types on the seeded demo data: who can create which accounts, which pages and API
 * actions each role can reach, and the wholesale order rules between Finance, Sales and clients.
 */
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { Client, check, iso, section, signedIn } from "./harness";

type Role = "ADMIN" | "FINANCE" | "SALES" | "BUYER" | "MANUFACTURER";
const A = "ADMIN", F = "FINANCE", S = "SALES", B = "BUYER", M = "MANUFACTURER";

export async function rolesSuite(base: string, db: PrismaClient) {
  const run = String(Date.now()).slice(-6);
  const admin = await signedIn(base, "admin@pharmacore.local", "Admin123!");
  const finance = await signedIn(base, "finance@pharmacore.local", "Finance123!");
  const sales = await signedIn(base, "sales@pharmacore.local", "Sales123!");
  const buyer = await signedIn(base, "uth@pharmacore.local", "Buyer123!");
  const buyer2 = await signedIn(base, "clinic@pharmacore.local", "Buyer123!");
  const maker = await signedIn(base, "medline@pharmacore.local", "Maker123!");
  const anon = new Client(base, "anonymous");
  const staff: Record<string, Client> = { ADMIN: admin, FINANCE: finance, SALES: sales };
  const all: Record<Role, Client> = { ADMIN: admin, FINANCE: finance, SALES: sales, BUYER: buyer, MANUFACTURER: maker };

  // ---------------------------------------------------------------- account creation
  section("Roles: account creation");
  const pw = "Passw0rd!";
  for (const [role, email] of [["FINANCE", `fin${run}`], ["SALES", `sal${run}`], ["ADMIN", `adm${run}`]]) {
    const r = await admin.json("POST", "/api/staff", { name: `New ${role}`, email: `${email}@test.local`, password: pw, role });
    check(`admin creates a ${role} user`, r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  }
  for (const role of ["BUYER", "CASHIER", "PHARMACIST", "WHOLESALE_ADMIN"]) {
    const r = await admin.json("POST", "/api/staff", { name: "Nope", email: `x${role}${run}@test.local`, password: pw, role });
    check(`staff form refuses role ${role}`, r.status === 400, `${r.status}`);
  }
  let r = await admin.json("POST", "/api/staff", { name: "Dup", email: `fin${run}@test.local`, password: pw, role: "SALES" });
  check("duplicate staff email gives a clear message", r.status === 409 && r.data.error, `${r.status} ${JSON.stringify(r.data)}`);
  r = await admin.json("POST", "/api/staff", { name: "Short", email: `short${run}@test.local`, password: "123", role: "SALES" });
  check("staff password under 8 characters refused", r.status === 400, `${r.status}`);
  for (const who of ["FINANCE", "SALES"]) {
    r = await staff[who].json("POST", "/api/staff", { name: "Sneaky", email: `sn${who}${run}@test.local`, password: pw, role: "ADMIN" });
    check(`${who} cannot create staff`, r.status === 403, `${r.status}`);
  }
  r = await buyer.json("POST", "/api/staff", { name: "Sneaky", email: `snb${run}@test.local`, password: pw, role: "ADMIN" });
  check("client cannot create staff", r.status === 403, `${r.status}`);
  r = await anon.json("POST", "/api/staff", {});
  check("signed-out visitor cannot create staff", r.status === 401, `${r.status}`);

  for (const [email, role, home] of [[`fin${run}`, "FINANCE", "/wholesale/payments"], [`sal${run}`, "SALES", "/wholesale"], [`adm${run}`, "ADMIN", "/dashboard"]]) {
    const c = new Client(base, email);
    const login = await c.login(`${email}@test.local`, pw);
    check(`new ${role} signs in and is sent to ${home}`, login.status === 200 && login.data.home === home, `${login.status} ${JSON.stringify(login.data)}`);
    const p = await c.page("/login");
    check(`new ${role} opening /login lands on ${home}`, p.path === home, p.path);
  }

  const pub = new Client(base, "public");
  r = await pub.json("POST", "/api/auth/register", { name: "Grace Banda", institutionName: `Banda Pharmacy ${run}`, kind: "PHARMACY", email: `grace${run}@test.local`, password: pw });
  check("public sign-up creates a client account and signs in", [200, 201].includes(r.status) && pub.cookie, `${r.status}`);
  const grace = await db.user.findUnique({ where: { email: `grace${run}@test.local` }, include: { institution: true } });
  check("sign-up links the client to a new organisation", grace?.role === "BUYER" && grace.institution?.name === `Banda Pharmacy ${run}`);
  check("new client is kept inside /portal", (await pub.page("/dashboard")).path === "/portal");
  r = await new Client(base, "x").json("POST", "/api/auth/register", { name: "Grace", institutionName: "Again", kind: "PHARMACY", email: `grace${run}@test.local`, password: pw });
  check("duplicate sign-up email gives 409", r.status === 409, `${r.status}`);
  r = await new Client(base, "x").json("POST", "/api/auth/register", { name: "A", institutionName: "B", kind: "SPACESHIP", email: "bad", password: "1" });
  check("invalid sign-up refused", r.status === 400, `${r.status}`);

  const acct = { name: `Chipata Clinic ${run}`, kind: "CLINIC", contact: "Dr Phiri", buyerName: "Dr Phiri", buyerEmail: `phiri${run}@test.local`, buyerPassword: pw };
  r = await finance.json("POST", "/api/wholesale/accounts", acct);
  check("FINANCE cannot add client accounts", r.status === 403, `${r.status}`);
  r = await buyer.json("POST", "/api/wholesale/accounts", acct);
  check("client cannot add client accounts", r.status === 403, `${r.status}`);
  r = await sales.json("POST", "/api/wholesale/accounts", acct);
  check("SALES adds a client account", r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  r = await sales.json("POST", "/api/wholesale/accounts", { ...acct, name: `Dup Clinic ${run}` });
  check("duplicate client login email gives a clear message", r.status === 409 && r.data.error, `${r.status}`);
  check("failed client creation leaves no empty organisation", (await db.institution.count({ where: { name: `Dup Clinic ${run}` } })) === 0);
  const phiri = new Client(base, "phiri");
  r = await phiri.login(`phiri${run}@test.local`, pw);
  check("staff-created client signs in to /portal", r.status === 200 && r.data.home === "/portal", `${r.status}`);

  r = await new Client(base, "x").json("POST", "/api/setup", { owner: { name: "Owner", email: `own${run}@test.local`, password: pw }, company: { name: "Another", phone: "0977000000", address: "Plot 1, Lusaka" } });
  check("second set-up refused once installed", r.status === 409, `${r.status}`);

  const template = await db.user.findUniqueOrThrow({ where: { email: `sal${run}@test.local` } });
  await db.user.create({ data: { name: "Old Cashier", email: `oldcash${run}@test.local`, passwordHash: template.passwordHash, role: "CASHIER" } });
  const legacy = new Client(base, "legacy");
  r = await legacy.login(`oldcash${run}@test.local`, pw);
  check("legacy CASHIER account still signs in", r.status === 200, `${r.status}`);
  let p = await legacy.page("/pos");
  check("legacy CASHIER works as SALES (sales counter opens)", p.status === 200 && p.path === "/pos", `${p.status} ${p.path}`);
  check("legacy CASHIER kept out of reports", (await legacy.page("/reports")).path !== "/reports");
  r = await legacy.json("POST", "/api/consignments/x/quote", {});
  check("legacy CASHIER cannot send prices", r.status === 403, `${r.status}`);

  await db.user.update({ where: { email: `sal${run}@test.local` }, data: { active: false } });
  r = await new Client(base, "deact").login(`sal${run}@test.local`, pw);
  check("deactivated staff cannot sign in", r.status === 401, `${r.status}`);

  // ---------------------------------------------------------------- page access
  section("Roles: page access");
  const uth = await db.user.findUniqueOrThrow({ where: { email: "uth@pharmacore.local" } });
  const orderId = (await db.consignment.findFirstOrThrow({ where: { institutionId: uth.institutionId! } })).id;
  const productId = (await db.product.findFirstOrThrow({ where: { active: true } })).id;
  const takeId = (await db.stockTake.findFirst())?.id;
  const saleId = (await db.sale.findFirst())?.id;
  const pages: [string, Role[]][] = [
    ["/dashboard", [A, F, S]],
    ["/wholesale", [A, F, S]],
    ["/wholesale/payments", [A, F]],
    ["/wholesale/accounts", [A, F, S]], // finance: read-only
    [`/wholesale/${orderId}`, [A, F, S]],
    ["/pos", [A, S]],
    ["/inventory", [A, F, S]],
    [`/inventory/${productId}`, [A, F, S]],
    ["/inventory/deleted", [A, F, S]], // finance: read-only
    ["/stock-take", [A, F, S]], // finance: read-only
    ["/patients", [A, S]],
    ["/prescriptions", [A, S]],
    ["/sales", [A, F, S]],
    ["/purchases", [A, F, S]],
    ["/reports", [A, F]],
    ["/staff", [A]],
    ["/audit", [A, F, S]],
    ["/settings", [A, F, S]], // sales: read-only, no bank details
    ["/demo-requests", [A]],
    ["/portal", [B]],
    ["/portal/new", [B]],
    [`/portal/orders/${orderId}`, [B]],
  ];
  const makerUser = await db.user.findUniqueOrThrow({ where: { email: "medline@pharmacore.local" } });
  const ownPo = await db.purchaseOrder.findFirstOrThrow({ where: { supplierId: makerUser.supplierId! } });
  const otherPo = await db.purchaseOrder.findFirst({ where: { supplierId: { not: makerUser.supplierId! } } });
  pages.push(
    ["/purchases/new", [A, S]],
    ["/purchases/manufacturers", [A, F, S]], // finance: read-only
    [`/purchases/${ownPo.id}`, [A, F, S]],
    ["/supplier", [M]],
    [`/supplier/orders/${ownPo.id}`, [M]],
  );
  if (takeId) pages.push([`/stock-take/${takeId}`, [A, F, S]]);
  if (saleId) pages.push([`/documents/sales/${saleId}`, [A, F, S]]);
  for (const [url, allowed] of pages) {
    for (const role of [A, F, S, B, M] as Role[]) {
      const res = await all[role].page(url);
      const opened = res.status === 200 && res.path === url;
      const expected = allowed.includes(role);
      check(`${role.padEnd(7)} ${expected ? "opens" : "blocked from"} ${url}`, opened === expected, `got ${res.status} at ${res.path}`);
    }
    check(`signed-out visitor sent to sign-in from ${url}`, (await anon.page(url)).path.startsWith("/login"));
  }

  const controls: [string, string, Role[]][] = [
    ["/inventory", "Add item", [A, S]],
    ["/settings", "Save", [A, F]],
    ["/purchases", "New purchase order", [A, S]],
    ["/stock-take", "Finish stock take", [A, S]],
    ["/wholesale/accounts", "Create buyer account", [A, S]],
  ];
  for (const [url, label, allowed] of controls) {
    for (const role of [A, F, S] as Role[]) {
      const res = await all[role].page(url);
      if (res.path !== url) continue;
      const shown = res.html.includes(label);
      check(`${role.padEnd(7)} ${allowed.includes(role) ? "sees" : "does not see"} "${label}" on ${url}`, shown === allowed.includes(role));
    }
  }
  if (otherPo) {
    p = await maker.page(`/supplier/orders/${otherPo.id}`);
    check("a manufacturer cannot open another manufacturer's order", !(p.status === 200 && p.path === `/supplier/orders/${otherPo.id}`), `${p.status} ${p.path}`);
    const r2 = await maker.json("POST", `/api/purchases/${otherPo.id}/quote`, {});
    check("a manufacturer cannot price another manufacturer's order", r2.status === 404 || r2.status === 403, `${r2.status}`);
  }
  check("manufacturer header search shows no clients or patients", !(await maker.json("GET", "/api/search?q=a")).data.hits?.some((h: { group: string }) => ["Patients", "Wholesale", "Inventory"].includes(h.group)));
  p = await sales.page("/settings");
  check("SALES read-only company page hides bank details", !p.html.includes("Account number"));

  // ---------------------------------------------------------------- API guards (invalid bodies: only the guard decides)
  section("Roles: API permissions");
  const intakeId = (await db.stockIntake.findFirst())?.id ?? "x";
  const poId = (await db.purchaseOrder.findFirst())?.id ?? "x";
  const rxId = (await db.prescription.findFirst())?.id ?? "x";
  const demoId = (await db.demoRequest.findFirst())?.id ?? "x";
  const apis: [string, string, Role[]][] = [
    ["POST", "/api/staff", [A]],
    ["POST", "/api/wholesale/accounts", [A, S]],
    ["POST", "/api/consignments", [B]],
    ["POST", `/api/consignments/${orderId}/quote`, [A, F]],
    ["POST", `/api/consignments/${orderId}/invoice`, [A, F]],
    ["POST", `/api/consignments/${orderId}/delivery`, [A, S]],
    ["POST", `/api/consignments/${orderId}/status`, [A, S, B]],
    ["POST", "/api/sales", [A, S]],
    ["POST", "/api/patients", [A, S]],
    ["POST", "/api/prescriptions", [A, S]],
    ["POST", `/api/prescriptions/${rxId}/dispense`, [A, S]],
    ["POST", "/api/inventory/items", [A, S]],
    ["POST", `/api/inventory/items/${productId}`, [A, S]],
    ["POST", `/api/inventory/items/${productId}/delete`, [A, S]],
    ["POST", `/api/inventory/items/${productId}/restore`, [A, S]],
    ["POST", `/api/inventory/intake/${intakeId}`, [A, S]],
    ["POST", "/api/stock/receive", [A, S]],
    ["POST", "/api/stock-take", [A, S]],
    ["POST", `/api/purchases/${poId}/receive`, [A, S]],
    ["POST", "/api/pharmacy", [A, F]],
    ["POST", `/api/demo-requests/${demoId}/contacted`, [A]],
    ["GET", "/api/inventory/template", [A, S]],
    ["GET", "/api/lookup?kind=patients&q=", [A, F, S]],
  ];
  apis.push(
    ["POST", "/api/manufacturers", [A, S]],
    ["POST", "/api/purchases", [A, S]],
    ["POST", `/api/purchases/${ownPo.id}/quote`, [A, F, M]],
    ["POST", `/api/purchases/${ownPo.id}/invoice`, [A, F, M]],
    ["POST", `/api/purchases/${ownPo.id}/payment`, [A, F]],
    ["POST", `/api/purchases/${ownPo.id}/dispatch`, [M]],
    ["POST", `/api/purchases/${ownPo.id}/status`, [A, F, S, M]],
    ["POST", `/api/purchases/${ownPo.id}/receive`, [A, S]],
  );
  if (takeId) apis.push(["GET", `/api/stock-take/${takeId}/report?show=all`, [A, F, S]]);
  for (const [method, url, allowed] of apis) {
    for (const role of [A, F, S, B, M] as Role[]) {
      const res = method === "POST" ? await all[role].req("POST", url, undefined, { data: "{}", type: "application/json" }) : await all[role].req("GET", url);
      const denied = res.status === 401 || res.status === 403;
      check(`${role.padEnd(7)} ${allowed.includes(role) ? "allowed" : "denied"} ${method} ${url.split("?")[0]}`, denied !== allowed.includes(role), `got ${res.status} ${res.text.slice(0, 60)}`);
    }
    const res = method === "POST" ? await anon.req("POST", url, undefined, { data: "{}", type: "application/json" }) : await anon.req("GET", url);
    check(`signed-out visitor denied ${method} ${url.split("?")[0]}`, res.status === 401, `got ${res.status}`);
  }
  r = await buyer.json("GET", "/api/lookup?kind=products&q=");
  check("client product search hides price and stock", r.status === 200 && !r.data.results.some((x: object) => "price" in x || "stock" in x));
  r = await finance.json("GET", "/api/search?q=pa");
  check("Finance header search shows no patients", r.status === 200 && !r.data.hits.some((h: { group: string }) => h.group === "Patients"));

  // ---------------------------------------------------------------- order rules
  section("Roles: order rules");
  const products = (await buyer.json("GET", "/api/lookup?kind=products&q=")).data.results.slice(0, 2);
  r = await buyer.json("POST", "/api/consignments", { items: products.map((x: { id: string }) => ({ productId: x.id, quantity: 2 })) });
  const oid = r.data.id as string;
  check("client places an order", r.status === 200 && oid, `${r.status}`);
  r = await finance.json("POST", "/api/consignments", { items: [{ productId: products[0].id, quantity: 1 }] });
  check("staff cannot place client orders", r.status === 403);
  const items = await db.consignmentItem.findMany({ where: { consignmentId: oid } });
  const quote = { lines: items.map((i) => ({ id: i.id, unitPrice: 10 })), taxRate: 16, readyOn: iso(3), validUntil: iso(14), adminMessage: "Ready Thursday" };
  check("SALES cannot send a price", (await sales.json("POST", `/api/consignments/${oid}/quote`, quote)).status === 403);
  check("client cannot accept before a price is sent", (await buyer.json("POST", `/api/consignments/${oid}/status`, { status: "ACCEPTED" })).status === 400);
  check("price with a past valid-until date refused", (await finance.json("POST", `/api/consignments/${oid}/quote`, { ...quote, validUntil: iso(-1) })).status === 400);
  check("FINANCE sends the price", (await finance.json("POST", `/api/consignments/${oid}/quote`, quote)).status === 200);
  check("FINANCE cannot move order status", (await finance.json("POST", `/api/consignments/${oid}/status`, { status: "PREPARING" })).status === 403);
  check("another client cannot accept this order", (await buyer2.json("POST", `/api/consignments/${oid}/status`, { status: "ACCEPTED" })).status === 404);
  p = await buyer2.page(`/portal/orders/${oid}`);
  check("another client cannot open this order", !(p.status === 200 && p.path === `/portal/orders/${oid}`), `${p.status} ${p.path}`);
  p = await buyer2.page(`/documents/${oid}/quotation`);
  check("another client cannot open this quotation", p.status === 404 || p.path !== `/documents/${oid}/quotation`);
  check("no invoice before the client accepts", (await finance.json("POST", `/api/consignments/${oid}/invoice`, { dueOn: iso(30), amountPaid: 0 })).status === 400);
  check("client accepts the price", (await buyer.json("POST", `/api/consignments/${oid}/status`, { status: "ACCEPTED" })).status === 200);
  check("client cannot cancel after accepting", (await buyer.json("POST", `/api/consignments/${oid}/status`, { status: "CANCELLED" })).status === 400);

  r = await finance.json("POST", `/api/consignments/${oid}/quote`, { ...quote, lines: items.map((i) => ({ id: i.id, unitPrice: 99 })) });
  let order = await db.consignment.findUniqueOrThrow({ where: { id: oid } });
  check("changing an accepted price sends it back to the client", r.status === 200 && order.status === "QUOTED", `${r.status} ${order.status}`);
  check("client accepts the new price", (await buyer.json("POST", `/api/consignments/${oid}/status`, { status: "ACCEPTED" })).status === 200);
  check("SALES cannot issue invoices", (await sales.json("POST", `/api/consignments/${oid}/invoice`, { dueOn: iso(-1), amountPaid: 0 })).status === 403);
  r = await finance.json("POST", `/api/consignments/${oid}/invoice`, { dueOn: iso(-1), amountPaid: 0 });
  check("FINANCE issues the invoice", r.status === 200 && r.data.invoiceNo, `${r.status}`);
  check("price is locked once invoiced", (await finance.json("POST", `/api/consignments/${oid}/quote`, quote)).status === 400);
  check("payment above the total refused", (await finance.json("POST", `/api/consignments/${oid}/invoice`, { dueOn: iso(-1), amountPaid: 999999 })).status === 400);
  for (const role of [A, F, S, B] as Role[]) {
    p = await all[role].page(`/documents/${oid}/invoice`);
    check(`${role.padEnd(7)} opens the invoice document`, p.status === 200 && p.path === `/documents/${oid}/invoice`, `${p.status} ${p.path}`);
  }
  check("FINANCE cannot issue delivery notes", (await finance.json("POST", `/api/consignments/${oid}/delivery`, { lines: items.map((i) => ({ id: i.id, qtyDelivered: 2 })), deliveryMethod: "Van" })).status === 403);
  check("no delivery note before preparing", (await sales.json("POST", `/api/consignments/${oid}/delivery`, { lines: items.map((i) => ({ id: i.id, qtyDelivered: 2 })), deliveryMethod: "Van" })).status === 400);
  check("SALES moves the order to Preparing", (await sales.json("POST", `/api/consignments/${oid}/status`, { status: "PREPARING" })).status === 200);
  check("SALES cannot skip to Delivered", (await sales.json("POST", `/api/consignments/${oid}/status`, { status: "DELIVERED" })).status === 400);
  check("SALES moves the order to Ready", (await sales.json("POST", `/api/consignments/${oid}/status`, { status: "READY" })).status === 200);
  check("cannot dispatch without a delivery note", (await sales.json("POST", `/api/consignments/${oid}/status`, { status: "DISPATCHED" })).status === 400);

  const cancel = await buyer.json("POST", "/api/consignments", { items: [{ productId: products[0].id, quantity: 1 }] });
  check("client cancels a new order", (await buyer.json("POST", `/api/consignments/${cancel.data.id}/status`, { status: "CANCELLED" })).status === 200);
  const decline = await buyer.json("POST", "/api/consignments", { items: [{ productId: products[0].id, quantity: 1 }] });
  check("SALES declines a new order", (await sales.json("POST", `/api/consignments/${decline.data.id}/status`, { status: "DECLINED" })).status === 200);
  check("FINANCE cannot ring up a sale", (await finance.json("POST", "/api/sales", { items: [{ productId, quantity: 1 }] })).status === 403);
  check("FINANCE cannot add patients", (await finance.json("POST", "/api/patients", { firstName: "T", lastName: "N" })).status === 403);
  check("SALES cannot edit company details", (await sales.json("POST", "/api/pharmacy", { name: "Hacked" })).status === 403);
  order = await db.consignment.findUniqueOrThrow({ where: { id: oid } });
}

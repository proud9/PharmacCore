/**
 * The whole business, from an empty installation, in the order it happens:
 * owner sets up → admin adds staff → sales stocks the warehouse and adds clients → clients order →
 * finance prices → client accepts → finance invoices → sales prepares, issues the delivery note and
 * dispatches (stock leaves) → client receives → finance records payment → retail counter, dispensing
 * and a stock take → admin reviews the activity log. Every page each person opens is checked for
 * raw codes and wording problems.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { Client, ROOT, check, iso, note, scanLabels, section, visibleText } from "./harness";

const WORDING = [/\bthe pharmacy\b/gi, /\bpharmacy details\b/gi, /\bPOS\b/g, /\bconsignments?\b/gi, /\bpharmacist\b/gi];

export async function workflowSuite(base: string, db: PrismaClient) {
  const pw = "Passw0rd!";
  const visitor = new Client(base, "visitor");

  async function look(who: Client, url: string, expectText?: string | RegExp) {
    const res = await who.page(url);
    const ok = res.status === 200 && res.path === url.split("#")[0];
    if (!ok) check(`${who.label} opens ${url}`, false, `got ${res.status} at ${res.path}`);
    if (expectText) {
      const text = visibleText(res.html);
      const found = typeof expectText === "string" ? text.includes(expectText) : expectText.test(text);
      check(`${who.label} sees "${expectText}" on ${url}`, found, text.slice(0, 160));
    }
    scanLabels(who.label, url, res.html, WORDING);
    return res;
  }

  const onHand = async (sku: string) => {
    const product = await db.product.findUniqueOrThrow({ where: { sku }, include: { batches: true } });
    return product.batches.reduce((sum, b) => sum + b.quantity, 0);
  };

  // ------------------------------------------------------------------ 1. Owner sets up
  section("Workflow 1: owner sets up the installation");
  let res = await visitor.page("/");
  check("landing page sends 'Create an account' to set-up before installation", res.html.includes('href="/setup"'));
  let r = await visitor.json("POST", "/api/auth/register", { name: "Early", institutionName: "Early Bird", kind: "PHARMACY", email: "early@test.local", password: pw });
  check("client sign-up waits until the wholesale is set up", r.status === 409, `${r.status}`);
  check("set-up page opens", (await visitor.page("/setup")).path === "/setup");

  const owner = new Client(base, "Admin");
  r = await owner.json("POST", "/api/setup", {
    owner: { name: "Mutale Owner", email: "owner@kilmers.test", password: pw },
    company: { name: "Kilmers Medical Supplies", phone: "+260 977 123456", address: "Plot 12, Cairo Road, Lusaka", email: "orders@kilmers.test", license: "ZAMRA-W-0192", tpin: "1002003004" },
  });
  check("owner completes set-up and is signed in", [200, 201].includes(r.status) && owner.cookie, `${r.status} ${JSON.stringify(r.data)}`);
  await look(owner, "/dashboard", "Finish setting up");
  const logo = readFileSync(path.join(ROOT, "public", "brand", "parallax-logo-64.png"));
  const form = new FormData();
  form.append("logo", new Blob([logo], { type: "image/png" }), "logo.png");
  const up = await owner.req("POST", "/api/pharmacy/logo", undefined, { data: form });
  check("owner uploads the company logo", up.status === 200, `${up.status} ${up.text.slice(0, 80)}`);
  r = await owner.json("POST", "/api/pharmacy", { name: "Kilmers Medical Supplies", bankName: "Zanaco", accountName: "Kilmers Medical Supplies Ltd", accountNumber: "0123456789012", bankBranch: "Cairo Road", swiftCode: "ZNCOZMLU" });
  check("owner saves bank details", r.status === 200, `${r.status}`);
  res = await look(owner, "/dashboard");
  check("set-up reminder disappears once logo and bank are in", !visibleText(res.html).includes("Finish setting up"));
  check("second set-up is refused", (await visitor.json("POST", "/api/setup", { owner: { name: "X", email: "x@test.local", password: pw }, company: { name: "X Co", phone: "0977000000", address: "Somewhere 1" } })).status === 409);

  // ------------------------------------------------------------------ 2. Admin adds the team
  section("Workflow 2: admin adds Finance and Sales");
  r = await owner.json("POST", "/api/staff", { name: "Chanda Finance", email: "chanda@kilmers.test", password: pw, role: "FINANCE" });
  check("admin adds a Finance person", r.status === 200, `${r.status}`);
  r = await owner.json("POST", "/api/staff", { name: "Noah Sales", email: "noah@kilmers.test", password: pw, role: "SALES" });
  check("admin adds a Sales person", r.status === 200, `${r.status}`);
  await look(owner, "/staff", "Chanda Finance");
  const finance = new Client(base, "Finance");
  const sales = new Client(base, "Sales");
  check("Finance signs in to Payments", (await finance.login("chanda@kilmers.test", pw)).data.home === "/wholesale/payments");
  check("Sales signs in to Wholesale orders", (await sales.login("noah@kilmers.test", pw)).data.home === "/wholesale");

  // ------------------------------------------------------------------ 3. Sales stocks the warehouse
  section("Workflow 3: Sales stocks the warehouse");
  await look(sales, "/wholesale");
  await look(sales, "/inventory");
  r = await sales.json("POST", "/api/inventory/items", {
    rows: [
      { row: 1, input: { stockCode: "AMX-500", description: "Amoxicillin 500 mg capsules", type: "OTC", unit: "Box of 100", price: 85, batchNo: "AMX24A", openingStock: 200, expiry: iso(400), requiresRx: true } },
      { row: 2, input: { stockCode: "MOR-10", description: "Morphine 10 mg tablets", type: "DDA", unit: "Box of 30", price: 240, batchNo: "MOR01", openingStock: 20, expiry: iso(300), requiresRx: true } },
      { row: 3, input: { stockCode: "GLV-M", description: "Examination gloves (M)", type: "OTC", unit: "Box of 100", price: 120, batchNo: "GLV9", openingStock: 500, expiry: iso(700) } },
    ],
  });
  check("Sales adds three items with opening stock", r.status === 200 && (await db.product.count()) === 3, `${r.status} ${JSON.stringify(r.data).slice(0, 160)}`);
  const csv = "Stock code,Ctg no.,Batch no.,Description,Type,Unit sale,Price,Prescription,Opening stock,Entered,Expiry\n" +
    `PCM-500,10,PCM77,Paracetamol 500 mg tablets,OTC,Box of 1000,150,Not required,300,${iso(0)},${iso(500)}\n` +
    `ORS-1,11,ORS5,Oral rehydration salts,OTC,Box of 50,60,Not required,5,${iso(0)},${iso(200)}\n`;
  const upload = new FormData();
  upload.append("file", new Blob([csv], { type: "text/csv" }), "items.csv");
  const imp = await sales.req("POST", "/api/inventory/import", undefined, { data: upload });
  check("Sales imports two more items from a CSV", imp.status === 200 && (await db.product.count()) === 5, `${imp.status} ${imp.text.slice(0, 160)}`);
  check("template downloads for Sales", (await sales.req("GET", "/api/inventory/template")).status === 200);
  const amx = await db.product.findUniqueOrThrow({ where: { sku: "AMX-500" } });
  r = await sales.json("POST", "/api/stock/receive", { productId: amx.id, lotNumber: "AMX24B", expiryDate: iso(500), quantity: 100 });
  check("Sales receives a new Amoxicillin batch", r.status === 200 && (await onHand("AMX-500")) === 300, `${r.status} on hand ${await onHand("AMX-500")}`);
  await look(sales, `/inventory/${amx.id}`, "AMX24B");
  const gloves = await db.product.findUniqueOrThrow({ where: { sku: "GLV-M" } });
  r = await sales.json("POST", `/api/inventory/items/${gloves.id}`, { stockCode: "GLV-M", description: "Examination gloves (M)", type: "OTC", unit: "Box of 100", price: 125, currentStock: 500, reason: "Supplier price rise" });
  check("Sales corrects an item's price with a reason", r.status === 200 && (await db.product.findUniqueOrThrow({ where: { id: gloves.id } })).sellingPrice === 125, `${r.status} ${JSON.stringify(r.data)}`);
  const ors = await db.product.findUniqueOrThrow({ where: { sku: "ORS-1" } });
  check("Sales moves an item to the delete queue", (await sales.json("POST", `/api/inventory/items/${ors.id}/delete`, { reason: "Entered twice", confirm: true })).status === 200);
  await look(sales, "/inventory/deleted", "Oral rehydration salts");
  check("Sales restores it", (await sales.json("POST", `/api/inventory/items/${ors.id}/restore`, {})).status === 200);
  res = await look(sales, "/purchases", "New purchase order");
  r = await sales.json("POST", "/api/wholesale/accounts", { name: "Levy Mwanawasa Hospital", kind: "HOSPITAL", contact: "Pharmacy stores", phone: "+260 211 000000", buyerName: "Ruth Zulu", buyerEmail: "ruth@lmh.test", buyerPassword: pw });
  check("Sales opens an account for a hospital", r.status === 200, `${r.status}`);
  await look(sales, "/wholesale/accounts", "Levy Mwanawasa Hospital");

  // ------------------------------------------------------------------ 3b. Buying from a manufacturer
  section("Workflow 3b: Sales orders from a manufacturer");
  r = await sales.json("POST", "/api/manufacturers", {
    name: "Apex Pharmaceuticals",
    contact: "Order desk",
    phone: "+260 211 555000",
    email: "orders@apex.test",
    loginName: "Apex Order Desk",
    loginEmail: "desk@apex.test",
    loginPassword: pw,
  });
  check("Sales adds a manufacturer with a login", r.status === 200 || r.status === 201, `${r.status} ${JSON.stringify(r.data)}`);
  check("Finance cannot add manufacturers", (await finance.json("POST", "/api/manufacturers", { name: "Nope Ltd" })).status === 403);
  await look(sales, "/purchases/manufacturers", "Apex Pharmaceuticals");
  const apexSupplier = await db.supplier.findFirstOrThrow({ where: { name: "Apex Pharmaceuticals" } });
  const pcmItem = await db.product.findUniqueOrThrow({ where: { sku: "PCM-500" } });
  const amxItem = await db.product.findUniqueOrThrow({ where: { sku: "AMX-500" } });
  const poLines = [
    { productId: pcmItem.id, quantity: 400, unitCost: 95 },
    { productId: amxItem.id, quantity: 150, unitCost: 55 },
  ];
  check("Finance cannot raise purchase orders", (await finance.json("POST", "/api/purchases", { supplierId: apexSupplier.id, lines: poLines })).status === 403);
  await look(sales, "/purchases/new");
  r = await sales.json("POST", "/api/purchases", { supplierId: apexSupplier.id, notes: "Monthly restock", lines: poLines });
  const poId = r.data.id as string;
  check("Sales raises a purchase order", r.status === 200 && poId, `${r.status} ${JSON.stringify(r.data)}`);
  await look(sales, "/purchases", "Waiting for price");
  await look(sales, `/purchases/${poId}`, "Apex Pharmaceuticals");

  const apex = new Client(base, "Manufacturer");
  r = await apex.login("desk@apex.test", pw);
  check("manufacturer signs in to their portal", r.status === 200 && r.data.home === "/supplier", `${r.status} ${JSON.stringify(r.data)}`);
  await look(apex, "/supplier", "New order");
  await look(apex, `/supplier/orders/${poId}`, "Paracetamol");
  check("manufacturer is kept out of the wholesale console", (await apex.page("/wholesale")).path === "/supplier");
  check("manufacturer cannot see clients' orders", (await apex.json("POST", "/api/consignments", { items: [{ productId: pcmItem.id, quantity: 1 }] })).status === 403);
  const poItems = await db.purchaseOrderItem.findMany({ where: { orderId: poId }, include: { product: true } });
  const poQuote = { lines: poItems.map((i) => ({ id: i.id, unitCost: i.product.sku === "PCM-500" ? 92 : 54 })), taxRate: 0, readyOn: iso(5), validUntil: iso(20), message: "Ready from our Ndola plant." };
  check("Sales cannot enter a manufacturer's price", (await sales.json("POST", `/api/purchases/${poId}/quote`, poQuote)).status === 403);
  r = await apex.json("POST", `/api/purchases/${poId}/quote`, poQuote);
  check("manufacturer sends its price", r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  await look(finance, `/purchases/${poId}`, "Price received");
  check("Sales cannot accept a manufacturer's price", (await sales.json("POST", `/api/purchases/${poId}/status`, { status: "ACCEPTED" })).status === 403);
  r = await finance.json("POST", `/api/purchases/${poId}/status`, { status: "ACCEPTED" });
  check("Finance accepts the price", r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  r = await apex.json("POST", `/api/purchases/${poId}/invoice`, { invoiceNo: "APX-INV-0077", dueOn: iso(30), terms: "30 days" });
  check("manufacturer issues its invoice", r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  const pcmBeforePo = await onHand("PCM-500");
  const amxBeforePo = await onHand("AMX-500");
  check("Sales cannot record the manufacturer's dispatch", (await sales.json("POST", `/api/purchases/${poId}/dispatch`, { deliveryNoteNo: "X", lines: poItems.map((i) => ({ id: i.id, quantity: i.quantity })) })).status === 403);
  r = await apex.json("POST", `/api/purchases/${poId}/dispatch`, { deliveryNoteNo: "APX-DN-0012", deliveryMethod: "Truck", lines: poItems.map((i) => ({ id: i.id, quantity: i.quantity })) });
  check("manufacturer dispatches with a delivery note", r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  await look(sales, "/purchases", "On the way");
  r = await sales.json("POST", `/api/purchases/${poId}/receive`, { deliveryNoteNo: "APX-DN-0012", lines: poItems.map((i) => ({ itemId: i.id, quantity: i.quantity })) });
  check("Sales receives the delivery", r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  const intakes = await db.stockIntake.findMany({ where: { purchaseOrderId: poId, status: "PENDING" }, include: { product: true } });
  check("delivered lines wait in the Inventory queue, no stock added yet", intakes.length === 2 && (await onHand("PCM-500")) === pcmBeforePo, `${intakes.length} pending`);
  await look(sales, "/inventory", "APX-DN-0012");
  for (const intake of intakes) {
    const product = intake.product!;
    r = await sales.json("POST", `/api/inventory/intake/${intake.id}`, {
      stockCode: product.sku,
      categoryNo: product.categoryNo ?? undefined,
      description: product.name,
      type: product.controlled ? "DDA" : "OTC",
      unit: product.unit,
      price: product.sellingPrice,
      quantity: intake.quantity,
      lotNumber: `APX-${product.sku}`,
      expiry: iso(720),
    });
    check(`Sales completes the ${product.name} delivery line`, r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  }
  check("completed lines add the stock", (await onHand("PCM-500")) === pcmBeforePo + 400 && (await onHand("AMX-500")) === amxBeforePo + 150, `PCM ${pcmBeforePo}→${await onHand("PCM-500")}, AMX ${amxBeforePo}→${await onHand("AMX-500")}`);
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
  check("purchase order is marked received", po.status === "RECEIVED", po.status);
  check("Sales cannot record supplier payments", (await sales.json("POST", `/api/purchases/${poId}/payment`, { amountPaid: 10 })).status === 403);
  check("Finance records a part payment to the manufacturer", (await finance.json("POST", `/api/purchases/${poId}/payment`, { amountPaid: 20000 })).status === 200);
  check("overpaying the manufacturer is refused", (await finance.json("POST", `/api/purchases/${poId}/payment`, { amountPaid: (po.quotedAmount ?? 0) + 1 })).status === 400);
  check("Finance records full payment", (await finance.json("POST", `/api/purchases/${poId}/payment`, { amountPaid: po.quotedAmount })).status === 200);
  await look(finance, `/purchases/${poId}`, "APX-INV-0077");
  await look(apex, `/supplier/orders/${poId}`, /Paid|paid/);

  // ------------------------------------------------------------------ 4. Clients order
  section("Workflow 4: clients place orders");
  const pharmacy = new Client(base, "Client");
  r = await pharmacy.json("POST", "/api/auth/register", { name: "Grace Banda", institutionName: "Banda Community Pharmacy", kind: "PHARMACY", email: "grace@banda.test", password: pw });
  check("a pharmacy signs itself up", [200, 201].includes(r.status), `${r.status}`);
  res = await look(pharmacy, "/portal");
  check("client search reads 'Search orders, wholesalers'", res.html.includes("Search orders, wholesalers"));
  r = await pharmacy.json("GET", "/api/search?q=kilmers");
  check("client search finds the wholesaler", r.data.hits?.some((h: { group: string }) => h.group === "Wholesaler"), JSON.stringify(r.data));
  await look(pharmacy, "/portal/new");
  const found = (await pharmacy.json("GET", "/api/lookup?kind=products&q=amox")).data.results;
  const glovesHit = (await pharmacy.json("GET", "/api/lookup?kind=products&q=glove")).data.results;
  check("client finds products by name", found.length === 1 && glovesHit.length === 1);
  r = await pharmacy.json("POST", "/api/consignments", { deliveryAddress: "Banda Pharmacy, Chilenje", notes: "Before month end", items: [{ productId: found[0].id, quantity: 40 }, { productId: glovesHit[0].id, quantity: 10 }] });
  const orderId = r.data.id as string;
  check("pharmacy orders Amoxicillin and gloves", r.status === 200 && orderId, `${r.status}`);
  await look(pharmacy, `/portal/orders/${orderId}`, "Requested");

  const hospital = new Client(base, "Hospital");
  check("hospital signs in with the login Sales made", (await hospital.login("ruth@lmh.test", pw)).status === 200);
  r = await hospital.json("POST", "/api/consignments", { items: [{ productId: glovesHit[0].id, quantity: 50 }] });
  const hospitalOrder = r.data.id as string;
  check("hospital orders gloves", r.status === 200);

  // ------------------------------------------------------------------ 5. Finance prices
  section("Workflow 5: Finance sends prices");
  await look(finance, "/wholesale/payments", "Nothing is owed");
  await look(finance, "/wholesale", "Banda Community Pharmacy");
  res = await look(finance, `/wholesale/${orderId}`, "Send a quotation");
  check("quote form suggests a valid-until date", /name="validUntil"[^>]*value="\d{4}-\d{2}-\d{2}"/.test(res.html) || /value="\d{4}-\d{2}-\d{2}"[^>]*name="validUntil"/.test(res.html));
  const lines = await db.consignmentItem.findMany({ where: { consignmentId: orderId }, include: { product: true } });
  const quote = { lines: lines.map((l) => ({ id: l.id, unitPrice: l.product.sellingPrice })), taxRate: 16, readyOn: iso(2), validUntil: iso(14), adminMessage: "Ready for collection or delivery on Thursday." };
  r = await finance.json("POST", `/api/consignments/${orderId}/quote`, quote);
  const expected = Math.round((40 * 85 + 10 * 125) * 1.16 * 100) / 100;
  let order = await db.consignment.findUniqueOrThrow({ where: { id: orderId } });
  check("Finance prices the pharmacy order (tax included)", r.status === 200 && Math.abs((order.quotedAmount ?? 0) - expected) < 0.01, `${r.status} ${order.quotedAmount} vs ${expected}`);
  const hl = await db.consignmentItem.findMany({ where: { consignmentId: hospitalOrder } });
  check("Finance prices the hospital order", (await finance.json("POST", `/api/consignments/${hospitalOrder}/quote`, { ...quote, lines: hl.map((l) => ({ id: l.id, unitPrice: 110 })) })).status === 200);
  await look(finance, `/documents/${orderId}/quotation`, "Kilmers Medical Supplies");

  // ------------------------------------------------------------------ 6. Clients respond
  section("Workflow 6: clients respond to prices");
  await look(pharmacy, `/portal/orders/${orderId}`, "Price sent");
  await look(pharmacy, `/documents/${orderId}/quotation`);
  check("pharmacy accepts the price", (await pharmacy.json("POST", `/api/consignments/${orderId}/status`, { status: "ACCEPTED" })).status === 200);
  check("hospital cancels its order", (await hospital.json("POST", `/api/consignments/${hospitalOrder}/status`, { status: "CANCELLED" })).status === 200);

  // ------------------------------------------------------------------ 7. Finance invoices
  section("Workflow 7: Finance invoices");
  res = await look(finance, `/wholesale/${orderId}`, "Change the price");
  check("change-the-price form keeps the ready date already sent", res.html.includes(`value="${iso(2)}"`));
  r = await finance.json("POST", `/api/consignments/${orderId}/invoice`, { dueOn: iso(30), amountPaid: 0, terms: "Payment within 30 days" });
  check("Finance issues the invoice", r.status === 200 && r.data.invoiceNo, `${r.status}`);
  const invoiceNo = r.data.invoiceNo as string;
  await look(finance, "/wholesale/payments", invoiceNo);
  res = await look(pharmacy, `/documents/${orderId}/invoice`, invoiceNo);
  check("client's invoice shows the bank account to pay into", visibleText(res.html).includes("0123456789012"));

  // ------------------------------------------------------------------ 8. Sales fulfils
  section("Workflow 8: Sales prepares, issues the delivery note and dispatches");
  const amxBefore = await onHand("AMX-500");
  const glvBefore = await onHand("GLV-M");
  check("Sales starts preparing", (await sales.json("POST", `/api/consignments/${orderId}/status`, { status: "PREPARING" })).status === 200);
  await look(sales, `/wholesale/${orderId}`, "Issue delivery note");
  r = await sales.json("POST", `/api/consignments/${orderId}/delivery`, { lines: lines.map((l) => ({ id: l.id, qtyDelivered: l.product.sku === "GLV-M" ? 8 : l.quantity, remarks: l.product.sku === "GLV-M" ? "2 boxes to follow" : "" })), deliveryMethod: "Company van", vehicleDriver: "ABZ 1234 · J. Phiri", dispatchFrom: "Main warehouse" });
  check("Sales issues the delivery note (8 of 10 gloves)", r.status === 200 && r.data.deliveryNoteNo, `${r.status}`);
  check("Sales marks the order ready", (await sales.json("POST", `/api/consignments/${orderId}/status`, { status: "READY" })).status === 200);
  check("stock is untouched until dispatch", (await onHand("AMX-500")) === amxBefore && (await onHand("GLV-M")) === glvBefore);
  check("Sales dispatches", (await sales.json("POST", `/api/consignments/${orderId}/status`, { status: "DISPATCHED" })).status === 200);
  check("dispatch takes the delivered quantities off stock", (await onHand("AMX-500")) === amxBefore - 40 && (await onHand("GLV-M")) === glvBefore - 8, `AMX ${amxBefore}→${await onHand("AMX-500")}, GLV ${glvBefore}→${await onHand("GLV-M")}`);
  check("delivery note is locked after dispatch", (await sales.json("POST", `/api/consignments/${orderId}/delivery`, { lines: lines.map((l) => ({ id: l.id, qtyDelivered: 1 })), deliveryMethod: "Van" })).status === 400);
  await look(pharmacy, `/documents/${orderId}/delivery`, "2 boxes to follow");
  check("Sales marks it delivered", (await sales.json("POST", `/api/consignments/${orderId}/status`, { status: "DELIVERED" })).status === 200);
  await look(pharmacy, `/portal/orders/${orderId}`, "Delivered");

  // ------------------------------------------------------------------ 9. Finance collects
  section("Workflow 9: Finance records payment");
  order = await db.consignment.findUniqueOrThrow({ where: { id: orderId } });
  check("part payment recorded", (await finance.json("POST", `/api/consignments/${orderId}/invoice`, { dueOn: iso(30), amountPaid: 1000 })).status === 200);
  await look(pharmacy, `/portal/orders/${orderId}`, /Balance|balance/);
  check("full payment recorded", (await finance.json("POST", `/api/consignments/${orderId}/invoice`, { dueOn: iso(30), amountPaid: order.quotedAmount })).status === 200);
  res = await look(finance, "/wholesale/payments?view=all", invoiceNo);
  await look(finance, "/reports");
  await look(finance, "/sales");
  await look(finance, "/inventory");
  await look(finance, "/audit");
  check("Finance sees the bank details to edit", (await look(finance, "/settings")).html.includes("Zanaco"));

  // ------------------------------------------------------------------ 10. Retail counter
  section("Workflow 10: Sales at the counter");
  r = await sales.json("POST", "/api/patients", { firstName: "Joseph", lastName: "Mwale", phone: "+260 966 000111", allergies: "Penicillin" });
  const patientId = r.data.id as string;
  check("Sales adds a patient", r.status === 200 && patientId);
  await look(sales, "/patients", "Mwale");
  const mor = await db.product.findUniqueOrThrow({ where: { sku: "MOR-10" } });
  r = await sales.json("POST", "/api/prescriptions", { patientId, prescriber: "Dr K. Banda", clinic: "UTH", items: [{ productId: mor.id, quantity: 2, instructions: "One at night" }] });
  check("Sales records a prescription", r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
  const rx = await db.prescription.findFirstOrThrow({ where: { patientId } });
  const morBefore = await onHand("MOR-10");
  check("Sales dispenses it", (await sales.json("POST", `/api/prescriptions/${rx.id}/dispense`, {})).status === 200);
  check("dispensing takes stock off", (await onHand("MOR-10")) === morBefore - 2);
  await look(sales, "/prescriptions", "Dispensed");
  const pcm = await db.product.findUniqueOrThrow({ where: { sku: "PCM-500" } });
  const pcmBefore = await onHand("PCM-500");
  r = await sales.json("POST", "/api/sales", { payment: "MOBILE", items: [{ productId: pcm.id, quantity: 3 }] });
  check("Sales rings up a counter sale", r.status === 200 && (await onHand("PCM-500")) === pcmBefore - 3, `${r.status}`);
  await look(sales, `/documents/sales/${r.data.id}`, "Paracetamol");
  await look(sales, "/pos");
  await look(sales, "/sales");

  // ------------------------------------------------------------------ 11. Stock take
  section("Workflow 11: Sales counts stock");
  await look(sales, "/stock-take");
  const counted = (await onHand("GLV-M")) - 3;
  r = await sales.json("POST", "/api/stock-take", { notes: "Month-end count", applyAdjustments: true, items: [{ productId: gloves.id, countedQty: counted }] });
  check("Sales finishes a stock take with one short item", r.status === 200 && (await onHand("GLV-M")) === counted, `${r.status}`);
  await look(sales, `/stock-take/${r.data.id}`, "Examination gloves");
  check("stock take report downloads", (await sales.req("GET", `/api/stock-take/${r.data.id}/report?show=moved`)).status === 200);

  // ------------------------------------------------------------------ 12. Admin reviews
  section("Workflow 12: admin reviews the day");
  for (const url of ["/dashboard", "/wholesale", "/wholesale/payments", "/reports", "/inventory", "/sales", "/purchases", "/settings", "/demo-requests"]) await look(owner, url);
  res = await look(owner, "/audit");
  const actions = new Set((await db.auditLog.findMany({ select: { action: true } })).map((a) => a.action));
  for (const action of ["PO_SENT", "PO_QUOTED", "PO_INVOICED", "PO_DISPATCHED", "PO_RECEIVED", "PO_PAYMENT", "WHOLESALE_SET_UP", "STAFF_CREATED", "BUYER_ACCOUNT_CREATED", "ACCOUNT_CREATED", "CONSIGNMENT_QUOTED", "CONSIGNMENT_STATUS", "INVOICE_ISSUED", "PAYMENT_RECORDED", "DELIVERY_NOTE_ISSUED", "SALE_COMPLETED", "RX_DISPENSED", "STOCK_TAKE"]) {
    check(`activity log records ${action}`, actions.has(action), [...actions].join(", "));
  }
  for (const [who, client] of [["Hospital", hospital], ["Client", pharmacy]] as const) {
    for (const url of ["/portal", "/portal/new"]) await look(client, url);
    void who;
  }
}

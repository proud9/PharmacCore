/**
 * Demo data: a small trading network with every account type.
 * Runs as the database owner (DIRECT_URL), so row-level security doesn't apply here.
 * Every login's password is DEMO_PASSWORD; the logins are listed in README.md.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addMonths, subDays } from "date-fns";
import { loadEnv } from "../scripts/db";
import { withCrypto } from "../lib/db";

loadEnv();
const raw = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const db = withCrypto(raw);

export const DEMO_PASSWORD = "Parallax2026!";

type Kind = "MANUFACTURER" | "WHOLESALER" | "RETAILER" | "CLIENT";

let counter = 0;
function no(prefix: string) {
  counter += 1;
  return `${prefix}-${String(1000 + counter)}`;
}

async function main() {
  const tables = await raw.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'`,
  );
  if (tables.length) {
    await raw.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // The Parallax team
  await db.user.create({ data: { email: "team@parallax.local", name: "Parallax Team", passwordHash, role: "ADMIN" } });

  async function business(input: {
    kind: Kind;
    name: string;
    town: string;
    login: string;
    person: string;
    periodEnd?: Date | null;
    trial?: boolean;
    bank?: boolean;
    listed?: boolean;
    terms?: string;
  }) {
    const org = await db.organization.create({
      data: {
        kind: input.kind,
        name: input.name,
        town: input.town,
        address: `Plot ${10 + counter}, ${input.town}`,
        phone: "+260 211 555 100",
        email: input.login,
        listed: input.listed ?? input.kind !== "CLIENT",
        defaultPaymentTerms: input.terms ?? "ON_DELIVERY",
        licenceNo: input.kind === "CLIENT" ? null : `ZAMRA-${input.kind.slice(0, 2)}-${4000 + counter}`,
        tpin: `100${2000000 + counter}`,
        ...(input.bank === false
          ? {}
          : {
              bankName: "Zanaco",
              accountName: input.name,
              accountNumber: `01234567${8000 + counter}`,
              bankBranch: input.town,
              swiftCode: "ZNCOZMLU",
            }),
      },
    });
    if (input.kind !== "CLIENT") {
      const end = input.periodEnd ?? addDays(new Date(), 300);
      await db.subscription.create({
        data: {
          orgId: org.id,
          plan: input.trial ? "TRIAL" : "STANDARD",
          trialEndsAt: input.trial ? end : null,
          periodEnd: end,
        },
      });
    }
    const user = await db.user.create({
      data: { email: input.login, name: input.person, passwordHash, role: input.kind, orgId: org.id },
    });
    return { org, user };
  }

  const zpi = await business({ kind: "MANUFACTURER", name: "Zambia Pharma Industries", town: "Lusaka", login: "zpi@parallax.local", person: "Mwila Banda" });
  const apex = await business({
    kind: "MANUFACTURER",
    name: "Apex Generics",
    town: "Ndola",
    login: "apex@parallax.local",
    person: "Tomás Silva",
    periodEnd: subDays(new Date(), 40), // overdue: read-only
  });
  const kilmers = await business({ kind: "WHOLESALER", name: "Kilmer's Medical Wholesale", town: "Lusaka", login: "kilmers@parallax.local", person: "Chanda Mulenga", terms: "CREDIT" });
  const copper = await business({
    kind: "WHOLESALER",
    name: "Copperbelt Medical Supplies",
    town: "Kitwe",
    login: "copperbelt@parallax.local",
    person: "Grace Phiri",
    periodEnd: subDays(new Date(), 5), // payment due: in the grace period
  });
  const central = await business({ kind: "RETAILER", name: "Lusaka Central Pharmacy", town: "Lusaka", login: "central@parallax.local", person: "Noah Tembo" });
  const kabwe = await business({ kind: "RETAILER", name: "Kabwe Family Pharmacy", town: "Kabwe", login: "kabwe@parallax.local", person: "Ruth Zulu", trial: true, periodEnd: addDays(new Date(), 5), bank: false });
  const uth = await business({ kind: "CLIENT", name: "University Teaching Hospital", town: "Lusaka", login: "uth@parallax.local", person: "Dr Mutale Chola" });
  const hope = await business({ kind: "CLIENT", name: "Hope NGO Clinic", town: "Chongwe", login: "hope@parallax.local", person: "Sister Agnes Mwale" });

  // ── Subscription billing: agreed fees and past payments with receipts ────────
  let receipt = 0;
  async function paid(org: { id: string; name: string }, fee: number, history: { monthsAgo: number; months: number; method: string; reference: string }[]) {
    const sub = await db.subscription.update({ where: { orgId: org.id }, data: { monthlyFee: fee } });
    for (const row of history) {
      const paidOn = subDays(addMonths(new Date(), -row.monthsAgo), 2);
      const periodStart = addMonths(new Date(), -row.monthsAgo);
      receipt += 1;
      await db.subscriptionPayment.create({
        data: {
          subscriptionId: sub.id,
          orgId: org.id,
          orgName: org.name,
          receiptNo: `RCT-${paidOn.getFullYear()}-${String(receipt).padStart(5, "0")}`,
          amount: fee * row.months,
          paidOn,
          months: row.months,
          periodStart,
          periodEnd: addMonths(periodStart, row.months),
          method: row.method,
          reference: row.reference,
          recordedByName: "Parallax Team",
        },
      });
    }
  }
  await paid(zpi.org, 1500, [{ monthsAgo: 2, months: 12, method: "BANK_TRANSFER", reference: "ZAN-88213" }]);
  await paid(apex.org, 1500, [{ monthsAgo: 7, months: 6, method: "BANK_TRANSFER", reference: "FNB-30418" }]);
  await paid(kilmers.org, 1200, [
    { monthsAgo: 14, months: 6, method: "BANK_TRANSFER", reference: "ZAN-71102" },
    { monthsAgo: 8, months: 6, method: "MOBILE_MONEY", reference: "MTN-5521984" },
    { monthsAgo: 2, months: 12, method: "BANK_TRANSFER", reference: "ZAN-90077" },
  ]);
  await paid(copper.org, 1200, [{ monthsAgo: 3, months: 3, method: "MOBILE_MONEY", reference: "AIRTEL-77310" }]);
  await paid(central.org, 600, [
    { monthsAgo: 4, months: 1, method: "MOBILE_MONEY", reference: "MTN-4410022" },
    { monthsAgo: 3, months: 12, method: "MOBILE_MONEY", reference: "MTN-4483310" },
  ]);
  await db.subscription.update({ where: { orgId: kabwe.org.id }, data: { monthlyFee: 600 } });

  // ── Items ──────────────────────────────────────────────────────────────────
  const CATALOG = [
    { sku: "AMX-500", name: "Amoxicillin 500 mg capsules", generic: "Amoxicillin", form: "capsule", strength: "500 mg", unit: "box of 100", price: 184, cost: 72, rx: true },
    { sku: "AZI-250", name: "Azithromycin 250 mg tablets", generic: "Azithromycin", form: "tablet", strength: "250 mg", unit: "box of 6", price: 220, cost: 95, rx: true },
    { sku: "IBU-400", name: "Ibuprofen 400 mg tablets", generic: "Ibuprofen", form: "tablet", strength: "400 mg", unit: "box of 100", price: 65, cost: 21, rx: false },
    { sku: "PCM-500", name: "Paracetamol 500 mg tablets", generic: "Paracetamol", form: "tablet", strength: "500 mg", unit: "box of 100", price: 42, cost: 11, rx: false },
    { sku: "AML-5", name: "Amlodipine 5 mg tablets", generic: "Amlodipine", form: "tablet", strength: "5 mg", unit: "box of 30", price: 128, cost: 44, rx: true },
    { sku: "MET-500", name: "Metformin 500 mg tablets", generic: "Metformin", form: "tablet", strength: "500 mg", unit: "box of 60", price: 96, cost: 31, rx: true },
    { sku: "ORS-1", name: "Oral rehydration salts", generic: "ORS", form: "sachet", strength: "20.5 g", unit: "box of 50", price: 75, cost: 25, rx: false },
    { sku: "GLV-M", name: "Examination gloves, medium", generic: null, form: "pair", strength: null, unit: "box of 100", price: 110, cost: 48, rx: false },
  ];

  async function items(orgId: string, picks: number[], options: { stock?: boolean; markup?: number; maker?: string } = {}) {
    const created = [];
    for (const index of picks) {
      const item = CATALOG[index];
      const markup = options.markup ?? 1;
      const product = await db.product.create({
        data: {
          orgId,
          sku: item.sku,
          name: item.name,
          genericName: item.generic,
          form: item.form,
          strength: item.strength,
          unit: item.unit,
          manufacturer: options.maker ?? null,
          sellingPrice: Math.round(item.price * markup),
          costPrice: Math.round(item.cost * markup),
          requiresRx: item.rx,
          kind: item.sku === "GLV-M" ? "EQUIPMENT" : "MEDICINE",
          reorderLevel: 20,
        },
      });
      if (options.stock) {
        await db.batch.create({
          data: { orgId, productId: product.id, lotNumber: `L${2400 + index}`, expiryDate: addDays(new Date(), 60 + index * 45), quantity: 40 + index * 15 },
        });
        if (index % 3 === 0) {
          await db.batch.create({
            data: { orgId, productId: product.id, lotNumber: `L${2500 + index}`, expiryDate: addDays(new Date(), 400), quantity: 60 },
          });
        }
      }
      created.push(product);
    }
    return created;
  }

  const zpiItems = await items(zpi.org.id, [0, 1, 3, 4, 5], { markup: 0.5, maker: "Zambia Pharma Industries" });
  await items(apex.org.id, [2, 6, 7], { markup: 0.55, maker: "Apex Generics" });
  const kilmersItems = await items(kilmers.org.id, [0, 1, 2, 3, 4, 5, 6, 7], { stock: true, markup: 0.8 });
  await items(copper.org.id, [0, 2, 3, 6, 7], { stock: true, markup: 0.78 });
  const centralItems = await items(central.org.id, [0, 2, 3, 4, 6], { stock: true });
  await items(kabwe.org.id, [2, 3], { stock: true });

  // ── Connections ────────────────────────────────────────────────────────────
  async function link(seller: { org: { id: string } }, buyer: { org: { id: string } }, status = "ACTIVE", requestedBy?: { org: { id: string } }) {
    return db.tradeLink.create({
      data: {
        sellerOrgId: seller.org.id,
        buyerOrgId: buyer.org.id,
        status,
        requestedByOrgId: (requestedBy ?? buyer).org.id,
        respondedAt: status === "PENDING" ? null : new Date(),
      },
    });
  }
  await link(zpi, kilmers, "ACTIVE", zpi);
  await link(apex, kilmers);
  await link(zpi, copper);
  await link(kilmers, central);
  await link(kilmers, uth, "ACTIVE", kilmers);
  await link(copper, central);
  await link(kilmers, kabwe, "PENDING");
  await link(central, hope);

  // A private contact: a customer of Kilmer's that isn't on Parallax.
  await db.contact.create({
    data: {
      orgId: kilmers.org.id,
      role: "CUSTOMER",
      kind: "CLIENT",
      name: "Mansa District Hospital",
      town: "Mansa",
      address: "Hospital Road, Mansa",
      phone: "+260 212 821 000",
      email: "stores@mansahospital.example",
    },
  });

  // ── Orders ─────────────────────────────────────────────────────────────────
  async function event(orderId: string, status: string, actor: { org: { id: string; name: string }; user: { name: string } }, message?: string) {
    await db.tradeOrderEvent.create({ data: { orderId, status, actorOrgId: actor.org.id, actorName: actor.user.name, message } });
  }

  // 1. Lusaka Central asks Kilmer's for prices (new inquiry).
  const inquiry = await db.tradeOrder.create({
    data: {
      sellerOrgId: kilmers.org.id,
      buyerOrgId: central.org.id,
      createdByOrgId: central.org.id,
      sellerName: kilmers.org.name,
      buyerName: central.org.name,
      inquiryNo: no("INQ"),
      paymentTerms: "CREDIT",
      buyerMessage: "Please include your best price for 20+ boxes.",
      items: {
        create: [
          { name: kilmersItems[0].name, strength: kilmersItems[0].strength, form: kilmersItems[0].form, unit: kilmersItems[0].unit, quantity: 20, sellerProductId: kilmersItems[0].id, buyerProductId: centralItems[0].id },
          { name: kilmersItems[3].name, strength: kilmersItems[3].strength, form: kilmersItems[3].form, unit: kilmersItems[3].unit, quantity: 50, sellerProductId: kilmersItems[3].id, buyerProductId: centralItems[2].id },
        ],
      },
    },
  });
  await event(inquiry.id, "INQUIRY", central, "Inquiry sent");

  // 2. UTH has a quote from Kilmer's to review.
  const quoted = await db.tradeOrder.create({
    data: {
      sellerOrgId: kilmers.org.id,
      buyerOrgId: uth.org.id,
      createdByOrgId: uth.org.id,
      sellerName: kilmers.org.name,
      buyerName: uth.org.name,
      inquiryNo: no("INQ"),
      quoteNo: no("QT"),
      status: "QUOTED",
      paymentTerms: "CREDIT",
      creditDays: 30,
      quotedAt: subDays(new Date(), 1),
      readyOn: addDays(new Date(), 3),
      validUntil: addDays(new Date(), 14),
      sellerMessage: "Prices held for 14 days.",
      items: {
        create: [
          { name: kilmersItems[5].name, strength: kilmersItems[5].strength, form: kilmersItems[5].form, unit: kilmersItems[5].unit, quantity: 40, sellerProductId: kilmersItems[5].id, unitPrice: 88 },
          { name: kilmersItems[7].name, form: kilmersItems[7].form, unit: kilmersItems[7].unit, quantity: 30, sellerProductId: kilmersItems[7].id, unitPrice: 99 },
        ],
      },
    },
  });
  await db.tradeOrder.update({ where: { id: quoted.id }, data: { quotedAmount: 40 * 88 + 30 * 99 } });
  await event(quoted.id, "INQUIRY", uth, "Inquiry sent");
  await event(quoted.id, "QUOTED", kilmers, "Quote sent");

  // 3. Kilmer's purchase from Zambia Pharma Industries is on the way.
  const po = await db.tradeOrder.create({
    data: {
      sellerOrgId: zpi.org.id,
      buyerOrgId: kilmers.org.id,
      createdByOrgId: kilmers.org.id,
      sellerName: zpi.org.name,
      buyerName: kilmers.org.name,
      inquiryNo: no("INQ"),
      quoteNo: no("QT"),
      poNumber: no("PO"),
      deliveryNoteNo: no("DN"),
      status: "DISPATCHED",
      paymentTerms: "ON_DELIVERY",
      quotedAt: subDays(new Date(), 6),
      orderedAt: subDays(new Date(), 5),
      dispatchedAt: subDays(new Date(), 1),
      quotedAmount: 100 * 92 + 60 * 48,
      deliveryMethod: "Supplier truck",
      vehicleDriver: "ABZ 4411 · J. Lungu",
      items: {
        create: [
          { name: zpiItems[0].name, strength: zpiItems[0].strength, form: zpiItems[0].form, unit: zpiItems[0].unit, quantity: 100, sellerProductId: zpiItems[0].id, buyerProductId: kilmersItems[0].id, unitPrice: 92, qtyDispatched: 100 },
          { name: zpiItems[4].name, strength: zpiItems[4].strength, form: zpiItems[4].form, unit: zpiItems[4].unit, quantity: 60, sellerProductId: zpiItems[4].id, buyerProductId: kilmersItems[5].id, unitPrice: 48, qtyDispatched: 60 },
        ],
      },
    },
  });
  await event(po.id, "INQUIRY", kilmers, "Inquiry sent");
  await event(po.id, "QUOTED", zpi, "Quote sent");
  await event(po.id, "ORDERED", kilmers, "Quote accepted and purchase order sent");
  await event(po.id, "DISPATCHED", zpi, "Dispatched with delivery note");

  // 4. A finished order: Kilmer's sold to Lusaka Central, invoiced and paid.
  const closed = await db.tradeOrder.create({
    data: {
      sellerOrgId: kilmers.org.id,
      buyerOrgId: central.org.id,
      createdByOrgId: central.org.id,
      sellerName: kilmers.org.name,
      buyerName: central.org.name,
      inquiryNo: no("INQ"),
      quoteNo: no("QT"),
      poNumber: no("PO"),
      invoiceNo: no("INV"),
      deliveryNoteNo: no("DN"),
      status: "CLOSED",
      paymentTerms: "CREDIT",
      quotedAmount: 30 * 52,
      amountPaid: 30 * 52,
      createdAt: subDays(new Date(), 20),
      quotedAt: subDays(new Date(), 19),
      orderedAt: subDays(new Date(), 18),
      dispatchedAt: subDays(new Date(), 16),
      invoicedAt: subDays(new Date(), 16),
      dueOn: addDays(subDays(new Date(), 16), 30),
      receivedAt: subDays(new Date(), 15),
      closedAt: subDays(new Date(), 3),
      items: {
        create: [
          { name: kilmersItems[2].name, strength: kilmersItems[2].strength, form: kilmersItems[2].form, unit: kilmersItems[2].unit, quantity: 30, sellerProductId: kilmersItems[2].id, buyerProductId: centralItems[1].id, unitPrice: 52, qtyDispatched: 30, qtyReceived: 30 },
        ],
      },
      payments: { create: [{ amount: 30 * 52, method: "BANK_TRANSFER", paidOn: subDays(new Date(), 3), reference: "ZANACO-88211", recordedBy: kilmers.user.name }] },
    },
  });
  await event(closed.id, "CLOSED", kilmers, "Paid in full");

  // ── Retail counter (Lusaka Central) ─────────────────────────────────────────
  const patient = await db.patient.create({
    data: { orgId: central.org.id, firstName: "Thandiwe", lastName: "Mbewe", gender: "F", dateOfBirth: "1986-04-12", phone: "+260 977 123 456", allergies: "Penicillin" },
  });
  await db.patient.create({ data: { orgId: central.org.id, firstName: "Joseph", lastName: "Kunda", gender: "M", phone: "+260 966 222 333" } });
  await db.prescription.create({
    data: {
      orgId: central.org.id,
      rxNumber: no("RX"),
      patientId: patient.id,
      prescriber: "Dr L. Siame",
      clinic: "Levy Mwanawasa Hospital",
      items: { create: [{ orgId: central.org.id, productId: centralItems[3].id, quantity: 1, dosage: "1 tablet daily" }] },
    },
  });
  for (let day = 0; day < 10; day++) {
    const price = centralItems[2].sellingPrice;
    await db.sale.create({
      data: {
        orgId: central.org.id,
        invoiceNo: no("RCT"),
        cashierId: central.user.id,
        cashierName: central.user.name,
        subtotal: price * 2,
        tax: 0,
        total: price * 2,
        payment: day % 2 ? "MOBILE" : "CASH",
        createdAt: subDays(new Date(), day),
        items: { create: [{ orgId: central.org.id, productId: centralItems[2].id, quantity: 2, unitPrice: price, total: price * 2 }] },
      },
    });
  }

  // ── Notifications and an announcement ──────────────────────────────────────
  await db.notification.create({
    data: { orgId: kilmers.org.id, type: "INQUIRY", title: `New inquiry from ${central.org.name}`, link: `/orders/${inquiry.id}` },
  });
  await db.notification.create({
    data: { orgId: kilmers.org.id, type: "CONNECTION", title: `${kabwe.org.name} asked to connect`, link: "/customers" },
  });
  await db.notification.create({
    data: { orgId: uth.org.id, type: "QUOTED", title: `Quote received from ${kilmers.org.name}`, link: `/purchases/${quoted.id}` },
  });
  await db.announcement.create({
    data: { audience: "ALL", title: "Welcome to Parallax", body: "Connect with your suppliers and customers from Find businesses." },
  });

  await db.demoRequest.create({
    data: { name: "Bwalya Chisanga", company: "Northern Medical Wholesale", phone: "+260 977 000 111", email: "bwalya@northern.example", notes: "About 400 items." },
  });

  console.log(`Seeded the demo network. Every login's password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());

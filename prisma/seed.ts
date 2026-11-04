import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";

const db = new PrismaClient();

async function main() {
  await db.consignmentEvent.deleteMany();
  await db.consignmentItem.deleteMany();
  await db.consignment.deleteMany();
  await db.institution.deleteMany();
  await db.saleItem.deleteMany();
  await db.sale.deleteMany();
  await db.stockTakeItem.deleteMany();
  await db.stockTake.deleteMany();
  await db.prescriptionItem.deleteMany();
  await db.prescription.deleteMany();
  await db.purchaseOrderItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.batch.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.supplier.deleteMany();
  await db.patient.deleteMany();
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
  await db.pharmacy.deleteMany();

  const password = (plain: string) => bcrypt.hash(plain, 10);

  const [admin, wholesaleAdmin, pharmacist, technician, cashier, inventory] = await Promise.all([
    db.user.create({
      data: {
        email: "admin@pharmacore.local",
        name: "Amara Okonkwo",
        passwordHash: await password("Admin123!"),
        role: "ADMIN",
      },
    }),
    db.user.create({
      data: {
        email: "wholesale@pharmacore.local",
        name: "Chanda Mulenga",
        passwordHash: await password("Whole123!"),
        role: "WHOLESALE_ADMIN",
      },
    }),
    db.user.create({
      data: {
        email: "pharmacist@pharmacore.local",
        name: "Dr. Elias Brandt",
        passwordHash: await password("Pharma123!"),
        role: "PHARMACIST",
      },
    }),
    db.user.create({
      data: {
        email: "tech@pharmacore.local",
        name: "Lina Moreau",
        passwordHash: await password("Tech123!"),
        role: "TECHNICIAN",
      },
    }),
    db.user.create({
      data: {
        email: "cashier@pharmacore.local",
        name: "Noah Patel",
        passwordHash: await password("Cash123!"),
        role: "CASHIER",
      },
    }),
    db.user.create({
      data: {
        email: "stock@pharmacore.local",
        name: "Sofia Reyes",
        passwordHash: await password("Stock123!"),
        role: "INVENTORY",
      },
    }),
  ]);

  await db.pharmacy.create({
    data: {
      id: "main",
      name: "Pharmacy",
      license: "ZAMRA-PH-8821",
      phone: "+260 211 555 148",
      email: "hello@lusakacentral.pharmacy",
      address: "",
      currency: "ZMW",
    },
  });

  const [antibiotics, analgesics, cardio, endocrine, otc, devices] = await Promise.all(
    ["Antibiotics", "Analgesics", "Cardiovascular", "Endocrine", "OTC & wellness", "Devices"].map(
      (name) => db.category.create({ data: { name } }),
    ),
  );

  const [medline, apex, greenleaf] = await Promise.all([
    db.supplier.create({
      data: {
        name: "MedLine Wholesale",
        contact: "Priya Shah",
        phone: "+1 (800) 555-2201",
        email: "orders@medline.example",
        address: "400 Supply Park, Newark",
      },
    }),
    db.supplier.create({
      data: {
        name: "Apex Generics",
        contact: "Tomás Silva",
        phone: "+1 (800) 555-4410",
        email: "desk@apexgenerics.example",
        address: "77 Industry Blvd, Austin",
      },
    }),
    db.supplier.create({
      data: {
        name: "Greenleaf Distributors",
        contact: "Hannah Cho",
        phone: "+1 (800) 555-9088",
        email: "hello@greenleaf.example",
        address: "12 Dock Road, Seattle",
      },
    }),
  ]);

  const catalog = [
    {
      sku: "AMX-500-21",
      barcode: "890123400001",
      name: "Amoxicillin 500 mg capsules",
      genericName: "Amoxicillin",
      form: "capsule",
      strength: "500 mg",
      manufacturer: "Apex",
      categoryId: antibiotics.id,
      supplierId: apex.id,
      sellingPrice: 18.4,
      costPrice: 7.2,
      reorderLevel: 40,
      requiresRx: true,
      qty: 86,
      expiryDays: 220,
    },
    {
      sku: "AZI-250-06",
      barcode: "890123400002",
      name: "Azithromycin 250 mg tablets",
      genericName: "Azithromycin",
      form: "tablet",
      strength: "250 mg",
      manufacturer: "MedLine",
      categoryId: antibiotics.id,
      supplierId: medline.id,
      sellingPrice: 22.0,
      costPrice: 9.5,
      reorderLevel: 30,
      requiresRx: true,
      qty: 18,
      expiryDays: 40,
    },
    {
      sku: "IBU-400-24",
      barcode: "890123400003",
      name: "Ibuprofen 400 mg tablets",
      genericName: "Ibuprofen",
      form: "tablet",
      strength: "400 mg",
      manufacturer: "Greenleaf",
      categoryId: analgesics.id,
      supplierId: greenleaf.id,
      sellingPrice: 6.5,
      costPrice: 2.1,
      reorderLevel: 80,
      requiresRx: false,
      qty: 210,
      expiryDays: 400,
    },
    {
      sku: "PCM-500-16",
      barcode: "890123400004",
      name: "Paracetamol 500 mg tablets",
      genericName: "Paracetamol",
      form: "tablet",
      strength: "500 mg",
      manufacturer: "Greenleaf",
      categoryId: analgesics.id,
      supplierId: greenleaf.id,
      sellingPrice: 4.2,
      costPrice: 1.1,
      reorderLevel: 120,
      requiresRx: false,
      qty: 64,
      expiryDays: 28,
    },
    {
      sku: "AML-5-30",
      barcode: "890123400005",
      name: "Amlodipine 5 mg tablets",
      genericName: "Amlodipine",
      form: "tablet",
      strength: "5 mg",
      manufacturer: "Apex",
      categoryId: cardio.id,
      supplierId: apex.id,
      sellingPrice: 12.8,
      costPrice: 4.4,
      reorderLevel: 50,
      requiresRx: true,
      qty: 140,
      expiryDays: 310,
    },
    {
      sku: "LIS-10-28",
      barcode: "890123400006",
      name: "Lisinopril 10 mg tablets",
      genericName: "Lisinopril",
      form: "tablet",
      strength: "10 mg",
      manufacturer: "MedLine",
      categoryId: cardio.id,
      supplierId: medline.id,
      sellingPrice: 14.5,
      costPrice: 5.0,
      reorderLevel: 40,
      requiresRx: true,
      qty: 12,
      expiryDays: 180,
    },
    {
      sku: "MET-500-56",
      barcode: "890123400007",
      name: "Metformin 500 mg tablets",
      genericName: "Metformin",
      form: "tablet",
      strength: "500 mg",
      manufacturer: "Apex",
      categoryId: endocrine.id,
      supplierId: apex.id,
      sellingPrice: 9.9,
      costPrice: 3.2,
      reorderLevel: 70,
      requiresRx: true,
      qty: 190,
      expiryDays: 260,
    },
    {
      sku: "INS-NPH-10",
      barcode: "890123400008",
      name: "Insulin NPH 100 IU/ml 10 ml",
      genericName: "Insulin isophane",
      form: "vial",
      strength: "100 IU/ml",
      manufacturer: "MedLine",
      categoryId: endocrine.id,
      supplierId: medline.id,
      sellingPrice: 38.0,
      costPrice: 21.0,
      reorderLevel: 15,
      requiresRx: true,
      controlled: false,
      qty: 9,
      expiryDays: 70,
    },
    {
      sku: "VIT-D3-60",
      barcode: "890123400009",
      name: "Vitamin D3 1000 IU capsules",
      genericName: "Cholecalciferol",
      form: "capsule",
      strength: "1000 IU",
      manufacturer: "Greenleaf",
      categoryId: otc.id,
      supplierId: greenleaf.id,
      sellingPrice: 11.2,
      costPrice: 4.0,
      reorderLevel: 40,
      requiresRx: false,
      qty: 75,
      expiryDays: 500,
    },
    {
      sku: "GLU-STR-50",
      barcode: "890123400010",
      name: "Glucose test strips (50)",
      genericName: "Glucose oxidase strips",
      form: "device",
      strength: "50 count",
      manufacturer: "MedLine",
      categoryId: devices.id,
      supplierId: medline.id,
      sellingPrice: 27.5,
      costPrice: 14.0,
      reorderLevel: 25,
      requiresRx: false,
      qty: 33,
      expiryDays: 150,
      kind: "EQUIPMENT",
    },
    {
      sku: "BP-DIG-01",
      barcode: "890123400011",
      name: "Digital blood pressure monitor",
      genericName: "Sphygmomanometer",
      form: "device",
      strength: "unit",
      manufacturer: "MedLine",
      categoryId: devices.id,
      supplierId: medline.id,
      sellingPrice: 890,
      costPrice: 420,
      reorderLevel: 8,
      requiresRx: false,
      qty: 14,
      expiryDays: 900,
      kind: "EQUIPMENT",
    },
    {
      sku: "OXM-FNG-01",
      barcode: "890123400012",
      name: "Finger pulse oximeter",
      genericName: "Pulse oximeter",
      form: "device",
      strength: "unit",
      manufacturer: "Greenleaf",
      categoryId: devices.id,
      supplierId: greenleaf.id,
      sellingPrice: 320,
      costPrice: 140,
      reorderLevel: 12,
      requiresRx: false,
      qty: 22,
      expiryDays: 900,
      kind: "EQUIPMENT",
    },
    {
      sku: "GLV-NTR-100",
      barcode: "890123400013",
      name: "Nitrile examination gloves (100)",
      genericName: "Examination gloves",
      form: "box",
      strength: "100 count",
      manufacturer: "Apex",
      categoryId: devices.id,
      supplierId: apex.id,
      sellingPrice: 95,
      costPrice: 40,
      reorderLevel: 40,
      requiresRx: false,
      qty: 80,
      expiryDays: 700,
      kind: "EQUIPMENT",
    },
  ];

  const products = [];
  for (const item of catalog) {
    const product = await db.product.create({
      data: {
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        genericName: item.genericName,
        form: item.form,
        strength: item.strength,
        manufacturer: item.manufacturer,
        categoryId: item.categoryId,
        supplierId: item.supplierId,
        sellingPrice: item.sellingPrice,
        costPrice: item.costPrice,
        reorderLevel: item.reorderLevel,
        requiresRx: item.requiresRx,
        controlled: "controlled" in item ? Boolean(item.controlled) : false,
        kind: "kind" in item && item.kind ? item.kind : "MEDICINE",
        wholesalePrice: item.sellingPrice,
      },
    });
    await db.batch.create({
      data: {
        productId: product.id,
        lotNumber: `LOT-${item.sku.slice(0, 3)}-${Math.floor(Math.random() * 900 + 100)}`,
        expiryDate: addDays(new Date(), item.expiryDays),
        quantity: item.qty,
      },
    });
    products.push(product);
  }

  const patients = await Promise.all([
    db.patient.create({
      data: {
        firstName: "Helen",
        lastName: "Park",
        dateOfBirth: new Date("1968-03-12"),
        gender: "F",
        phone: "+1 415 555 0199",
        allergies: "Penicillin",
        insurance: "BlueShield Gold",
        address: "9 Cedar Court",
      },
    }),
    db.patient.create({
      data: {
        firstName: "Marcus",
        lastName: "Adeyemi",
        dateOfBirth: new Date("1981-11-02"),
        gender: "M",
        phone: "+1 415 555 0172",
        insurance: "Aetna Care",
        address: "44 Riverside Ave",
      },
    }),
    db.patient.create({
      data: {
        firstName: "Ines",
        lastName: "Costa",
        dateOfBirth: new Date("1994-07-21"),
        gender: "F",
        phone: "+1 415 555 0133",
        allergies: "NSAIDs",
        address: "2 Mill Street",
      },
    }),
  ]);

  await db.prescription.create({
    data: {
      rxNumber: "RX-100284",
      patientId: patients[0].id,
      pharmacistId: pharmacist.id,
      prescriber: "Dr. Camille Ng",
      clinic: "Harbor Family Clinic",
      status: "PENDING",
      items: {
        create: [
          {
            productId: products[4].id,
            quantity: 28,
            dosage: "5 mg",
            instructions: "One tablet daily in the morning",
          },
          {
            productId: products[6].id,
            quantity: 56,
            dosage: "500 mg",
            instructions: "One tablet twice daily with meals",
          },
        ],
      },
    },
  });

  const amlodipine = products[4];
  const ibuprofen = products[2];
  const vitamin = products[8];

  const saleDays = [1, 2, 3, 5, 6, 8, 9, 11, 12, 14];
  for (const offset of saleDays) {
    const qty = offset % 3 === 0 ? 2 : 1;
    const total = amlodipine.sellingPrice * qty + ibuprofen.sellingPrice;
    await db.sale.create({
      data: {
        invoiceNo: `INV-${1000 + offset}`,
        cashierId: cashier.id,
        patientId: offset % 2 === 0 ? patients[1].id : null,
        subtotal: total,
        tax: 0,
        discount: 0,
        total,
        payment: offset % 2 === 0 ? "CARD" : "CASH",
        createdAt: subDays(new Date(), offset),
        items: {
          create: [
            {
              productId: amlodipine.id,
              quantity: qty,
              unitPrice: amlodipine.sellingPrice,
              total: amlodipine.sellingPrice * qty,
            },
            {
              productId: ibuprofen.id,
              quantity: 1,
              unitPrice: ibuprofen.sellingPrice,
              total: ibuprofen.sellingPrice,
            },
          ],
        },
      },
    });
  }

  await db.sale.create({
    data: {
      invoiceNo: "INV-TODAY-1",
      cashierId: cashier.id,
      patientId: patients[2].id,
      subtotal: vitamin.sellingPrice,
      tax: 0,
      discount: 0,
      total: vitamin.sellingPrice,
      payment: "MOBILE",
      items: {
        create: [
          {
            productId: vitamin.id,
            quantity: 1,
            unitPrice: vitamin.sellingPrice,
            total: vitamin.sellingPrice,
          },
        ],
      },
    },
  });

  await db.purchaseOrder.create({
    data: {
      reference: "PO-24018",
      supplierId: medline.id,
      createdById: inventory.id,
      status: "ORDERED",
      notes: "Restock azithromycin and insulin",
      items: {
        create: [
          { productId: products[1].id, quantity: 80, unitCost: products[1].costPrice },
          { productId: products[7].id, quantity: 20, unitCost: products[7].costPrice },
        ],
      },
    },
  });

  const uth = await db.institution.create({
    data: {
      name: "University Teaching Hospital",
      kind: "HOSPITAL",
      license: "MOH-UTH-01",
      contact: "Procurement desk",
      phone: "+260 211 251 000",
      email: "stores@uth.example",
      address: "Nationalist Road, Lusaka",
      users: {
        create: {
          email: "uth@pharmacore.local",
          name: "Mwaka Banda",
          passwordHash: await password("Buyer123!"),
          role: "BUYER",
        },
      },
    },
    include: { users: true },
  });
  const clinic = await db.institution.create({
    data: {
      name: "Kabulonga Family Clinic",
      kind: "CLINIC",
      license: "HPCZ-CL-441",
      contact: "Sister-in-charge",
      phone: "+260 211 555 220",
      email: "orders@kabulonga.example",
      address: "Kabulonga, Lusaka",
      users: {
        create: {
          email: "clinic@pharmacore.local",
          name: "Grace Phiri",
          passwordHash: await password("Buyer123!"),
          role: "BUYER",
        },
      },
    },
    include: { users: true },
  });
  await db.institution.create({
    data: {
      name: "Garden Compound Pharmacy",
      kind: "PHARMACY",
      license: "ZAMRA-RT-19",
      contact: "Owner pharmacist",
      phone: "+260 977 555 018",
      email: "desk@gardenpharmacy.example",
      address: "Great East Road, Lusaka",
      users: {
        create: {
          email: "partner@pharmacore.local",
          name: "Joseph Zulu",
          passwordHash: await password("Buyer123!"),
          role: "BUYER",
        },
      },
    },
  });

  const uthBuyer = uth.users[0];
  const clinicBuyer = clinic.users[0];
  const gloves = products.find((p) => p.sku === "GLV-NTR-100") ?? products[products.length - 1];
  const oximeter = products.find((p) => p.sku === "OXM-FNG-01") ?? products[products.length - 2];

  await db.consignment.create({
    data: {
      reference: "CN-UTH-2401",
      institutionId: uth.id,
      requestedById: uthBuyer.id,
      status: "REQUESTED",
      notes: "Emergency stores restock for medical wards.",
      deliveryAddress: "UTH main pharmacy receiving bay",
      items: {
        create: [
          { productId: products[0].id, quantity: 200 },
          { productId: products[6].id, quantity: 150 },
          { productId: gloves.id, quantity: 40 },
        ],
      },
      events: {
        create: {
          status: "REQUESTED",
          message: "Consignment request submitted",
          actorName: uthBuyer.name,
        },
      },
    },
  });

  await db.consignment.create({
    data: {
      reference: "CN-KAB-2408",
      institutionId: clinic.id,
      requestedById: clinicBuyer.id,
      quotedById: wholesaleAdmin.id,
      status: "QUOTED",
      notes: "Clinic opening pack plus diagnostics.",
      deliveryAddress: "Kabulonga Family Clinic stores",
      quotedAmount: 18640,
      readyOn: addDays(new Date(), 3),
      quotedAt: new Date(),
      adminMessage: "Full consignment can be ready in three days. Amount is ZMW 18,640 including delivery in Lusaka.",
      items: {
        create: [
          { productId: products[2].id, quantity: 80 },
          { productId: oximeter.id, quantity: 4 },
        ],
      },
      events: {
        create: [
          {
            status: "REQUESTED",
            message: "Consignment request submitted",
            actorName: clinicBuyer.name,
            createdAt: subDays(new Date(), 1),
          },
          {
            status: "QUOTED",
            message: "Quoted K 18640.00 · ready in 3 days.",
            actorName: wholesaleAdmin.name,
          },
        ],
      },
    },
  });

  await db.auditLog.create({
    data: {
      userId: admin.id,
      action: "SYSTEM_SEEDED",
      entity: "Pharmacy",
      entityId: "main",
      details: "Demonstration database created",
    },
  });

  console.log("PharmaCore seeded.");
  console.log("Admin:            admin@pharmacore.local / Admin123!");
  console.log("Wholesale admin:  wholesale@pharmacore.local / Whole123!");
  console.log("Pharmacist:       pharmacist@pharmacore.local / Pharma123!");
  console.log("UTH buyer:        uth@pharmacore.local / Buyer123!");
  console.log("Clinic buyer:     clinic@pharmacore.local / Buyer123!");
  console.log("Pharmacy buyer:   partner@pharmacore.local / Buyer123!");
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });

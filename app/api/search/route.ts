import { NextResponse } from "next/server";
import { canSell, isBuyer, isManufacturer, isStaff, requireUser } from "@/lib/auth";
import { PO_SUPPLIER_LABEL } from "@/lib/purchasing";
import { getPharmacy } from "@/lib/pharmacy";
import { db } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/wholesale";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const needle = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 100);
  if (needle.length < 2) return NextResponse.json({ hits: [] });

  const hits: { href: string; title: string; detail: string; group: string }[] = [];

  const q = needle;
  if (isBuyer(user.role)) {
    // Order numbers and item names are matched in the database, newest first.
    const orders = await db.consignment.findMany({
      where: {
        institutionId: user.institutionId ?? "__none__",
        OR: [
          { reference: { contains: q } },
          { status: { in: statusesMatching(q) } },
          { items: { some: { product: { name: { contains: q } } } } },
        ],
      },
      select: { id: true, reference: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    // The wholesaler this installation belongs to: its contact details, and a way to order.
    const wholesaler = await getPharmacy();
    if (wholesaler && [wholesaler.name, wholesaler.phone, wholesaler.email].some((v) => (v ?? "").toLowerCase().includes(q))) {
      hits.push({
        href: "/portal/new",
        title: wholesaler.name,
        detail: [wholesaler.phone, wholesaler.email].filter(Boolean).join(" · ") || "Your wholesaler",
        group: "Wholesaler",
      });
    }
    for (const order of orders) {
      hits.push({
        href: `/portal/orders/${order.id}`,
        title: order.reference,
        detail: STATUS_LABEL[order.status] ?? order.status,
        group: "Orders",
      });
    }
    return NextResponse.json({ hits });
  }

  if (isManufacturer(user.role)) {
    // A manufacturer finds only its own purchase orders.
    const pos = await db.purchaseOrder.findMany({
      where: {
        supplierId: user.supplierId ?? "__none__",
        OR: [
          { reference: { contains: q } },
          { invoiceNo: { contains: q } },
          { deliveryNoteNo: { contains: q } },
          { items: { some: { product: { name: { contains: q } } } } },
        ],
      },
      select: { id: true, reference: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    for (const po of pos) {
      hits.push({
        href: `/supplier/orders/${po.id}`,
        title: po.reference,
        detail: PO_SUPPLIER_LABEL[po.status] ?? po.status,
        group: "Orders",
      });
    }
    return NextResponse.json({ hits });
  }
  if (!isStaff(user.role)) return NextResponse.json({ hits: [] });

  // Each group is searched in the database, so matches are found however large the tables get.
  const [products, patients, sales, orders, purchases] = await Promise.all([
    db.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q } },
          { sku: { contains: q } },
          { barcode: { contains: q } },
          { genericName: { contains: q } },
        ],
      },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
      take: 5,
    }),
    // Patients are only for roles that serve them (Finance can't open patient records).
    !canSell(user.role) ? Promise.resolve([]) : db.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { phone: { contains: q } },
          { insurance: { contains: q } },
        ],
      },
      select: { firstName: true, lastName: true, phone: true },
      orderBy: { lastName: "asc" },
      take: 5,
    }),
    db.sale.findMany({
      where: {
        OR: [
          { invoiceNo: { contains: q } },
          { cashier: { name: { contains: q } } },
          { patient: { firstName: { contains: q } } },
          { patient: { lastName: { contains: q } } },
        ],
      },
      select: { invoiceNo: true, patient: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    isStaff(user.role)
      ? db.consignment.findMany({
          where: {
            OR: [
              { reference: { contains: q } },
              { invoiceNo: { contains: q } },
              { institution: { name: { contains: q } } },
              { status: { in: statusesMatching(q) } },
            ],
          },
          select: { id: true, reference: true, institution: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 4,
        })
      : Promise.resolve([]),
    db.purchaseOrder.findMany({
      where: {
        OR: [
          { reference: { contains: q } },
          { invoiceNo: { contains: q } },
          { supplier: { name: { contains: q } } },
        ],
      },
      select: { id: true, reference: true, supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  for (const product of products) {
    hits.push({ href: `/inventory/${product.id}`, title: product.name, detail: product.sku, group: "Inventory" });
  }
  for (const patient of patients) {
    hits.push({
      href: `/patients?q=${encodeURIComponent(patient.lastName)}`,
      title: `${patient.lastName}, ${patient.firstName}`,
      detail: patient.phone ?? "Patient record",
      group: "Patients",
    });
  }
  for (const sale of sales) {
    hits.push({
      href: `/sales?q=${encodeURIComponent(sale.invoiceNo)}`,
      title: sale.invoiceNo,
      detail: sale.patient ? `${sale.patient.firstName} ${sale.patient.lastName}` : "Walk-in",
      group: "Sales",
    });
  }
  for (const order of orders) {
    hits.push({ href: `/wholesale/${order.id}`, title: order.reference, detail: order.institution.name, group: "Wholesale" });
  }

  for (const po of purchases) {
    hits.push({ href: `/purchases/${po.id}`, title: po.reference, detail: po.supplier.name, group: "Purchases" });
  }

  return NextResponse.json({ hits: hits.slice(0, 12) });
}

/** Status codes whose plain-English label contains the search text ("ready" → READY). */
function statusesMatching(q: string) {
  return Object.entries(STATUS_LABEL)
    .filter(([code, label]) => code.toLowerCase().includes(q) || label.toLowerCase().includes(q))
    .map(([code]) => code);
}

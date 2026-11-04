import { NextResponse } from "next/server";
import { canWholesale, isBuyer, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/wholesale";

function includes(hay: string | null | undefined, needle: string) {
  return (hay ?? "").toLowerCase().includes(needle);
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const needle = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (needle.length < 2) return NextResponse.json({ hits: [] });

  const hits: { href: string; title: string; detail: string; group: string }[] = [];

  if (isBuyer(user.role)) {
    const orders = await db.consignment.findMany({
      where: { institutionId: user.institutionId ?? "__none__" },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
    for (const order of orders) {
      const blob = [
        order.reference,
        order.status,
        STATUS_LABEL[order.status],
        ...order.items.map((item) => item.product.name),
      ].join(" ");
      if (!includes(blob, needle)) continue;
      hits.push({
        href: `/portal/orders/${order.id}`,
        title: order.reference,
        detail: STATUS_LABEL[order.status] ?? order.status,
        group: "Orders",
      });
      if (hits.length >= 8) break;
    }
    return NextResponse.json({ hits });
  }

  const [products, patients, sales, orders] = await Promise.all([
    db.product.findMany({ take: 200, orderBy: { name: "asc" } }),
    db.patient.findMany({ take: 200, orderBy: { lastName: "asc" } }),
    db.sale.findMany({
      take: 80,
      orderBy: { createdAt: "desc" },
      include: { patient: true, cashier: true },
    }),
    canWholesale(user.role)
      ? db.consignment.findMany({
          take: 80,
          orderBy: { createdAt: "desc" },
          include: { institution: true },
        })
      : Promise.resolve([]),
  ]);

  for (const product of products) {
    if (
      !includes(product.name, needle) &&
      !includes(product.sku, needle) &&
      !includes(product.barcode, needle) &&
      !includes(product.genericName, needle)
    ) {
      continue;
    }
    hits.push({
      href: `/inventory/${product.id}`,
      title: product.name,
      detail: product.sku,
      group: "Inventory",
    });
    if (hits.filter((h) => h.group === "Inventory").length >= 5) break;
  }

  for (const patient of patients) {
    const name = `${patient.firstName} ${patient.lastName}`;
    if (!includes(name, needle) && !includes(patient.phone, needle) && !includes(patient.insurance, needle)) {
      continue;
    }
    hits.push({
      href: "/patients",
      title: `${patient.lastName}, ${patient.firstName}`,
      detail: patient.phone ?? "Patient record",
      group: "Patients",
    });
    if (hits.filter((h) => h.group === "Patients").length >= 5) break;
  }

  for (const sale of sales) {
    const patientName = sale.patient ? `${sale.patient.firstName} ${sale.patient.lastName}` : "Walk-in";
    if (!includes(sale.invoiceNo, needle) && !includes(patientName, needle) && !includes(sale.cashier.name, needle)) {
      continue;
    }
    hits.push({
      href: "/sales",
      title: sale.invoiceNo,
      detail: patientName,
      group: "Sales",
    });
    if (hits.filter((h) => h.group === "Sales").length >= 4) break;
  }

  for (const order of orders) {
    if (
      !includes(order.reference, needle) &&
      !includes(order.institution.name, needle) &&
      !includes(STATUS_LABEL[order.status], needle)
    ) {
      continue;
    }
    hits.push({
      href: `/wholesale/${order.id}`,
      title: order.reference,
      detail: order.institution.name,
      group: "Wholesale",
    });
    if (hits.filter((h) => h.group === "Wholesale").length >= 4) break;
  }

  return NextResponse.json({ hits: hits.slice(0, 12) });
}

import { NextResponse } from "next/server";
import { apiTenant } from "@/lib/tenant";
import { can } from "@/lib/capabilities";
import { statusLabel } from "@/lib/trade";

/** Header search over the signed-in business's own records only. */
export async function GET(request: Request) {
  const auth = await apiTenant(undefined, { write: false });
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const { db, org } = t;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const text = { contains: q, mode: "insensitive" as const };
  const hits: { href: string; title: string; detail: string; group: string }[] = [];

  const [products, patients, sales, orders] = await Promise.all([
    can(org.kind, "catalog")
      ? db.product.findMany({
          where: { active: true, OR: [{ name: text }, { sku: text }, { barcode: text }, { genericName: text }] },
          select: { id: true, name: true, sku: true },
          orderBy: { name: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
    can(org.kind, "counter")
      ? db.patient.findMany({
          where: { OR: [{ firstName: text }, { lastName: text }] },
          select: { firstName: true, lastName: true },
          orderBy: { lastName: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
    can(org.kind, "counter")
      ? db.sale.findMany({
          where: { OR: [{ invoiceNo: text }, { patient: { lastName: text } }] },
          select: { invoiceNo: true, patient: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
          take: 4,
        })
      : Promise.resolve([]),
    db.tradeOrder.findMany({
      where: {
        OR: [{ sellerOrgId: org.id }, { buyerOrgId: org.id }],
        AND: {
          OR: [
            { inquiryNo: text },
            { poNumber: text },
            { quoteNo: text },
            { invoiceNo: text },
            { deliveryNoteNo: text },
            { buyerName: text },
            { sellerName: text },
          ],
        },
      },
      select: { id: true, inquiryNo: true, status: true, sellerOrgId: true, buyerName: true, sellerName: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  for (const product of products) {
    hits.push({
      href: can(org.kind, "inventory") ? `/inventory/${product.id}` : `/items?q=${encodeURIComponent(product.sku)}`,
      title: product.name,
      detail: product.sku,
      group: "Items",
    });
  }
  for (const patient of patients) {
    hits.push({
      href: `/patients?q=${encodeURIComponent(patient.lastName)}`,
      title: `${patient.lastName}, ${patient.firstName}`,
      detail: "Patient record",
      group: "Patients",
    });
  }
  for (const sale of sales) {
    hits.push({
      href: `/sales?q=${encodeURIComponent(sale.invoiceNo)}`,
      title: sale.invoiceNo,
      detail: sale.patient ? `${sale.patient.firstName} ${sale.patient.lastName}` : "Walk-in",
      group: "Counter sales",
    });
  }
  for (const order of orders) {
    const selling = order.sellerOrgId === org.id;
    hits.push({
      href: selling ? `/orders/${order.id}` : `/purchases/${order.id}`,
      title: order.inquiryNo,
      detail: `${selling ? order.buyerName : order.sellerName} · ${statusLabel(order.status, selling ? "seller" : "buyer")}`,
      group: selling ? "Orders" : "Purchases",
    });
  }
  return NextResponse.json({ hits: hits.slice(0, 12) });
}

import { format } from "date-fns";
import { notFound } from "next/navigation";
import { DocumentFrame } from "@/components/documents/DocumentFrame";
import { InvoiceSheet } from "@/components/documents/InvoiceSheet";
import { isStaff, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPharmacy } from "@/lib/pharmacy";

export default async function SaleInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || !isStaff(user.role)) notFound();
  const { id } = await params;
  const [sale, pharmacy] = await Promise.all([
    db.sale.findUnique({
      where: { id },
      include: { cashier: true, patient: true, items: { include: { product: true } } },
    }),
    getPharmacy(),
  ]);
  if (!sale || !pharmacy) notFound();

  const patient = sale.patient;
  const taxRateLabel = sale.subtotal > 0 ? `${((sale.tax / sale.subtotal) * 100).toFixed(2).replace(/\.00$/, "")}%` : "0%";

  return (
    <DocumentFrame back="/sales">
      <InvoiceSheet
        pharmacy={pharmacy}
        invoiceNo={sale.invoiceNo}
        issued={format(sale.createdAt, "dd MMM yyyy")}
        due={format(sale.createdAt, "dd MMM yyyy")}
        customerId={patient ? patient.id.slice(-8).toUpperCase() : "WALK-IN"}
        preparedBy={sale.cashier.name}
        billTo={{
          name: patient ? `${patient.firstName} ${patient.lastName}` : "Walk-in",
          company: patient?.insurance,
          contact: patient?.phone,
          address: patient?.address,
          email: patient?.email,
        }}
        lines={sale.items.map((item) => ({
          id: item.id,
          description: [item.product.name, item.product.strength].filter(Boolean).join(" "),
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))}
        notes={`Paid by ${sale.payment.replaceAll("_", " ")}.`}
        subtotal={sale.subtotal}
        taxRateLabel={taxRateLabel}
        tax={sale.tax}
        discount={sale.discount}
        total={sale.total}
        amountPaid={sale.total}
      />
    </DocumentFrame>
  );
}

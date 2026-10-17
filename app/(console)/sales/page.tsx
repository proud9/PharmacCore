import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { money } from "@/lib/utils";

export default async function SalesPage() {
  const [sales, pharmacy] = await Promise.all([
    db.sale.findMany({
      include: { cashier: true, patient: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    db.pharmacy.findUnique({ where: { id: "main" } }),
  ]);
  const currency = pharmacy?.currency ?? "USD";

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Sales ledger"
        description="Every posted invoice with tender type, cashier, and line items."
      />
      <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white shadow-panel">
        <table className="table-grid">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>When</th>
              <th>Cashier</th>
              <th>Patient</th>
              <th>Tender</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="font-mono text-xs">{sale.invoiceNo}</td>
                <td>{format(sale.createdAt, "dd MMM HH:mm")}</td>
                <td>{sale.cashier.name}</td>
                <td>{sale.patient ? `${sale.patient.lastName}, ${sale.patient.firstName}` : "Walk-in"}</td>
                <td>{sale.payment}</td>
                <td>{money(sale.total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

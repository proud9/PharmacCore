import { format } from "date-fns";
import { CompanyMark } from "@/components/documents/CompanyMark";
import { InvoiceSheet } from "@/components/documents/InvoiceSheet";
import { documentTotals, zmw } from "@/lib/documents";
import { STATUS_LABEL } from "@/lib/wholesale";

type Pharmacy = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  tpin: string | null;
  logoPath: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  bankBranch: string | null;
  swiftCode: string | null;
};

type Line = {
  id: string;
  quantity: number;
  unitPrice: number | null;
  qtyDelivered: number | null;
  remarks: string | null;
  product: { name: string; sku: string; strength: string | null };
};

type Order = {
  reference: string;
  status: string;
  notes: string | null;
  adminMessage: string | null;
  terms: string | null;
  taxRate: number;
  quotedAmount: number | null;
  amountPaid: number;
  invoiceNo: string | null;
  deliveryNoteNo: string | null;
  deliveryAddress: string | null;
  deliveryMethod: string | null;
  vehicleDriver: string | null;
  dispatchFrom: string | null;
  deliveryNotes: string | null;
  createdAt: Date;
  quotedAt: Date | null;
  invoicedAt: Date | null;
  readyOn: Date | null;
  validUntil: Date | null;
  dueOn: Date | null;
  institution: {
    name: string;
    license: string | null;
    contact: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  requestedBy: { name: string; email: string };
  quotedBy: { name: string } | null;
  items: Line[];
};

function when(value: Date | null | undefined) {
  return value ? format(value, "dd MMM yyyy") : "";
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[128px_1fr] items-end gap-2 text-[11px]">
      <span className="font-semibold uppercase tracking-[0.08em] text-[#627d98]">{label}</span>
      <span className="border-b border-[#c7d2de] pb-0.5 text-[13px] text-[#243b53]">{value || "\u00a0"}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-md border border-[#c7d2de]">
      <h2 className="bg-[#102a43] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">{title}</h2>
      <div className="space-y-2 bg-white px-3 py-3">{children}</div>
    </section>
  );
}

export function TradeDocument({
  kind,
  pharmacy,
  order,
}: {
  kind: "quotation" | "invoice" | "delivery";
  pharmacy: Pharmacy;
  order: Order;
}) {
  const totals = documentTotals(order.items, order.taxRate, order.quotedAmount);
  const issued = order.quotedAt ?? order.createdAt;
  if (kind === "invoice") {
    return (
      <InvoiceSheet
        pharmacy={pharmacy}
        invoiceNo={order.invoiceNo ?? order.reference}
        issued={when(order.invoicedAt ?? order.quotedAt)}
        due={when(order.dueOn)}
        customerId={order.institution.license}
        preparedBy={order.quotedBy?.name}
        billTo={{
          name: order.requestedBy.name,
          company: order.institution.name,
          contact: order.institution.phone ?? order.institution.contact,
          address: order.deliveryAddress ?? order.institution.address,
          email: order.institution.email ?? order.requestedBy.email,
        }}
        lines={order.items.map((item) => ({
          id: item.id,
          description: [item.product.name, item.product.strength].filter(Boolean).join(" "),
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))}
        notes={[order.terms, order.adminMessage, order.notes].filter(Boolean).join("\n")}
        subtotal={totals.subtotal}
        taxRateLabel={`${order.taxRate}%`}
        tax={totals.tax}
        total={totals.total}
        amountPaid={order.amountPaid}
      />
    );
  }

  const orderedQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const deliveredQty = order.items.reduce((sum, item) => sum + (item.qtyDelivered ?? item.quantity), 0);
  const title = kind === "quotation" ? "Quotation" : "Delivery note";
  const kicker = kind === "quotation" ? "Price proposal" : "Goods dispatch / receipt record";

  return (
    <article className="mx-auto w-full max-w-[210mm] bg-white px-8 py-7 text-[#243b53] shadow-panel print:shadow-none">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-[#102a43]">{title.toUpperCase()}</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#627d98]">{kicker}</p>
        </div>
        {kind === "quotation" ? (
          <div className="text-right text-[11px]">
            <p className="font-semibold uppercase tracking-[0.12em] text-[#627d98]">Quotation no.</p>
            <p className="mt-1 font-mono text-sm text-[#102a43]">{order.reference}</p>
          </div>
        ) : null}
      </header>
      <div className="mt-3 h-px bg-[#2f5d7c]" />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <CompanyMark pharmacy={pharmacy} eyebrow={kind === "quotation" ? "Company details" : pharmacy.name} />
        <Panel title={kind === "delivery" ? "Delivery note details" : "Quotation details"}>
          {kind === "quotation" ? (
            <>
              <Row label="Customer ID" value={order.institution.license} />
              <Row label="Prepared by" value={order.quotedBy?.name} />
              <Row label="Date issued" value={when(issued)} />
              <Row label="Ready for delivery" value={when(order.readyOn)} />
              <Row label="Valid until" value={when(order.validUntil)} />
            </>
          ) : null}
          {kind === "delivery" ? (
            <>
              <Row label="Delivery note no." value={order.deliveryNoteNo} />
              <Row label="Date issued" value={when(issued)} />
              <Row label="Delivery date" value={when(order.readyOn)} />
              <Row label="Related invoice" value={order.invoiceNo ?? order.reference} />
              <Row label="Prepared by" value={order.quotedBy?.name} />
              <Row label="Dispatch ref." value={order.reference} />
            </>
          ) : null}
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Panel title={kind === "delivery" ? "Deliver to" : "Customer details"}>
          <Row label={kind === "delivery" ? "Customer" : "Customer name"} value={order.requestedBy.name} />
          <Row label="Company" value={order.institution.name} />
          <Row label="Contact" value={order.institution.phone ?? order.institution.contact} />
          <Row label="Address" value={order.deliveryAddress ?? order.institution.address} />
          <Row label="Email" value={order.institution.email ?? order.requestedBy.email} />
        </Panel>
        {kind === "delivery" ? (
          <Panel title="Delivery information">
            <Row label="Method" value={order.deliveryMethod} />
            <Row label="Vehicle / driver" value={order.vehicleDriver} />
            <Row label="Dispatch from" value={order.dispatchFrom} />
            <Row label="Order ref." value={order.reference} />
            <Row label="Site contact" value={order.institution.contact} />
          </Panel>
        ) : (
          <Panel title="Company bank details">
            <Row label="Bank name" value={pharmacy.bankName} />
            <Row label="Account name" value={pharmacy.accountName} />
            <Row label="Account number" value={pharmacy.accountNumber} />
            <Row label="Branch" value={pharmacy.bankBranch} />
            <Row label="SWIFT / sort" value={pharmacy.swiftCode} />
          </Panel>
        )}
      </div>

      <section className="mt-4 overflow-hidden rounded-md border border-[#c7d2de]">
        <h2 className="bg-[#102a43] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
          {kind === "delivery" ? "Items" : kind === "quotation" ? "Itemised quotation" : "Lines"}
        </h2>
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f4f7fa] text-[10px] uppercase tracking-[0.08em] text-[#627d98]">
            <tr>
              <th className="px-3 py-2">Description</th>
              {kind === "delivery" ? (
                <>
                  <th className="px-3 py-2 text-right">Qty ordered</th>
                  <th className="px-3 py-2 text-right">Qty delivered</th>
                  <th className="px-3 py-2">Remarks</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit price</th>
                  <th className="px-3 py-2 text-right">Line total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const unit = item.unitPrice ?? 0;
              const description = [item.product.name, item.product.strength].filter(Boolean).join(" ");
              return (
                <tr key={item.id} className="border-t border-[#c7d2de]">
                  <td className="px-3 py-2">
                    {description}
                    <span className="mt-0.5 block font-mono text-[10px] text-[#627d98]">{item.product.sku}</span>
                  </td>
                  {kind === "delivery" ? (
                    <>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{item.qtyDelivered ?? item.quantity}</td>
                      <td className="px-3 py-2">{item.remarks}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{item.unitPrice == null ? "—" : zmw(unit)}</td>
                      <td className="px-3 py-2 text-right">{item.unitPrice == null ? "—" : zmw(item.quantity * unit)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <Panel title={kind === "delivery" ? "Delivery notes / exceptions" : "Notes / terms"}>
          <p className="min-h-16 whitespace-pre-wrap text-xs leading-5">
            {[order.terms, order.adminMessage, kind === "delivery" ? order.deliveryNotes : null, order.notes]
              .filter(Boolean)
              .join("\n")}
          </p>
        </Panel>
        {kind === "delivery" ? (
          <Panel title="Delivery summary">
            <Row label="Line items" value={String(order.items.length)} />
            <Row label="Qty ordered" value={String(orderedQty)} />
            <Row label="Qty delivered" value={String(deliveredQty)} />
            <Row label="Status" value={STATUS_LABEL[order.status] ?? order.status} />
          </Panel>
        ) : (
          <section className="rounded-md border border-[#c7d2de] px-3 py-3 text-sm">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#102a43]">
              {kind === "quotation" ? "Quotation summary" : "Totals"}
            </h2>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{zmw(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Tax rate</dt><dd>{order.taxRate}%</dd></div>
              <div className="flex justify-between"><dt>Tax amount</dt><dd>{zmw(totals.tax)}</dd></div>
              <div className="flex justify-between border-t border-[#c7d2de] pt-1 font-semibold text-[#102a43]">
                <dt>{kind === "quotation" ? "Grand total" : "Total due"}</dt>
                <dd>{zmw(totals.total)}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      {kind === "delivery" ? (
        <section className="mt-3 rounded-md border border-[#c7d2de] px-3 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#102a43]">Receiver acknowledgement</h2>
          <p className="mt-2 text-xs">
            I acknowledge receipt of the items listed above, subject to any shortages or damage recorded in the notes.
          </p>
          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
            <p>Received by: ____________________</p>
            <p>Signature: ____________________</p>
            <p>Date: ____________________</p>
            <p className="sm:col-span-2">Name / position (print): ____________________</p>
            <p>Time received: ____________________</p>
          </div>
        </section>
      ) : (
        <p className="mt-4 text-[11px] text-[#627d98]">
          This quotation is subject to the terms and conditions stated above.
        </p>
      )}

      <footer className="mt-8 text-center text-[10px] text-[#627d98]">
        {title} made with Pharmacy
        {kind === "delivery" ? <span className="mt-1 block">Please retain this document as proof of delivery.</span> : null}
      </footer>
    </article>
  );
}

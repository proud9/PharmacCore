import { CompanyMark } from "@/components/documents/CompanyMark";
import { zmw } from "@/lib/documents";

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
  description: string;
  sku: string;
  quantity: number;
  unitPrice: number | null;
};

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

export function InvoiceSheet({
  pharmacy,
  invoiceNo,
  issued,
  due,
  customerId,
  preparedBy,
  billTo,
  lines,
  notes,
  subtotal,
  taxRateLabel,
  tax,
  discount = 0,
  total,
  amountPaid,
}: {
  pharmacy: Pharmacy;
  invoiceNo: string;
  issued: string;
  due: string;
  customerId?: string | null;
  preparedBy?: string | null;
  billTo: { name: string; company?: string | null; contact?: string | null; address?: string | null; email?: string | null };
  lines: Line[];
  notes?: string | null;
  subtotal: number;
  taxRateLabel: string;
  tax: number;
  discount?: number;
  total: number;
  amountPaid: number;
}) {
  const balance = Math.max(0, total - amountPaid);

  return (
    <article className="mx-auto w-full max-w-[210mm] bg-white px-8 py-7 text-[#243b53] shadow-panel print:shadow-none">
      <header>
        <h1 className="font-display text-3xl tracking-wide text-[#102a43]">INVOICE</h1>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#627d98]">Invoice document</p>
      </header>
      <div className="mt-3 h-px bg-[#2f5d7c]" />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <CompanyMark pharmacy={pharmacy} eyebrow={pharmacy.name} />
        <Panel title="Invoice details">
          <Row label="Invoice no." value={invoiceNo} />
          <Row label="Date issued" value={issued} />
          <Row label="Due date" value={due} />
          <Row label="Customer ID" value={customerId} />
          <Row label="Prepared by" value={preparedBy} />
          <Row label="Currency" value="ZMW" />
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Panel title="Bill to">
          <Row label="Customer name" value={billTo.name} />
          <Row label="Company" value={billTo.company} />
          <Row label="Contact" value={billTo.contact} />
          <Row label="Billing address" value={billTo.address} />
          <Row label="Email" value={billTo.email} />
        </Panel>
        <Panel title="Payment / bank details">
          <Row label="Bank name" value={pharmacy.bankName} />
          <Row label="Account name" value={pharmacy.accountName} />
          <Row label="Account number" value={pharmacy.accountNumber} />
          <Row label="Branch" value={pharmacy.bankBranch} />
          <Row label="SWIFT / sort" value={pharmacy.swiftCode} />
        </Panel>
      </div>

      <section className="mt-4 overflow-hidden rounded-md border border-[#c7d2de]">
        <h2 className="bg-[#102a43] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Lines</h2>
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f4f7fa] text-[10px] uppercase tracking-[0.08em] text-[#627d98]">
            <tr>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Unit price</th>
              <th className="px-3 py-2 text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-[#c7d2de]">
                <td className="px-3 py-2">
                  {line.description}
                  <span className="mt-0.5 block font-mono text-[10px] text-[#627d98]">{line.sku}</span>
                </td>
                <td className="px-3 py-2 text-right">{line.quantity}</td>
                <td className="px-3 py-2 text-right">{line.unitPrice == null ? "—" : zmw(line.unitPrice)}</td>
                <td className="px-3 py-2 text-right">{line.unitPrice == null ? "—" : zmw(line.unitPrice * line.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Notes, payment terms and disclaimers">
          <p className="min-h-16 whitespace-pre-wrap text-xs leading-5">{notes}</p>
        </Panel>
        <section className="rounded-md border border-[#c7d2de] px-3 py-3 text-sm">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#102a43]">Totals</h2>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{zmw(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Tax rate</dt><dd>{taxRateLabel}</dd></div>
            <div className="flex justify-between"><dt>Tax amount</dt><dd>{zmw(tax)}</dd></div>
            {discount > 0 ? (
              <div className="flex justify-between"><dt>Discount</dt><dd>{zmw(discount)}</dd></div>
            ) : null}
            <div className="flex justify-between border-t border-[#c7d2de] pt-1 font-semibold text-[#102a43]">
              <dt>Total due</dt>
              <dd>{zmw(total)}</dd>
            </div>
            <div className="flex justify-between"><dt>Amount paid</dt><dd>{zmw(amountPaid)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd>{zmw(balance)}</dd></div>
          </dl>
        </section>
      </div>

      <p className="mt-4 text-[11px] text-[#627d98]">
        Thank you for your business. Please use the invoice number as your payment reference. Payment is due by the date shown above.
      </p>
      <footer className="mt-8 text-center text-[10px] text-[#627d98]">Invoice made with Pharmacy</footer>
    </article>
  );
}

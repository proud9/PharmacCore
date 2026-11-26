import { format } from "date-fns";
import { CompanyMark } from "@/components/documents/CompanyMark";
import { InvoiceSheet } from "@/components/documents/InvoiceSheet";
import { documentTotals, zmw } from "@/lib/documents";
import { statusLabel, termsText } from "@/lib/trade";

/** A business (on Parallax, or a private contact) as printed on a document. */
export type Party = {
  id?: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  tpin: string | null;
  licenceNo: string | null;
  logoPath: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  bankBranch: string | null;
  swiftCode: string | null;
};

export type DocKind = "inquiry" | "quotation" | "purchase-order" | "invoice" | "delivery-note";

type Line = {
  id: string;
  name: string;
  strength: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number | null;
  qtyDispatched: number | null;
  remarks: string | null;
};

export type DocOrder = {
  inquiryNo: string;
  quoteNo: string | null;
  poNumber: string | null;
  invoiceNo: string | null;
  deliveryNoteNo: string | null;
  status: string;
  paymentTerms: string;
  creditDays: number;
  buyerMessage: string | null;
  sellerMessage: string | null;
  terms: string | null;
  taxRate: number;
  quotedAmount: number | null;
  amountPaid: number;
  deliveryAddress: string | null;
  deliveryMethod: string | null;
  vehicleDriver: string | null;
  dispatchFrom: string | null;
  deliveryNotes: string | null;
  createdAt: Date;
  quotedAt: Date | null;
  orderedAt: Date | null;
  invoicedAt: Date | null;
  dispatchedAt: Date | null;
  readyOn: Date | null;
  validUntil: Date | null;
  dueOn: Date | null;
  items: Line[];
};

const TITLE: Record<DocKind, [string, string]> = {
  inquiry: ["Inquiry", "Request for quotation"],
  quotation: ["Quotation", "Price proposal"],
  "purchase-order": ["Purchase order", "Order placed"],
  invoice: ["Invoice", ""],
  "delivery-note": ["Delivery note", "Goods dispatch / receipt record"],
};

function when(value: Date | null | undefined) {
  return value ? format(value, "dd MMM yyyy") : "";
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[128px_1fr] items-end gap-2 text-[11px]">
      <span className="font-semibold uppercase tracking-[0.08em] text-foil">{label}</span>
      <span className="border-b border-rule pb-0.5 text-[13px] text-ink">{value || " "}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-md border border-rule">
      <h2 className="bg-pine-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">{title}</h2>
      <div className="space-y-2 bg-white px-3 py-3">{children}</div>
    </section>
  );
}

function describe(item: Line) {
  return [item.name, item.strength].filter(Boolean).join(" ") + (item.unit ? ` (${item.unit})` : "");
}

/**
 * Printable trade documents. The inquiry and purchase order are issued by the buyer; the
 * quotation, invoice and delivery note by the seller. Each carries its issuer's letterhead.
 */
export function TradeDocument({ kind, seller, buyer, order }: { kind: DocKind; seller: Party; buyer: Party; order: DocOrder }) {
  const priced = kind !== "inquiry" && kind !== "delivery-note";
  const totals = documentTotals(
    order.items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })),
    order.taxRate,
    order.quotedAmount,
  );

  if (kind === "invoice") {
    return (
      <InvoiceSheet
        pharmacy={seller}
        invoiceNo={order.invoiceNo ?? order.inquiryNo}
        issued={when(order.invoicedAt)}
        due={when(order.dueOn)}
        customerId={buyer.tpin}
        preparedBy={seller.name}
        billTo={{ name: buyer.name, company: buyer.licenceNo, contact: buyer.phone, address: order.deliveryAddress ?? buyer.address, email: buyer.email }}
        lines={order.items.map((item) => ({
          id: item.id,
          description: describe(item),
          sku: "",
          quantity: order.dispatchedAt ? item.qtyDispatched ?? item.quantity : item.quantity,
          unitPrice: item.unitPrice,
        }))}
        notes={[termsText(order.paymentTerms, order.creditDays), order.poNumber ? `Your purchase order ${order.poNumber}` : null, order.terms]
          .filter(Boolean)
          .join("\n")}
        subtotal={totals.subtotal}
        taxRateLabel={`${order.taxRate}%`}
        tax={totals.tax}
        total={order.quotedAmount ?? totals.total}
        amountPaid={order.amountPaid}
      />
    );
  }

  const [title, kicker] = TITLE[kind];
  const byBuyer = kind === "inquiry" || kind === "purchase-order";
  const issuer = byBuyer ? buyer : seller;
  const recipient = byBuyer ? seller : buyer;
  const number =
    kind === "inquiry" ? order.inquiryNo : kind === "quotation" ? order.quoteNo : kind === "purchase-order" ? order.poNumber : order.deliveryNoteNo;
  const issued =
    kind === "inquiry" ? order.createdAt : kind === "quotation" ? order.quotedAt : kind === "purchase-order" ? order.orderedAt : order.dispatchedAt;

  return (
    <article className="mx-auto w-full max-w-[210mm] bg-white px-8 py-7 text-ink shadow-panel print:shadow-none">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-pine-900">{title.toUpperCase()}</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foil">{kicker}</p>
        </div>
        <div className="text-right text-[11px]">
          <p className="font-semibold uppercase tracking-[0.12em] text-foil">{title} no.</p>
          <p className="mt-1 font-mono text-sm text-pine-900">{number}</p>
        </div>
      </header>
      <div className="mt-3 h-px bg-pine-700" />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <CompanyMark pharmacy={issuer} eyebrow={byBuyer ? "From (buyer)" : "From (supplier)"} />
        <Panel title={`${title} details`}>
          <Row label="Date issued" value={when(issued)} />
          {kind !== "inquiry" ? <Row label="Inquiry ref." value={order.inquiryNo} /> : null}
          {kind === "quotation" ? (
            <>
              <Row label="Ready for delivery" value={when(order.readyOn)} />
              <Row label="Valid until" value={when(order.validUntil)} />
            </>
          ) : null}
          {kind === "purchase-order" ? <Row label="Quotation ref." value={order.quoteNo} /> : null}
          {kind === "delivery-note" ? (
            <>
              <Row label="Purchase order" value={order.poNumber} />
              <Row label="Related invoice" value={order.invoiceNo} />
            </>
          ) : null}
          {kind !== "delivery-note" ? <Row label="Payment terms" value={termsText(order.paymentTerms, order.creditDays)} /> : null}
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Panel title={byBuyer ? "To (supplier)" : kind === "delivery-note" ? "Deliver to" : "Customer"}>
          <Row label="Name" value={recipient.name} />
          <Row label="Contact" value={[recipient.phone, recipient.email].filter(Boolean).join(" · ")} />
          <Row label="Address" value={kind === "delivery-note" ? order.deliveryAddress ?? recipient.address : recipient.address} />
          <Row label="TPIN" value={recipient.tpin} />
        </Panel>
        {kind === "delivery-note" ? (
          <Panel title="Delivery information">
            <Row label="Method" value={order.deliveryMethod} />
            <Row label="Vehicle / driver" value={order.vehicleDriver} />
            <Row label="Dispatch from" value={order.dispatchFrom} />
          </Panel>
        ) : kind === "quotation" ? (
          <Panel title="Bank details">
            <Row label="Bank name" value={seller.bankName} />
            <Row label="Account name" value={seller.accountName} />
            <Row label="Account number" value={seller.accountNumber} />
            <Row label="Branch" value={seller.bankBranch} />
            <Row label="SWIFT / sort" value={seller.swiftCode} />
          </Panel>
        ) : (
          <Panel title="Deliver to">
            <Row label="Address" value={order.deliveryAddress ?? buyer.address} />
            <Row label="Contact" value={buyer.phone} />
          </Panel>
        )}
      </div>

      <section className="mt-4 overflow-hidden rounded-md border border-rule">
        <h2 className="bg-pine-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Items</h2>
        <table className="w-full text-left text-xs">
          <thead className="bg-shelf text-[10px] uppercase tracking-[0.08em] text-foil">
            <tr>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Qty{kind === "delivery-note" ? " ordered" : ""}</th>
              {kind === "delivery-note" ? <th className="px-3 py-2 text-right">Qty delivered</th> : null}
              {priced ? <th className="px-3 py-2 text-right">Unit price</th> : null}
              {priced ? <th className="px-3 py-2 text-right">Line total</th> : null}
              {kind === "delivery-note" ? <th className="px-3 py-2">Remarks</th> : null}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-rule">
                <td className="px-3 py-2">{describe(item)}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                {kind === "delivery-note" ? <td className="px-3 py-2 text-right">{item.qtyDispatched ?? item.quantity}</td> : null}
                {priced ? <td className="px-3 py-2 text-right">{item.unitPrice == null ? "—" : zmw(item.unitPrice)}</td> : null}
                {priced ? <td className="px-3 py-2 text-right">{item.unitPrice == null ? "—" : zmw(item.unitPrice * item.quantity)}</td> : null}
                {kind === "delivery-note" ? <td className="px-3 py-2">{item.remarks}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Notes / terms">
          <p className="min-h-16 whitespace-pre-wrap text-xs leading-5">
            {[
              byBuyer ? order.buyerMessage : order.sellerMessage,
              kind === "quotation" || kind === "purchase-order" ? order.terms : null,
              kind === "delivery-note" ? order.deliveryNotes : null,
            ]
              .filter(Boolean)
              .join("\n")}
          </p>
        </Panel>
        {priced ? (
          <section className="rounded-md border border-rule px-3 py-3 text-sm">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-pine-900">Summary</h2>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{zmw(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Tax rate</dt><dd>{order.taxRate}%</dd></div>
              <div className="flex justify-between"><dt>Tax amount</dt><dd>{zmw(totals.tax)}</dd></div>
              <div className="flex justify-between border-t border-rule pt-1 font-semibold text-pine-900">
                <dt>Total</dt>
                <dd>{zmw(order.quotedAmount ?? totals.total)}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <Panel title="Summary">
            <Row label="Line items" value={String(order.items.length)} />
            <Row label="Status" value={statusLabel(order.status, byBuyer ? "buyer" : "seller")} />
          </Panel>
        )}
      </div>

      {kind === "delivery-note" ? (
        <section className="mt-3 rounded-md border border-rule px-3 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pine-900">Receiver acknowledgement</h2>
          <p className="mt-2 text-xs">I acknowledge receipt of the items listed above, subject to any shortages or damage recorded in the notes.</p>
          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
            <p>Received by: ____________________</p>
            <p>Signature: ____________________</p>
            <p>Date: ____________________</p>
          </div>
        </section>
      ) : kind === "purchase-order" ? (
        <section className="mt-3 rounded-md border border-rule px-3 py-3 text-xs">
          <p>Authorised by: ____________________ &nbsp; Signature: ____________________ &nbsp; Date: ____________________</p>
        </section>
      ) : null}

      <footer className="mt-8 text-center text-[10px] text-foil">{title} made with Parallax</footer>
    </article>
  );
}

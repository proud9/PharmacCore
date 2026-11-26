import { format } from "date-fns";
import { BILLING_METHOD_LABEL, PAYMENT_SOURCE_LABEL } from "@/lib/billing";
import { CONTACT } from "@/lib/contact";
import { money } from "@/lib/utils";

export type ReceiptData = {
  receiptNo: string;
  orgName: string;
  amount: number;
  paidOn: Date;
  months: number;
  periodStart: Date;
  periodEnd: Date;
  method: string;
  source: string;
  provider: string | null;
  reference: string | null;
  recordedByName: string | null;
  createdAt: Date;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-rule py-1.5 text-[13px] last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foil">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

/** A subscription receipt from Parallax to one business. Same sheet and palette as trade documents. */
export function SubscriptionReceipt({ payment, town }: { payment: ReceiptData; town?: string | null }) {
  const months = `${payment.months} month${payment.months === 1 ? "" : "s"}`;
  return (
    <article className="mx-auto w-full max-w-[210mm] bg-white px-8 py-7 text-ink shadow-panel print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/brand/parallax-logo-96.png" alt="" width={48} height={48} className="h-12 w-12" />
          <div>
            <p className="font-display text-xl text-pine-900">Parallax</p>
            <p className="text-xs text-foil">
              {[CONTACT.address, CONTACT.phone, CONTACT.email].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="font-display text-3xl tracking-wide text-pine-900">RECEIPT</h1>
          <p className="mt-1 font-mono text-sm text-pine-900">{payment.receiptNo}</p>
        </div>
      </header>
      <div className="mt-3 h-px bg-pine-700" />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-rule">
          <h2 className="bg-pine-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Received from</h2>
          <div className="px-3 py-3">
            <p className="font-display text-lg leading-tight text-pine-900">{payment.orgName}</p>
            {town ? <p className="text-sm text-foil">{town}</p> : null}
          </div>
        </section>
        <section className="overflow-hidden rounded-md border border-rule">
          <h2 className="bg-pine-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Receipt details</h2>
          <div className="px-3 py-1">
            <Field label="Receipt no." value={payment.receiptNo} />
            <Field label="Date paid" value={format(payment.paidOn, "dd MMM yyyy")} />
            <Field label="Issued" value={format(payment.createdAt, "dd MMM yyyy")} />
          </div>
        </section>
      </div>

      <section className="mt-4 overflow-hidden rounded-md border border-rule">
        <h2 className="bg-pine-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Payment</h2>
        <table className="w-full text-sm">
          <thead className="bg-shelf text-[10px] uppercase tracking-[0.08em] text-foil">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Description</th>
              <th className="px-3 py-2 text-left font-semibold">Period</th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-rule">
              <td className="px-3 py-3">Parallax subscription, {months}</td>
              <td className="px-3 py-3">
                {format(payment.periodStart, "dd MMM yyyy")} – {format(payment.periodEnd, "dd MMM yyyy")}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{money(payment.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-rule font-semibold text-pine-900">
              <td className="px-3 py-2" colSpan={2}>
                Total received
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{money(payment.amount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <section className="rounded-md border border-rule px-3 py-1">
          <Field label="Paid by" value={BILLING_METHOD_LABEL[payment.method] ?? payment.method} />
          <Field label="Reference" value={payment.reference ?? "—"} />
          <Field
            label="Recorded"
            value={
              payment.source === "ONLINE"
                ? `${PAYMENT_SOURCE_LABEL.ONLINE}${payment.provider ? ` (${payment.provider})` : ""}`
                : `${PAYMENT_SOURCE_LABEL.MANUAL}${payment.recordedByName ? `: ${payment.recordedByName}` : ""}`
            }
          />
        </section>
        <p className="w-fit rotate-[-4deg] rounded-lg border-2 border-dispensary px-4 py-2 font-display text-xl font-semibold uppercase tracking-[0.2em] text-dispensary">
          Paid
        </p>
      </div>

      <footer className="mt-8 text-center text-[10px] text-foil">Receipt issued by Parallax for a subscription payment. Keep it for your records.</footer>
    </article>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import { usePost } from "@/components/usePost";
import { LookupPicker, type Picked } from "@/components/search/LookupPicker";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, PAYMENT_TERMS, PAYMENT_TERMS_LABEL } from "@/lib/trade";
import { money } from "@/lib/utils";

/** Order step forms. Each POSTs an action to /api/trade/orders/[id] and refreshes the page. */

export type FormLine = {
  id: string;
  name: string;
  strength: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number | null;
  qtyDispatched: number | null;
  sellerProductId: string | null;
  sellerProductName?: string | null;
};

function lineLabel(line: FormLine) {
  return [line.name, line.strength].filter(Boolean).join(" ") + (line.unit ? ` (${line.unit})` : "");
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-ink/60">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FormError({ text }: { text: string }) {
  return text ? (
    <p className="mt-2 text-sm text-rust" role="alert">
      {text}
    </p>
  ) : null;
}

export function QuoteForm({
  orderId,
  lines,
  taxRate,
  readyOn,
  validUntil,
  terms,
  message,
  paymentTerms,
  creditDays,
  accepted,
  linkItems,
}: {
  orderId: string;
  lines: FormLine[];
  taxRate: number;
  readyOn: string;
  validUntil: string;
  terms: string;
  message: string;
  paymentTerms: string;
  creditDays: number;
  accepted: boolean;
  /** The seller keeps stock: each line is linked to one of its items so stock leaves at dispatch. */
  linkItems: boolean;
}) {
  const { post, error, saving } = usePost();
  const [prices, setPrices] = useState(() => Object.fromEntries(lines.map((l) => [l.id, l.unitPrice ?? 0])));
  const [qty, setQty] = useState(() => Object.fromEntries(lines.map((l) => [l.id, l.quantity])));
  const [items, setItems] = useState<Record<string, Picked | null>>(() =>
    Object.fromEntries(lines.map((l) => [l.id, l.sellerProductId ? { id: l.sellerProductId, name: l.sellerProductName ?? l.name } : null])),
  );
  const [tax, setTax] = useState(taxRate);
  const [termsValue, setTermsValue] = useState(paymentTerms);
  const subtotal = lines.reduce((sum, l) => sum + (qty[l.id] ?? 0) * (prices[l.id] ?? 0), 0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post(`/api/trade/orders/${orderId}`, {
      action: "QUOTE",
      lines: lines.map((l) => ({
        id: l.id,
        unitPrice: Number(prices[l.id]) || 0,
        quantity: Number(qty[l.id]) || l.quantity,
        ...(linkItems ? { sellerProductId: items[l.id]?.id ?? null } : {}),
      })),
      taxRate: Number(tax) || 0,
      readyOn: form.get("readyOn") || undefined,
      validUntil: form.get("validUntil") || undefined,
      terms: form.get("terms"),
      message: form.get("message"),
      paymentTerms: termsValue,
      creditDays: Number(form.get("creditDays") ?? creditDays),
    });
  }

  return (
    <Panel
      title={accepted ? "Change the price" : "Send a quotation"}
      hint={
        accepted
          ? "The buyer has accepted the current price. A new price goes back to them to accept again."
          : "Price each line in Kwacha. Only this buyer sees these prices."
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="rounded-xl border border-pine-900/10 p-3">
            <p className="text-sm font-semibold">{lineLabel(line)}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[100px_140px_1fr]">
              <div>
                <label className="text-xs">Quantity</label>
                <input type="number" min={1} value={qty[line.id]} onChange={(e) => setQty({ ...qty, [line.id]: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs">Unit price (ZMW)</label>
                <input type="number" min={0} step="0.01" required value={prices[line.id]} onChange={(e) => setPrices({ ...prices, [line.id]: Number(e.target.value) })} />
              </div>
              {linkItems ? (
                <div>
                  <label className="text-xs">Your item (stock leaves from it)</label>
                  <LookupPicker
                    kind="products"
                    value={items[line.id] ?? null}
                    onChange={(value) => {
                      setItems({ ...items, [line.id]: value });
                      const price = (value as (Picked & { price?: number }) | null)?.price;
                      if (value && price && !prices[line.id]) setPrices({ ...prices, [line.id]: price });
                    }}
                    placeholder="Search your items…"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label>Tax %</label>
            <input type="number" min={0} max={100} step="0.01" value={tax} onChange={(e) => setTax(Number(e.target.value))} />
          </div>
          <div>
            <label>Ready on</label>
            <input name="readyOn" type="date" defaultValue={readyOn} />
          </div>
          <div>
            <label>Valid until</label>
            <input name="validUntil" type="date" defaultValue={validUntil} />
          </div>
          <div>
            <label>Payment terms</label>
            <select value={termsValue} onChange={(e) => setTermsValue(e.target.value)}>
              {PAYMENT_TERMS.map((value) => (
                <option key={value} value={value}>
                  {PAYMENT_TERMS_LABEL[value]}
                </option>
              ))}
            </select>
          </div>
          {termsValue === "CREDIT" ? (
            <div>
              <label>Credit days</label>
              <input name="creditDays" type="number" min={0} max={365} defaultValue={creditDays} />
            </div>
          ) : null}
        </div>
        <div>
          <label>Terms printed on the quotation</label>
          <input name="terms" defaultValue={terms} />
        </div>
        <div>
          <label>Message to the buyer</label>
          <textarea name="message" rows={2} defaultValue={message} />
        </div>
        <p className="text-sm">
          Total {money(subtotal * (1 + (Number(tax) || 0) / 100))}
          {tax ? ` (incl. ${tax}% tax)` : ""}
        </p>
        <FormError text={error} />
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Sending…" : accepted ? "Send the new price" : "Send quotation"}
        </button>
      </form>
    </Panel>
  );
}

export function AcceptForm({ orderId, total, validUntil, onBehalf }: { orderId: string; total: string; validUntil: string | null; onBehalf?: string }) {
  const { post, error, saving } = usePost();
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post(`/api/trade/orders/${orderId}`, { action: "ACCEPT", poNumber: form.get("poNumber") || undefined });
  }
  return (
    <Panel
      title={onBehalf ? `Record that ${onBehalf} accepted` : "Accept the quote"}
      hint={`Total ${total}${validUntil ? `, valid until ${validUntil}` : ""}. Accepting sends your purchase order.`}
    >
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label>Your purchase order no. (optional)</label>
          <input name="poNumber" maxLength={60} placeholder="Leave blank to number it for you" />
        </div>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Sending…" : "Accept and send purchase order"}
        </button>
      </form>
      <FormError text={error} />
    </Panel>
  );
}

export function StepButton({
  orderId,
  body,
  label,
  confirm,
  tone = "ghost",
}: {
  orderId: string;
  body: Record<string, unknown>;
  label: string;
  confirm?: string;
  tone?: "ghost" | "primary";
}) {
  const { post, error, saving } = usePost();
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={tone === "primary" ? "btn btn-primary" : "btn btn-ghost"}
        disabled={saving}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          post(`/api/trade/orders/${orderId}`, body);
        }}
      >
        {label}
      </button>
      <FormError text={error} />
    </span>
  );
}

export function InvoiceForm({ orderId, defaultDue }: { orderId: string; defaultDue: string }) {
  const { post, error, saving } = usePost();
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post(`/api/trade/orders/${orderId}`, {
      action: "INVOICE",
      invoiceNo: form.get("invoiceNo") || undefined,
      dueOn: form.get("dueOn") || undefined,
    });
  }
  return (
    <Panel title="Issue the invoice" hint="Uses the accepted prices (or the quantities sent, if already dispatched).">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label>Invoice no. (optional)</label>
          <input name="invoiceNo" maxLength={60} placeholder="Numbered for you if blank" />
        </div>
        <div>
          <label>Due on</label>
          <input name="dueOn" type="date" defaultValue={defaultDue} />
        </div>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Issuing…" : "Issue invoice"}
        </button>
      </form>
      <FormError text={error} />
    </Panel>
  );
}

export function DispatchForm({ orderId, lines, stockNote }: { orderId: string; lines: FormLine[]; stockNote: boolean }) {
  const { post, error, saving } = usePost();
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post(`/api/trade/orders/${orderId}`, {
      action: "DISPATCH",
      lines: lines.map((l) => ({ id: l.id, qtyDispatched: Number(form.get(`qty-${l.id}`)) || 0 })),
      deliveryNoteNo: form.get("deliveryNoteNo") || undefined,
      deliveryMethod: form.get("deliveryMethod"),
      vehicleDriver: form.get("vehicleDriver"),
      dispatchFrom: form.get("dispatchFrom"),
      deliveryNotes: form.get("deliveryNotes"),
    });
  }
  return (
    <Panel
      title="Dispatch with a delivery note"
      hint={stockNote ? "The quantities sent leave your stock now, earliest expiry first." : "Record what was sent."}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="grid grid-cols-[1fr_110px] items-end gap-2">
            <label className="pb-2 text-sm">
              {lineLabel(line)} · ordered {line.quantity}
            </label>
            <input name={`qty-${line.id}`} type="number" min={0} max={line.quantity} defaultValue={line.quantity} aria-label={`Quantity sent: ${line.name}`} />
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Delivery note no. (optional)</label>
            <input name="deliveryNoteNo" maxLength={60} placeholder="Numbered for you if blank" />
          </div>
          <div>
            <label>Delivery method</label>
            <input name="deliveryMethod" placeholder="e.g. Own truck, courier" />
          </div>
          <div>
            <label>Vehicle and driver</label>
            <input name="vehicleDriver" />
          </div>
          <div>
            <label>Dispatched from</label>
            <input name="dispatchFrom" />
          </div>
        </div>
        <div>
          <label>Notes for the delivery note</label>
          <textarea name="deliveryNotes" rows={2} />
        </div>
        <FormError text={error} />
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Dispatching…" : "Dispatch"}
        </button>
      </form>
    </Panel>
  );
}

export function ReceiveForm({ orderId, lines, toInventory, onBehalf }: { orderId: string; lines: FormLine[]; toInventory: boolean; onBehalf?: string }) {
  const { post, error, saving } = usePost();
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post(`/api/trade/orders/${orderId}`, {
      action: "RECEIVE",
      lines: lines.map((l) => ({ id: l.id, qtyReceived: Number(form.get(`got-${l.id}`)) || 0 })),
    });
  }
  return (
    <Panel
      title={onBehalf ? `Record delivery to ${onBehalf}` : "Confirm what arrived"}
      hint={
        toInventory
          ? "Each line goes to the delivery queue in Inventory, where you add its batch and expiry to put it in stock."
          : "Record the quantities received."
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="grid grid-cols-[1fr_110px] items-end gap-2">
            <label className="pb-2 text-sm">
              {lineLabel(line)} · sent {line.qtyDispatched ?? line.quantity}
            </label>
            <input
              name={`got-${line.id}`}
              type="number"
              min={0}
              max={line.qtyDispatched ?? line.quantity}
              defaultValue={line.qtyDispatched ?? line.quantity}
              aria-label={`Quantity received: ${line.name}`}
            />
          </div>
        ))}
        <FormError text={error} />
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Confirm received"}
        </button>
      </form>
    </Panel>
  );
}

export function PaymentForm({ orderId, balance, onBehalf }: { orderId: string; balance: number; onBehalf?: string }) {
  const { post, error, saving } = usePost();
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ok = await post(`/api/trade/orders/${orderId}`, {
      action: "PAYMENT",
      amount: Number(form.get("amount")),
      method: form.get("method"),
      paidOn: form.get("paidOn"),
      reference: form.get("reference"),
    });
    if (ok) formElement.reset();
  }
  return (
    <Panel
      title={onBehalf ? `Record a payment to ${onBehalf}` : "Record a payment received"}
      hint={`Balance ${money(balance)}. Parallax only records payments; money moves outside it.`}
    >
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <div>
          <label>Amount (ZMW)</label>
          <input name="amount" type="number" min={0.01} step="0.01" max={balance} defaultValue={balance} required />
        </div>
        <div>
          <label>Method</label>
          <select name="method" defaultValue="BANK_TRANSFER">
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABEL[method]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Paid on</label>
          <input name="paidOn" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
        </div>
        <div>
          <label>Reference</label>
          <input name="reference" maxLength={100} />
        </div>
        <div className="sm:col-span-2">
          <FormError text={error} />
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Record payment"}
          </button>
        </div>
      </form>
    </Panel>
  );
}

export function NotesForm({ orderId, notes }: { orderId: string; notes: string }) {
  const { post, error, saving } = usePost();
  const [saved, setSaved] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const form = new FormData(event.currentTarget);
    if (await post(`/api/trade/orders/${orderId}`, { action: "NOTES", notes: form.get("notes") ?? "" })) setSaved(true);
  }
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <label htmlFor="private-notes" className="font-display text-lg normal-case tracking-normal text-pine-900">
        Private notes
      </label>
      <p className="text-xs text-ink/60">Only your business sees these.</p>
      <textarea id="private-notes" name="notes" rows={3} defaultValue={notes} className="mt-2" />
      <FormError text={error} />
      <button className="btn btn-ghost mt-2" disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved" : "Save notes"}
      </button>
    </form>
  );
}

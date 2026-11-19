"use client";

import { FormEvent } from "react";
import { usePost } from "./usePost";

/** Manufacturer: its own invoice number and due date for an accepted order. */
export function SupplierInvoiceForm({
  id,
  invoiceNo = "",
  dueOn = "",
  terms = "",
  onBehalf,
}: {
  /** Finance entering a paper invoice for this manufacturer (it has no login). */
  onBehalf?: string;
  id: string;
  invoiceNo?: string;
  dueOn?: string;
  terms?: string;
}) {
  const { post, error, saving } = usePost();
  const issued = Boolean(invoiceNo);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post(`/api/purchases/${id}/invoice`, {
      invoiceNo: form.get("invoiceNo"),
      dueOn: form.get("dueOn"),
      terms: form.get("terms"),
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">{onBehalf ? `${onBehalf}'s invoice` : issued ? "Update invoice" : "Send invoice"}</h2>
      <p className="mt-1 text-sm text-ink/60">The invoice is for the accepted price. The wholesale records payments against it.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label>{onBehalf ? "Their invoice no." : "Your invoice no."}</label>
          <input name="invoiceNo" required defaultValue={invoiceNo} placeholder="e.g. INV-20931" />
        </div>
        <div>
          <label>Due date</label>
          <input name="dueOn" type="date" required defaultValue={dueOn} />
        </div>
      </div>
      <div className="mt-3">
        <label>Payment terms</label>
        <textarea name="terms" rows={2} defaultValue={terms} />
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={saving}>
        {saving ? "Saving…" : issued || onBehalf ? "Save invoice" : "Send invoice"}
      </button>
    </form>
  );
}

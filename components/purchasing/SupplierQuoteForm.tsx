"use client";

import { FormEvent } from "react";
import { usePost } from "./usePost";

type Line = { id: string; name: string; quantity: number; unitCost: number };

/** Manufacturer: price each line, tax, ready date and how long the price holds. */
export function SupplierQuoteForm({
  id,
  lines,
  requote,
  taxRate = 0,
  readyOn = "",
  validUntil = "",
  message = "",
  terms = "",
  onBehalf,
}: {
  /** Finance entering a paper quote for this manufacturer (it has no login). */
  onBehalf?: string;
  id: string;
  lines: Line[];
  /** A price was already sent; this replaces it. */
  requote: boolean;
  taxRate?: number;
  readyOn?: string;
  validUntil?: string;
  message?: string;
  terms?: string;
}) {
  const { post, error, saving } = usePost();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post(`/api/purchases/${id}/quote`, {
      lines: lines.map((line) => ({ id: line.id, unitCost: Number(form.get(`price-${line.id}`)) })),
      taxRate: Number(form.get("taxRate")),
      readyOn: form.get("readyOn"),
      validUntil: form.get("validUntil"),
      message: form.get("message"),
      terms: form.get("terms"),
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">{onBehalf ? `Enter ${onBehalf}'s price` : requote ? "Change your price" : "Send your price"}</h2>
      <p className="mt-1 text-sm text-ink/60">
        {onBehalf
          ? "From the manufacturer's quotation. Then accept it to go ahead."
          : "Price each line in Kwacha. Tax is added to the line totals."}
      </p>
      <div className="mt-4 space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="grid grid-cols-[1fr_88px] items-end gap-2">
            <div>
              <label>
                {line.name} × {line.quantity}
              </label>
              <input name={`price-${line.id}`} type="number" min={0} step="0.01" required defaultValue={line.unitCost || ""} />
            </div>
            <p className="pb-2 text-xs text-ink/50">ZMW each</p>
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label>Tax rate (%)</label>
            <input name="taxRate" type="number" min={0} max={100} step="0.01" required defaultValue={taxRate} />
          </div>
          <div>
            <label>Ready to dispatch</label>
            <input name="readyOn" type="date" required defaultValue={readyOn} />
          </div>
          <div>
            <label>Price valid until</label>
            <input name="validUntil" type="date" required defaultValue={validUntil} />
          </div>
        </div>
        <div>
          <label>Message to the wholesale</label>
          <textarea name="message" rows={2} defaultValue={message} placeholder="Substitutes, pack sizes, timing…" />
        </div>
        <div>
          <label>Terms</label>
          <textarea name="terms" rows={2} defaultValue={terms} placeholder="Payment within 30 days…" />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={saving}>
        {saving ? "Saving…" : onBehalf ? "Save price" : requote ? "Send the new price" : "Send price"}
      </button>
    </form>
  );
}

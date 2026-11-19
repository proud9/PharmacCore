"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Line = { id: string; name: string; quantity: number; unitPrice: number };

export function QuoteForm({
  id,
  lines,
  taxRate = 0,
  terms = "",
  adminMessage = "",
  accepted = false,
  readyOn = "",
  validUntil = "",
}: {
  /** yyyy-MM-dd; the dates already sent, so changing a price keeps them unless edited. */
  readyOn?: string;
  validUntil?: string;
  id: string;
  /** The buyer already accepted the current price: a new one goes back to them to accept again. */
  accepted?: boolean;
  lines: Line[];
  taxRate?: number;
  terms?: string;
  adminMessage?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/consignments/${id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: lines.map((line) => ({
          id: line.id,
          unitPrice: Number(form.get(`price-${line.id}`)),
        })),
        taxRate: Number(form.get("taxRate")),
        readyOn: form.get("readyOn"),
        validUntil: form.get("validUntil"),
        adminMessage: form.get("adminMessage"),
        terms: form.get("terms"),
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not send quotation");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">{accepted ? "Change the price" : "Send a quotation"}</h2>
      <p className="mt-1 text-sm text-ink/60">
        {accepted
          ? "The buyer has accepted the current price. A new price goes back to them to accept again before the order is prepared."
          : "Price each line in Kwacha. Tax is added to the line totals."}
      </p>
      <div className="mt-4 space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="grid grid-cols-[1fr_88px] items-end gap-2">
            <div>
              <label>
                {line.name} × {line.quantity}
              </label>
              <input name={`price-${line.id}`} type="number" min={0} step="0.01" required defaultValue={line.unitPrice} />
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
            <label>Ready for delivery</label>
            <input name="readyOn" type="date" required defaultValue={readyOn} />
          </div>
          <div>
            <label>Quotation valid until</label>
            <input name="validUntil" type="date" required defaultValue={validUntil} />
          </div>
        </div>
        <div>
          <label>Message to the buyer</label>
          <textarea name="adminMessage" rows={3} required defaultValue={adminMessage} placeholder="Delivery notes, replacements, or timing…" />
        </div>
        <div>
          <label>Terms on the quotation</label>
          <textarea name="terms" rows={2} defaultValue={terms} placeholder="Prices in ZMW, valid for 14 days…" />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={loading}>
        {loading ? "Sending…" : accepted ? "Send the new price" : "Send quotation"}
      </button>
    </form>
  );
}

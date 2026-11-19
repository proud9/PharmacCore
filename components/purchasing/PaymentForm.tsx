"use client";

import { FormEvent } from "react";
import { usePost } from "./usePost";

/** Finance: total paid so far against a manufacturer's invoice. */
export function PaymentForm({ id, amountPaid, total }: { id: string; amountPaid: number; total: number }) {
  const { post, error, saving } = usePost();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post(`/api/purchases/${id}/payment`, { amountPaid: Number(form.get("amountPaid") || 0) });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Record payment</h2>
      <p className="mt-1 text-sm text-ink/60">The total paid to the manufacturer so far, in Kwacha.</p>
      <div className="mt-4">
        <label>Amount paid (ZMW)</label>
        <input name="amountPaid" type="number" min={0} max={total} step="0.01" defaultValue={amountPaid} required />
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={saving}>
        {saving ? "Saving…" : "Save payment"}
      </button>
    </form>
  );
}

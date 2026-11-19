"use client";

import { FormEvent } from "react";
import { usePost } from "./usePost";

type Line = { id: string; name: string; quantity: number };

/** Manufacturer: delivery note number, how it is sent, and the quantity per line. */
export function DispatchForm({ id, lines }: { id: string; lines: Line[] }) {
  const { post, error, saving } = usePost();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post(`/api/purchases/${id}/dispatch`, {
      deliveryNoteNo: form.get("deliveryNoteNo"),
      deliveryMethod: form.get("deliveryMethod"),
      message: form.get("message"),
      lines: lines.map((line) => ({ id: line.id, quantity: Number(form.get(`qty-${line.id}`) || 0) })),
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Dispatch</h2>
      <p className="mt-1 text-sm text-ink/60">Your delivery note and what is being sent. The wholesale checks it on arrival.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label>Delivery note no.</label>
          <input name="deliveryNoteNo" required placeholder="e.g. DN-55120" />
        </div>
        <div>
          <label>How it is sent</label>
          <input name="deliveryMethod" placeholder="Own truck, courier…" />
        </div>
      </div>
      <table className="table-grid mt-3">
        <thead>
          <tr>
            <th>Item</th>
            <th>Ordered</th>
            <th>Sending</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td>{line.name}</td>
              <td>{line.quantity}</td>
              <td>
                <input className="w-24" name={`qty-${line.id}`} type="number" min={0} defaultValue={line.quantity} required />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3">
        <label>Message</label>
        <textarea name="message" rows={2} placeholder="Expected arrival, driver contact…" />
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={saving}>
        {saving ? "Saving…" : "Mark as dispatched"}
      </button>
    </form>
  );
}

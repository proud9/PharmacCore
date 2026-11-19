"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

/** `sent` is the quantity on the manufacturer's delivery note, when it dispatched in Parallax. */
type Line = { id: string; name: string; ordered: number; sent?: number };

export function ReceivePoButton({ id, lines, deliveryNoteNo = "" }: { id: string; lines: Line[]; deliveryNoteNo?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/purchases/${id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryNoteNo: form.get("deliveryNoteNo"),
        lines: lines.map((line) => ({ itemId: line.id, quantity: Number(form.get(`qty-${line.id}`) || 0) })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Receive failed");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="mt-3">
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          Receive delivery
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-pine-900/10 bg-sage-100/40 p-4">
      <p className="text-sm text-ink/70">
        Enter the supplier&apos;s delivery note and what actually arrived. The items then wait in Inventory until
        their expiry and price are entered, and are added to stock at that point.
      </p>
      <div className="mt-3 max-w-xs">
        <label>Delivery note no.</label>
        <input name="deliveryNoteNo" required placeholder="e.g. DN-55120" defaultValue={deliveryNoteNo} />
      </div>
      <table className="table-grid mt-3">
        <thead>
          <tr>
            <th>Item</th>
            <th>Ordered</th>
            {lines.some((line) => line.sent != null) ? <th>Sent</th> : null}
            <th>Delivered</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td>{line.name}</td>
              <td>{line.ordered}</td>
              {lines.some((row) => row.sent != null) ? <td>{line.sent ?? "—"}</td> : null}
              <td>
                <input
                  className="w-24"
                  name={`qty-${line.id}`}
                  type="number"
                  min={0}
                  defaultValue={line.sent ?? line.ordered}
                  required
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Receive and send to Inventory"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

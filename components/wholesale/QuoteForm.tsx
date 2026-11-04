"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function QuoteForm({ id }: { id: string }) {
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
        quotedAmount: Number(form.get("quotedAmount")),
        readyOn: form.get("readyOn"),
        adminMessage: form.get("adminMessage"),
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not send quote");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Send a price</h2>
      <p className="mt-1 text-sm text-ink/60">
        Enter the full order amount in Kwacha (ZMW) and the date everything can be ready for delivery.
      </p>
      <div className="mt-4 grid gap-3">
        <div>
          <label>Amount (ZMW)</label>
          <input name="quotedAmount" type="number" min={1} step="0.01" required placeholder="24850.00" />
        </div>
        <div>
          <label>Ready for delivery on</label>
          <input name="readyOn" type="date" required />
        </div>
        <div>
          <label>Message to the buyer</label>
          <textarea name="adminMessage" rows={4} required placeholder="Delivery notes, replacements, or timing…" />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={loading}>
        {loading ? "Sending…" : "Send price to buyer"}
      </button>
    </form>
  );
}

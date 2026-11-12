"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function InvoiceForm({
  id,
  issued,
  amountPaid,
  terms,
  dueOn,
}: {
  id: string;
  issued: boolean;
  amountPaid: number;
  terms: string;
  dueOn: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/consignments/${id}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dueOn: form.get("dueOn"),
        amountPaid: Number(form.get("amountPaid") || 0),
        terms: form.get("terms"),
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not issue the invoice");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">{issued ? "Update invoice" : "Issue invoice"}</h2>
      <p className="mt-1 text-sm text-ink/60">Due date and any amount already received, in Kwacha.</p>
      <div className="mt-4 grid gap-3">
        <div>
          <label>Due date</label>
          <input name="dueOn" type="date" required defaultValue={dueOn} />
        </div>
        <div>
          <label>Amount paid (ZMW)</label>
          <input name="amountPaid" type="number" min={0} step="0.01" defaultValue={amountPaid} />
        </div>
        <div>
          <label>Notes and payment terms</label>
          <textarea name="terms" rows={3} defaultValue={terms} />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={loading}>
        {loading ? "Saving…" : issued ? "Save invoice" : "Issue invoice"}
      </button>
    </form>
  );
}

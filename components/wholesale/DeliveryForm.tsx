"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Line = { id: string; name: string; quantity: number; qtyDelivered: number; remarks: string };

export function DeliveryForm({
  id,
  lines,
  issued,
  deliveryMethod = "",
  vehicleDriver = "",
  dispatchFrom = "",
  deliveryNotes = "",
}: {
  id: string;
  lines: Line[];
  issued: boolean;
  deliveryMethod?: string;
  vehicleDriver?: string;
  dispatchFrom?: string;
  deliveryNotes?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/consignments/${id}/delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: lines.map((line) => ({
          id: line.id,
          qtyDelivered: Number(form.get(`delivered-${line.id}`)),
          remarks: String(form.get(`remarks-${line.id}`) ?? ""),
        })),
        deliveryMethod: form.get("deliveryMethod"),
        vehicleDriver: form.get("vehicleDriver"),
        dispatchFrom: form.get("dispatchFrom"),
        deliveryNotes: form.get("deliveryNotes"),
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not issue the delivery note");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">{issued ? "Update delivery note" : "Issue delivery note"}</h2>
      <p className="mt-1 text-sm text-ink/60">Record what left the pharmacy and how it is travelling.</p>
      <div className="mt-4 space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="grid gap-2 sm:grid-cols-2">
            <div>
              <label>
                {line.name} delivered (of {line.quantity})
              </label>
              <input
                name={`delivered-${line.id}`}
                type="number"
                min={0}
                max={line.quantity}
                required
                defaultValue={line.qtyDelivered}
              />
            </div>
            <div>
              <label>Remarks</label>
              <input name={`remarks-${line.id}`} defaultValue={line.remarks} placeholder="Condition, batch, shortage…" />
            </div>
          </div>
        ))}
        <div>
          <label>Delivery method</label>
          <input name="deliveryMethod" required placeholder="Own vehicle, courier…" defaultValue={deliveryMethod} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Vehicle / driver</label>
            <input name="vehicleDriver" placeholder="Driver name and vehicle" defaultValue={vehicleDriver} />
          </div>
          <div>
            <label>Dispatch location</label>
            <input name="dispatchFrom" placeholder="Pharmacy store" defaultValue={dispatchFrom} />
          </div>
        </div>
        <div>
          <label>Exceptions</label>
          <textarea name="deliveryNotes" rows={2} placeholder="Shortages, substitutions, or damage" defaultValue={deliveryNotes} />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={loading}>
        {loading ? "Saving…" : issued ? "Save delivery note" : "Issue delivery note"}
      </button>
    </form>
  );
}

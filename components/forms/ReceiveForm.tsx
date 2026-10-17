"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ReceiveForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/stock/receive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        lotNumber: form.get("lotNumber"),
        expiryDate: form.get("expiryDate"),
        quantity: Number(form.get("quantity")),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Receive failed");
      return;
    }
    event.currentTarget.reset();
    setMessage("Lot received.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Receive stock</h2>
      <div className="mt-4 grid gap-3">
        <div>
          <label>Lot number</label>
          <input name="lotNumber" required />
        </div>
        <div>
          <label>Expiry</label>
          <input name="expiryDate" type="date" required />
        </div>
        <div>
          <label>Quantity</label>
          <input name="quantity" type="number" min={1} required />
        </div>
      </div>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
      <button className="btn btn-primary mt-4 w-full">Post goods inward</button>
    </form>
  );
}

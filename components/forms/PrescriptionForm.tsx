"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PrescriptionForm({
  patients,
  products,
}: {
  patients: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState([{ productId: products[0]?.id ?? "", quantity: 30, instructions: "" }]);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: form.get("patientId"),
        prescriber: form.get("prescriber"),
        clinic: form.get("clinic"),
        notes: form.get("notes"),
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
          instructions: line.instructions,
        })),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not file prescription");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">File prescription</h2>
      <div className="mt-4 grid gap-3">
        <div>
          <label>Patient</label>
          <select name="patientId" required>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Prescriber</label>
          <input name="prescriber" required placeholder="Dr. Name" />
        </div>
        <div>
          <label>Clinic</label>
          <input name="clinic" />
        </div>
        {lines.map((line, index) => (
          <div key={index} className="grid grid-cols-[1fr_80px] gap-2">
            <select
              value={line.productId}
              onChange={(e) =>
                setLines((current) =>
                  current.map((item, i) => (i === index ? { ...item, productId: e.target.value } : item)),
                )
              }
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) =>
                setLines((current) =>
                  current.map((item, i) => (i === index ? { ...item, quantity: Number(e.target.value) } : item)),
                )
              }
            />
            <input
              className="col-span-2"
              placeholder="Directions"
              value={line.instructions}
              onChange={(e) =>
                setLines((current) =>
                  current.map((item, i) => (i === index ? { ...item, instructions: e.target.value } : item)),
                )
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            setLines((current) => [...current, { productId: products[0]?.id ?? "", quantity: 1, instructions: "" }])
          }
        >
          Add line
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full">Save prescription</button>
    </form>
  );
}

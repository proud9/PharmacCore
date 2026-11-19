"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LookupPicker, type Picked } from "@/components/search/LookupPicker";

type Line = { product: Picked | null; quantity: number; instructions: string };
type Patient = Picked & { allergies?: string | null };

/** Patients and prescription medicines are searched on the server as you type (see /api/lookup). */
export function PrescriptionForm() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [lines, setLines] = useState<Line[]>([{ product: null, quantity: 30, instructions: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(index: number, change: Partial<Line>) {
    setLines((current) => current.map((item, i) => (i === index ? { ...item, ...change } : item)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!patient) {
      setError("Choose the patient.");
      return;
    }
    const chosen = lines.filter((line) => line.product);
    if (!chosen.length) {
      setError("Add at least one medicine.");
      return;
    }
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setSaving(true);
    const response = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patient.id,
        prescriber: form.get("prescriber"),
        clinic: form.get("clinic"),
        notes: form.get("notes"),
        items: chosen.map((line) => ({
          productId: line.product!.id,
          quantity: Number(line.quantity),
          instructions: line.instructions,
        })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not file prescription");
      return;
    }
    formEl.reset();
    setPatient(null);
    setLines([{ product: null, quantity: 30, instructions: "" }]);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">File prescription</h2>
      <div className="mt-4 grid gap-3">
        <div>
          <label htmlFor="rx-patient">Patient</label>
          <LookupPicker<Patient>
            id="rx-patient"
            kind="patients"
            value={patient}
            onChange={setPatient}
            placeholder="Search patient name or phone"
          />
          {patient?.allergies ? <p className="mt-1 text-xs text-rust">Allergy alert: {patient.allergies}</p> : null}
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
            <LookupPicker
              kind="products"
              params={{ rx: "1" }}
              value={line.product}
              onChange={(product) => update(index, { product })}
              placeholder="Search prescription medicine"
              describe={(item) => (item as Picked & { sku?: string }).sku ?? ""}
            />
            <input
              type="number"
              min={1}
              value={line.quantity}
              aria-label="Quantity"
              onChange={(e) => update(index, { quantity: Number(e.target.value) })}
            />
            <input
              className="col-span-2"
              placeholder="Directions"
              value={line.instructions}
              onChange={(e) => update(index, { instructions: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            setLines((current) => [...current, { product: null, quantity: 1, instructions: "" }])
          }
        >
          Add line
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={saving}>
        {saving ? "Saving…" : "Save prescription"}
      </button>
    </form>
  );
}

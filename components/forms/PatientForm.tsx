"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PatientForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not save patient");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">New patient</h2>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>First name</label>
            <input name="firstName" required />
          </div>
          <div>
            <label>Last name</label>
            <input name="lastName" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>Date of birth</label>
            <input name="dateOfBirth" type="date" />
          </div>
          <div>
            <label>Gender</label>
            <input name="gender" placeholder="F / M / X" />
          </div>
        </div>
        <div>
          <label>Phone</label>
          <input name="phone" />
        </div>
        <div>
          <label>Allergies</label>
          <input name="allergies" placeholder="Penicillin, NSAIDs…" />
        </div>
        <div>
          <label>Insurance</label>
          <input name="insurance" />
        </div>
        <div>
          <label>Address</label>
          <input name="address" />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full">Create record</button>
    </form>
  );
}

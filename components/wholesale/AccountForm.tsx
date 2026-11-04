"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AccountForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setSaved("");
    setLoading(true);
    const data = new FormData(form);
    const response = await fetch("/api/wholesale/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        kind: data.get("kind"),
        license: data.get("license"),
        contact: data.get("contact"),
        phone: data.get("phone"),
        email: data.get("email"),
        address: data.get("address"),
        buyerName: data.get("buyerName"),
        buyerEmail: data.get("buyerEmail"),
        buyerPassword: data.get("buyerPassword"),
      }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? "Could not create account");
      return;
    }
    form.reset();
    setSaved("Buyer account created.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Add a buyer</h2>
      <p className="mt-1 text-sm text-ink/60">Give a hospital, clinic, or pharmacy a login to place orders.</p>
      <div className="mt-4 grid gap-3">
        <div>
          <label>Organisation name</label>
          <input name="name" required placeholder="Chipata General Hospital" />
        </div>
        <div>
          <label>Type</label>
          <select name="kind" defaultValue="HOSPITAL">
            <option value="HOSPITAL">Hospital</option>
            <option value="CLINIC">Clinic</option>
            <option value="PHARMACY">Pharmacy</option>
          </select>
        </div>
        <div>
          <label>Licence number</label>
          <input name="license" />
        </div>
        <div>
          <label>Contact person</label>
          <input name="contact" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>Phone</label>
            <input name="phone" />
          </div>
          <div>
            <label>Email</label>
            <input name="email" type="email" />
          </div>
        </div>
        <div>
          <label>Address</label>
          <input name="address" />
        </div>
        <p className="pt-2 text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Login for the buyer</p>
        <div>
          <label>Full name</label>
          <input name="buyerName" required />
        </div>
        <div>
          <label>Email</label>
          <input name="buyerEmail" type="email" required />
        </div>
        <div>
          <label>Password</label>
          <input name="buyerPassword" type="password" minLength={8} required />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      {saved ? <p className="mt-2 text-sm text-pine-700">{saved}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={loading}>
        {loading ? "Saving…" : "Create buyer account"}
      </button>
    </form>
  );
}

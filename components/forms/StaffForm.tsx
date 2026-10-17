"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function StaffForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not create staff");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Issue login</h2>
      <div className="mt-4 grid gap-3">
        <div>
          <label>Full name</label>
          <input name="name" required />
        </div>
        <div>
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
        <div>
          <label>Temporary password</label>
          <input name="password" type="password" minLength={8} required />
        </div>
        <div>
          <label>Role</label>
          <select name="role" defaultValue="CASHIER">
            <option value="ADMIN">Administrator</option>
            <option value="PHARMACIST">Pharmacist</option>
            <option value="TECHNICIAN">Technician</option>
            <option value="CASHIER">Cashier</option>
            <option value="INVENTORY">Inventory officer</option>
          </select>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full">Create account</button>
    </form>
  );
}

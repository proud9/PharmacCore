"use client";

import { FormEvent } from "react";
import { usePost } from "./usePost";

/** Sales: add a manufacturer, with its single portal login if it will quote and invoice in Parallax. */
export function ManufacturerForm() {
  const { post, error, saving } = usePost();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const text = (key: string) => String(form.get(key) ?? "").trim() || undefined;
    const saved = await post("/api/manufacturers", {
      name: text("name"),
      contact: text("contact"),
      phone: text("phone"),
      email: text("email"),
      address: text("address"),
      loginName: text("loginName"),
      loginEmail: text("loginEmail"),
      loginPassword: text("loginPassword"),
    });
    if (saved) formEl.reset();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Add manufacturer</h2>
      <div className="mt-4 grid gap-3">
        <div>
          <label>Company name</label>
          <input name="name" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Contact person</label>
            <input name="contact" />
          </div>
          <div>
            <label>Phone</label>
            <input name="phone" />
          </div>
        </div>
        <div>
          <label>Email</label>
          <input name="email" type="email" />
        </div>
        <div>
          <label>Address</label>
          <input name="address" />
        </div>
        <p className="pt-2 text-sm text-ink/60">
          Login (optional): lets the manufacturer see your orders, send prices, invoices and dispatch notes. One login per
          manufacturer.
        </p>
        <div>
          <label>Login name</label>
          <input name="loginName" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Login email</label>
            <input name="loginEmail" type="email" />
          </div>
          <div>
            <label>Password</label>
            <input name="loginPassword" type="password" minLength={8} />
          </div>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={saving}>
        {saving ? "Saving…" : "Add manufacturer"}
      </button>
    </form>
  );
}

/** Sales: give an existing manufacturer its portal login. */
export function ManufacturerLoginForm({ supplierId }: { supplierId: string }) {
  const { post, error, saving } = usePost();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await post("/api/manufacturers", {
      supplierId,
      loginName: form.get("loginName"),
      loginEmail: form.get("loginEmail"),
      loginPassword: form.get("loginPassword"),
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <div>
        <label>Login name</label>
        <input name="loginName" required />
      </div>
      <div>
        <label>Login email</label>
        <input name="loginEmail" type="email" required />
      </div>
      <div>
        <label>Password</label>
        <input name="loginPassword" type="password" minLength={8} required />
      </div>
      <button className="btn btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Create login"}
      </button>
      {error ? <p className="text-sm text-rust sm:col-span-4">{error}</p> : null}
    </form>
  );
}

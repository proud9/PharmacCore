"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pill } from "lucide-react";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Unable to sign in");
      return;
    }
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-pine-950 p-12 text-parchment lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-brass/20 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brass text-pine-950">
            <Pill />
          </div>
          <p className="font-display text-2xl">PharmaCore</p>
        </div>
        <div>
          <p className="text-[12px] uppercase tracking-[0.22em] text-sage-300">Commercial pharmacy OS</p>
          <h1 className="mt-4 max-w-md font-display text-5xl leading-tight">
            Records, stock, and decisions in one quiet console.
          </h1>
          <p className="mt-4 max-w-md text-sage-300">
            Remote staff login, lot-level inventory, prescription filing, and trading statistics for the
            front counter and the back office.
          </p>
        </div>
        <p className="text-sm text-sage-300">Northbridge Community Pharmacy · demonstration tenancy</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-pine-900/10 bg-white p-8 shadow-panel">
          <p className="text-[11px] uppercase tracking-[0.18em] text-pine-700/70">Secure remote login</p>
          <h2 className="mt-2 font-display text-3xl text-pine-900">Sign in to the pharmacy</h2>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="email">Work email</label>
              <input id="email" name="email" type="email" required defaultValue="admin@pharmacore.local" />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required defaultValue="Admin123!" />
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-rust">{error}</p> : null}
          <button className="btn btn-primary mt-6 w-full" disabled={loading}>
            {loading ? "Checking credentials…" : "Enter console"}
          </button>
          <p className="mt-4 text-xs leading-relaxed text-ink/60">
            Demo roles: admin@, pharmacist@, tech@, cashier@, stock@ — all @pharmacore.local. Passwords
            Admin123!, Pharma123!, Tech123!, Cash123!, Stock123!
          </p>
        </form>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

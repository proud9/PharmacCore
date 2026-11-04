"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pill } from "lucide-react";

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
      setError(data.error ?? "Could not sign in. Check your email and password.");
      return;
    }
    router.push(params.get("next") || data.home || "/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-pine-950 p-12 text-parchment lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brass text-pine-950">
            <Pill />
          </div>
          <p className="font-display text-2xl">Pharmacy</p>
        </div>
        <div>
          <h1 className="mt-4 max-w-md font-display text-5xl leading-tight">Pharmacy management system</h1>
          <p className="mt-4 max-w-md text-sage-300">
            Stock, sales, patient records, and wholesale orders for hospitals, clinics, and pharmacies — priced in
            Kwacha (ZMW).
          </p>
        </div>
        <p className="text-sm text-sage-300">&nbsp;</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-pine-900/10 bg-white p-8 shadow-panel">
          <h2 className="font-display text-3xl text-pine-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink/60">Use your work email and password.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="username" />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-rust">{error}</p> : null}
          <button className="btn btn-primary mt-6 w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
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

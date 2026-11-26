"use client";

import { useState, type FormEvent } from "react";

export function PasswordForm() {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("The two new passwords don't match.");
      return;
    }
    setSaving(true);
    setError("");
    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: form.get("current"), password: form.get("password") }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not change the password.");
      return;
    }
    window.location.assign(data.home ?? "/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <div>
        <label htmlFor="current-password">Current (or temporary) password</label>
        <input id="current-password" name="current" type="password" required autoComplete="current-password" />
      </div>
      <div>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
        <p className="mt-1 text-xs text-ink/60">At least 10 characters.</p>
      </div>
      <div>
        <label htmlFor="confirm-password">New password again</label>
        <input id="confirm-password" name="confirm" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
      </div>
      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-primary w-full" disabled={saving}>
        {saving ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

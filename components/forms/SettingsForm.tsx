"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Pharmacy = {
  name: string;
  license: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export function SettingsForm({ pharmacy }: { pharmacy: Pharmacy }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        license: form.get("license"),
        phone: form.get("phone"),
        email: form.get("email"),
        address: form.get("address"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save details");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Edit details</h2>
      <div className="mt-4 grid gap-3">
        <div>
          <label>Trading name</label>
          <input name="name" defaultValue={pharmacy.name} required />
        </div>
        <div>
          <label>Licence</label>
          <input name="license" defaultValue={pharmacy.license ?? ""} />
        </div>
        <div>
          <label>Phone</label>
          <input name="phone" type="tel" defaultValue={pharmacy.phone ?? ""} />
        </div>
        <div>
          <label>Email</label>
          <input name="email" type="email" defaultValue={pharmacy.email ?? ""} />
        </div>
        <div>
          <label>Address</label>
          <textarea name="address" rows={2} defaultValue={pharmacy.address ?? ""} />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      {saved ? <p className="mt-2 text-sm text-pine-700">Details saved.</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={saving}>
        {saving ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

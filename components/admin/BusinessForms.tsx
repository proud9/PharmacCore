"use client";

import { useState, type FormEvent } from "react";
import { usePost } from "@/components/usePost";

type Profile = { name: string; town: string; address: string; phone: string; email: string; website: string; listed: boolean };

export function BusinessProfileForm({ orgId, details }: { orgId: string; details: Profile }) {
  const { post, error, saving } = usePost();
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const body = { ...Object.fromEntries(form.entries()), listed: form.get("listed") === "on" };
    if (await post(`/api/admin/businesses/${orgId}`, body)) setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel sm:grid-cols-2">
      <h2 className="font-display text-xl text-pine-900 sm:col-span-2">Account details</h2>
      <div className="sm:col-span-2">
        <label>Business name</label>
        <input name="name" required defaultValue={details.name} />
      </div>
      <div>
        <label>Town</label>
        <input name="town" defaultValue={details.town} />
      </div>
      <div>
        <label>Phone</label>
        <input name="phone" defaultValue={details.phone} />
      </div>
      <div className="sm:col-span-2">
        <label>Address</label>
        <input name="address" defaultValue={details.address} />
      </div>
      <div>
        <label>Email</label>
        <input name="email" type="email" defaultValue={details.email} />
      </div>
      <div>
        <label>Website</label>
        <input name="website" defaultValue={details.website} />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="listed" defaultChecked={details.listed} className="w-auto" />
        Listed in the directory
      </label>
      {error ? <p className="text-sm text-rust sm:col-span-2">{error}</p> : null}
      {saved ? <p className="text-sm text-pine-800 sm:col-span-2">Saved.</p> : null}
      <button className="btn btn-primary w-fit" disabled={saving}>
        {saving ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

export function BusinessStatusActions({ orgId, status }: { orgId: string; status: string }) {
  const { post, error, saving } = usePost();

  async function change(next: string, question: string) {
    if (!window.confirm(question)) return;
    await post(`/api/admin/businesses/${orgId}/status`, { status: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "ACTIVE" ? (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={saving}
          onClick={() => change("SUSPENDED", "Suspend this business? Its login stops working until you reactivate it.")}
        >
          Suspend
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={saving}
          onClick={() => change("ACTIVE", "Reactivate this business? Its login works again.")}
        >
          Reactivate
        </button>
      )}
      {status !== "DELETED" ? (
        <button
          type="button"
          className="btn btn-ghost text-rust"
          disabled={saving}
          onClick={() =>
            change(
              "DELETED",
              "Delete this business? Its login stops at once. Its own records are erased after 30 days (you can reactivate it until then). Orders with other businesses stay in their history.",
            )
          }
        >
          Delete
        </button>
      ) : null}
      {error ? <p className="w-full text-sm text-rust">{error}</p> : null}
    </div>
  );
}

export function LoginActions({ userId, active }: { userId: string; active: boolean }) {
  const { post, error, saving } = usePost();
  const [temporary, setTemporary] = useState("");

  async function reset() {
    if (!window.confirm("Reset this password? The owner is signed out everywhere and must choose a new password with the temporary one.")) return;
    const result = await post(`/api/admin/users/${userId}`, { action: "RESET_PASSWORD" });
    if (result) setTemporary(String(result.temporaryPassword));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={reset}>
          Reset password
        </button>
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => post(`/api/admin/users/${userId}`, { action: "SIGN_OUT" })}>
          Sign out everywhere
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={saving}
          onClick={() => post(`/api/admin/users/${userId}`, { action: active ? "DEACTIVATE" : "ACTIVATE" })}
        >
          {active ? "Switch off login" : "Switch on login"}
        </button>
      </div>
      {temporary ? (
        <p role="status" className="rounded-xl bg-dispensary-soft p-3 text-sm">
          Temporary password (shown once): <span className="font-mono">{temporary}</span>
        </p>
      ) : null}
      {error ? <p className="text-sm text-rust">{error}</p> : null}
    </div>
  );
}

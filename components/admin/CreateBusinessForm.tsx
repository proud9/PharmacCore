"use client";

import { useState, type FormEvent } from "react";
import { usePost } from "@/components/usePost";
import { KIND_HINT, ORG_KINDS, ROLE_LABEL, type OrgKind } from "@/lib/capabilities";

/** The Parallax team opens an account for a business. The temporary password is shown once. */
export function CreateBusinessForm() {
  const { post, error, saving } = usePost();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OrgKind>("WHOLESALER");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await post("/api/admin/businesses", Object.fromEntries(form.entries()));
    if (result) {
      setCreated({ email: String(result.email), password: String(result.temporaryPassword) });
      event.currentTarget?.reset();
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Create a business account
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">Create a business account</h2>
      {created ? (
        <div role="status" className="mt-3 rounded-xl bg-dispensary-soft p-4 text-sm text-pine-900">
          Account created. Give the owner these sign-in details; they must choose a new password when they first sign in.
          This password is shown only once.
          <p className="mt-2 font-mono">
            {created.email} · {created.password}
          </p>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label>Account type</label>
          <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as OrgKind)}>
            {ORG_KINDS.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABEL[value]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/60">{KIND_HINT[kind]}</p>
        </div>
        <div>
          <label>Business name</label>
          <input name="businessName" required minLength={2} />
        </div>
        <div>
          <label>Town</label>
          <input name="town" />
        </div>
        <div>
          <label>Phone</label>
          <input name="phone" />
        </div>
        <div>
          <label>Owner&apos;s name</label>
          <input name="name" required minLength={2} />
        </div>
        <div>
          <label>Owner&apos;s email (sign-in)</label>
          <input name="email" type="email" required />
        </div>
        {error ? <p className="text-sm text-rust sm:col-span-2">{error}</p> : null}
        <div className="flex gap-2 sm:col-span-2">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create account"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </form>
    </section>
  );
}

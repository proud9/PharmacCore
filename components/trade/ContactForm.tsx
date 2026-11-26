"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePost } from "@/components/usePost";
import { ROLE_LABEL } from "@/lib/capabilities";

type Contact = {
  id: string;
  role: string;
  kind: string;
  name: string;
  town: string;
  address: string;
  phone: string;
  email: string;
  tpin: string;
  notes: string;
};

function Fields({ kinds, contact }: { kinds: readonly string[]; contact?: Contact }) {
  return (
    <>
      <div>
        <label>Name</label>
        <input name="name" required minLength={2} defaultValue={contact?.name} />
      </div>
      <div>
        <label>Type</label>
        <select name="kind" defaultValue={contact?.kind ?? kinds[0]}>
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {ROLE_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Town</label>
        <input name="town" defaultValue={contact?.town} />
      </div>
      <div>
        <label>Address</label>
        <input name="address" defaultValue={contact?.address} />
      </div>
      <div>
        <label>Phone</label>
        <input name="phone" defaultValue={contact?.phone} />
      </div>
      <div>
        <label>Email</label>
        <input name="email" defaultValue={contact?.email} />
      </div>
      <div>
        <label>TPIN</label>
        <input name="tpin" defaultValue={contact?.tpin} />
      </div>
      <div>
        <label>Notes</label>
        <input name="notes" defaultValue={contact?.notes} />
      </div>
    </>
  );
}

export function ContactForm({ role, kinds }: { role: "CUSTOMER" | "SUPPLIER"; kinds: readonly string[] }) {
  const { post, error, saving } = usePost();
  const [open, setOpen] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await post("/api/contacts", { ...Object.fromEntries(form.entries()), role })) setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost mt-3" onClick={() => setOpen(true)}>
        Add to private list
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <Fields kinds={kinds} />
      {error ? <p className="text-sm text-rust sm:col-span-2">{error}</p> : null}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Add"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ContactRow({ contact, kinds, readOnly, newOrderHref }: { contact: Contact; kinds: readonly string[]; readOnly: boolean; newOrderHref: string }) {
  const { post, error, saving } = usePost();
  const [editing, setEditing] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await post(`/api/contacts/${contact.id}`, { ...Object.fromEntries(form.entries()), role: contact.role })) setEditing(false);
  }

  if (editing) {
    return (
      <li className="py-3">
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Fields kinds={kinds} contact={contact} />
          {error ? <p className="text-sm text-rust sm:col-span-2">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn btn-primary" disabled={saving}>
              Save
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-ghost text-rust"
              disabled={saving}
              onClick={() => window.confirm(`Remove ${contact.name} from your list?`) && post(`/api/contacts/${contact.id}`, { delete: true })}
            >
              Remove
            </button>
          </div>
        </form>
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="font-semibold">{contact.name}</p>
        <p className="text-sm text-ink/60">
          {ROLE_LABEL[contact.kind]} · {[contact.town, contact.phone, contact.email].filter(Boolean).join(" · ") || "No contact details"}
        </p>
      </div>
      {readOnly ? null : (
        <div className="flex gap-2">
          <Link href={newOrderHref} className="btn btn-primary">
            {contact.role === "CUSTOMER" ? "New quotation" : "New inquiry"}
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      )}
    </li>
  );
}

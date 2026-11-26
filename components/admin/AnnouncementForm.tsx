"use client";

import { useState, type FormEvent } from "react";
import { usePost } from "@/components/usePost";
import { ORG_KINDS, ROLE_LABEL } from "@/lib/capabilities";
import { LookupPicker, type Picked } from "@/components/search/LookupPicker";

export function AnnouncementForm() {
  const { post, error, saving } = usePost();
  const [audience, setAudience] = useState("ALL");
  const [business, setBusiness] = useState<Picked | null>(null);
  const [pickError, setPickError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(false);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPickError("");
    if (audience === "ORG") {
      if (!business) {
        setPickError("Choose a business from the list.");
        return;
      }
      form.set("orgId", business.id);
    }
    if (await post("/api/admin/announcements", Object.fromEntries(form.entries()))) {
      setSent(true);
      formElement.reset();
      setAudience("ALL");
      setBusiness(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel sm:grid-cols-2">
      <h2 className="font-display text-xl text-pine-900 sm:col-span-2">New announcement</h2>
      <div>
        <label>Send to</label>
        <select name="audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
          <option value="ALL">Everyone</option>
          <option value="KIND">One account type</option>
          <option value="ORG">One business</option>
        </select>
      </div>
      {audience === "KIND" ? (
        <div>
          <label>Account type</label>
          <select name="kind" required>
            {ORG_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {ROLE_LABEL[kind]}s
              </option>
            ))}
          </select>
        </div>
      ) : audience === "ORG" ? (
        <div>
          <label htmlFor="announcement-business">Business</label>
          <LookupPicker
            id="announcement-business"
            kind="businesses"
            value={business}
            onChange={setBusiness}
            placeholder="Type a business name…"
          />
          {pickError ? <p className="mt-1 text-sm text-rust">{pickError}</p> : null}
        </div>
      ) : (
        <div />
      )}
      <div className="sm:col-span-2">
        <label>Title</label>
        <input name="title" required maxLength={120} />
      </div>
      <div className="sm:col-span-2">
        <label>Message</label>
        <textarea name="body" required maxLength={2000} rows={4} />
      </div>
      {error ? <p className="text-sm text-rust sm:col-span-2">{error}</p> : null}
      {sent ? <p className="text-sm text-pine-800 sm:col-span-2">Sent.</p> : null}
      <button className="btn btn-primary w-fit" disabled={saving}>
        {saving ? "Sending…" : "Send announcement"}
      </button>
    </form>
  );
}

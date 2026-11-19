"use client";

import { useState } from "react";
import { usePost } from "./usePost";

type Action = { status: "ACCEPTED" | "CANCELLED" | "DECLINED"; label: string; primary?: boolean; askReason?: boolean };

/** Decision buttons on a purchase order: accept the price, cancel, or (manufacturer) decline. */
export function PoActions({ id, actions }: { id: string; actions: Action[] }) {
  const { post, error, saving } = usePost();
  const [asking, setAsking] = useState<Action | null>(null);
  const [reason, setReason] = useState("");

  if (!actions.length) return null;

  async function run(action: Action, message?: string) {
    const ok = await post(`/api/purchases/${id}/status`, { status: action.status, message: message || undefined });
    if (ok) {
      setAsking(null);
      setReason("");
    }
  }

  if (asking) {
    return (
      <div className="mt-4 rounded-xl border border-pine-900/10 bg-sage-100/40 p-4">
        <label>Reason (shown on the order)</label>
        <textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} required />
        {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
        <div className="mt-3 flex gap-2">
          <button className="btn btn-primary" disabled={saving || !reason.trim()} onClick={() => run(asking, reason.trim())}>
            {saving ? "Saving…" : asking.label}
          </button>
          <button className="btn btn-ghost" onClick={() => setAsking(null)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.status}
          className={action.primary ? "btn btn-primary" : "btn btn-ghost"}
          disabled={saving}
          onClick={() => (action.askReason ? setAsking(action) : run(action))}
        >
          {action.label}
        </button>
      ))}
      {error ? <p className="w-full text-sm text-rust">{error}</p> : null}
    </div>
  );
}

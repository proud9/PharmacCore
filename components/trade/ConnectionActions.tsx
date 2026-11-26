"use client";

import { useState } from "react";
import { usePost } from "@/components/usePost";
import { PAYMENT_TERMS, PAYMENT_TERMS_LABEL } from "@/lib/trade";

export function ConnectButton({ orgId, label = "Ask to connect" }: { orgId: string; label?: string }) {
  const { post, error, saving } = usePost();
  return (
    <div className="text-right">
      <button type="button" className="btn btn-primary" disabled={saving} onClick={() => post("/api/connections", { orgId })}>
        {saving ? "Sending…" : label}
      </button>
      {error ? <p className="mt-1 text-sm text-rust">{error}</p> : null}
    </div>
  );
}

/** Accept / decline an incoming request, or end a connection. */
export function LinkActions({ linkId, incoming, active }: { linkId: string; incoming: boolean; active: boolean }) {
  const { post, error, saving } = usePost();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {incoming ? (
        <>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => post(`/api/connections/${linkId}`, { action: "ACCEPT" })}>
            Accept
          </button>
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => post(`/api/connections/${linkId}`, { action: "DECLINE" })}>
            Decline
          </button>
        </>
      ) : null}
      {active ? (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={saving}
          onClick={() => {
            if (window.confirm("End this connection? Open orders carry on; no new inquiries can be sent.")) {
              post(`/api/connections/${linkId}`, { action: "END" });
            }
          }}
        >
          End connection
        </button>
      ) : null}
      {error ? <p className="w-full text-right text-sm text-rust">{error}</p> : null}
    </div>
  );
}

/** The seller's payment terms for one customer (blank = the business default). */
export function LinkTerms({ linkId, terms, creditDays }: { linkId: string; terms: string | null; creditDays: number | null }) {
  const { post, error, saving } = usePost();
  const [value, setValue] = useState(terms ?? "");
  const [days, setDays] = useState(creditDays === null ? "" : String(creditDays));
  return (
    <div className="flex flex-wrap items-end gap-2 text-sm">
      <div>
        <label className="text-xs">Payment terms</label>
        <select value={value} onChange={(event) => setValue(event.target.value)} className="py-1.5">
          <option value="">Your default</option>
          {PAYMENT_TERMS.map((option) => (
            <option key={option} value={option}>
              {PAYMENT_TERMS_LABEL[option]}
            </option>
          ))}
        </select>
      </div>
      {value === "CREDIT" ? (
        <div className="w-24">
          <label className="text-xs">Days</label>
          <input type="number" min={0} max={365} value={days} onChange={(event) => setDays(event.target.value)} className="py-1.5" />
        </div>
      ) : null}
      <button
        type="button"
        className="btn btn-ghost"
        disabled={saving}
        onClick={() =>
          post(`/api/connections/${linkId}`, {
            action: "TERMS",
            paymentTerms: value || null,
            creditDays: value === "CREDIT" && days !== "" ? Number(days) : null,
          })
        }
      >
        Save
      </button>
      {error ? <p className="w-full text-rust">{error}</p> : null}
    </div>
  );
}

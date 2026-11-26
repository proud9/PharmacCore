"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { LookupPicker, type Picked } from "@/components/search/LookupPicker";

type CatalogItem = { id: string; name: string; genericName: string | null; form: string | null; strength: string | null; unit: string | null; manufacturer: string | null };

type Line = {
  key: string;
  sellerProductId?: string;
  productId?: string;
  name: string;
  strength?: string;
  unit?: string;
  quantity: number;
};

let nextKey = 0;
const key = () => `l${++nextKey}`;

/**
 * Builds the lines of a new order.
 * - source "catalog": a connected seller's item list (names only) for an inquiry.
 * - source "own": this business's own items (a seller starting a quotation, or a buyer writing an
 *   inquiry to a supplier off Parallax).
 * Lines can also be typed for items not on any list.
 */
export function OrderBuilder({
  side,
  orgId,
  contactId,
  counterpart,
  source,
  offline,
}: {
  side: "buyer" | "seller";
  orgId?: string;
  contactId?: string;
  counterpart: string;
  source: "catalog" | "own" | "none";
  offline: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [message, setMessage] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [typed, setTyped] = useState({ name: "", strength: "", unit: "", quantity: 1 });

  // Catalog browsing (names only).
  const [q, setQ] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (source !== "catalog" || !orgId) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ seller: orgId, q });
        const response = await fetch(`/api/trade/catalog?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (response.ok) {
          setCatalog(data.items);
          setTotal(data.total);
        } else setError(data.error ?? "Could not load the item list.");
      } catch {
        // Aborted by a newer search.
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [source, orgId, q]);

  async function loadMore() {
    if (!orgId) return;
    const params = new URLSearchParams({ seller: orgId, q, skip: String(catalog.length) });
    const response = await fetch(`/api/trade/catalog?${params}`);
    const data = await response.json();
    if (response.ok) setCatalog([...catalog, ...data.items]);
  }

  function addCatalog(item: CatalogItem) {
    if (lines.some((line) => line.sellerProductId === item.id)) return;
    setLines([...lines, { key: key(), sellerProductId: item.id, name: item.name, strength: item.strength ?? undefined, unit: item.unit ?? undefined, quantity: 1 }]);
  }

  function addOwn(item: Picked | null) {
    if (!item || lines.some((line) => line.productId === item.id)) return;
    const extra = item as Picked & { strength?: string | null; unit?: string | null };
    setLines([...lines, { key: key(), productId: item.id, name: item.name, strength: extra.strength ?? undefined, unit: extra.unit ?? undefined, quantity: 1 }]);
  }

  function addTyped() {
    if (!typed.name.trim()) return;
    setLines([...lines, { key: key(), name: typed.name.trim(), strength: typed.strength.trim() || undefined, unit: typed.unit.trim() || undefined, quantity: Math.max(1, typed.quantity) }]);
    setTyped({ name: "", strength: "", unit: "", quantity: 1 });
  }

  async function submit() {
    if (!lines.length) {
      setError("Add at least one item.");
      return;
    }
    setSaving(true);
    setError("");
    const response = await fetch("/api/trade/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        side,
        ...(orgId ? { orgId } : { contactId }),
        message,
        deliveryAddress,
        lines: lines.map(({ sellerProductId, productId, name, strength, unit, quantity }) => ({ sellerProductId, productId, name, strength, unit, quantity })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not create the order.");
      return;
    }
    // A full navigation keeps the cached lists fresh (they are refreshed on load).
    window.location.assign(data.href);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        {source === "catalog" ? (
          <>
            <h2 className="font-display text-xl text-pine-900">{counterpart}&apos;s items</h2>
            <p className="mt-1 text-sm text-ink/60">Names only. Prices come back in their quote to you.</p>
            <input className="mt-3" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search their items…" aria-label="Search the supplier's items" />
            <ul className="mt-3 divide-y divide-pine-900/10">
              {catalog.map((item) => {
                const added = lines.some((line) => line.sellerProductId === item.id);
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div>
                      <p className="font-semibold">{[item.name, item.strength].filter(Boolean).join(" ")}</p>
                      <p className="text-xs text-ink/60">{[item.form, item.unit, item.manufacturer].filter(Boolean).join(" · ")}</p>
                    </div>
                    <button type="button" className="btn btn-ghost" disabled={added} onClick={() => addCatalog(item)}>
                      {added ? "Added" : <><Plus className="h-4 w-4" /> Add</>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {loading ? <p className="mt-2 text-sm text-ink/50">Loading…</p> : null}
            {catalog.length < total ? (
              <button type="button" className="btn btn-ghost mt-2" onClick={loadMore}>
                Show more ({total - catalog.length} left)
              </button>
            ) : null}
          </>
        ) : source === "own" ? (
          <>
            <h2 className="font-display text-xl text-pine-900">Your items</h2>
            <p className="mt-1 text-sm text-ink/60">Pick from your item list, or type a line below.</p>
            <div className="mt-3">
              <LookupPicker kind="products" value={null} onChange={addOwn} placeholder="Search your items…" />
            </div>
          </>
        ) : null}
        <div className="mt-5 border-t border-pine-900/10 pt-4">
          <h3 className="font-semibold text-pine-900">Type an item</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_110px_110px_80px_auto] sm:items-end">
            <div>
              <label className="text-xs">Item</label>
              <input value={typed.name} onChange={(e) => setTyped({ ...typed, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Strength</label>
              <input value={typed.strength} onChange={(e) => setTyped({ ...typed, strength: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Pack</label>
              <input value={typed.unit} onChange={(e) => setTyped({ ...typed, unit: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Qty</label>
              <input type="number" min={1} value={typed.quantity} onChange={(e) => setTyped({ ...typed, quantity: Number(e.target.value) })} />
            </div>
            <button type="button" className="btn btn-ghost" onClick={addTyped}>
              Add line
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="font-display text-xl text-pine-900">{side === "buyer" ? "Your inquiry" : "Order lines"}</h2>
        <p className="mt-1 text-sm text-ink/60">
          {side === "buyer"
            ? offline
              ? `${counterpart} isn't on Parallax: after saving, print or download the inquiry and send it to them.`
              : `Sent to ${counterpart}, who replies with a quote.`
            : `For ${counterpart}. After saving, set the prices and send the quotation${offline ? " (print or download it for them)" : ""}.`}
        </p>
        {lines.length === 0 ? <p className="mt-4 text-sm text-ink/60">No items yet.</p> : null}
        <ul className="mt-3 divide-y divide-pine-900/10">
          {lines.map((line) => (
            <li key={line.key} className="grid grid-cols-[1fr_90px_auto] items-center gap-2 py-2 text-sm">
              <span>
                {[line.name, line.strength].filter(Boolean).join(" ")}
                {line.unit ? <span className="text-xs text-ink/60"> · {line.unit}</span> : null}
              </span>
              <input
                type="number"
                min={1}
                value={line.quantity}
                aria-label={`Quantity: ${line.name}`}
                onChange={(e) => setLines(lines.map((l) => (l.key === line.key ? { ...l, quantity: Math.max(1, Number(e.target.value) || 1) } : l)))}
              />
              <button type="button" className="btn btn-ghost px-2" aria-label={`Remove ${line.name}`} onClick={() => setLines(lines.filter((l) => l.key !== line.key))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-3">
          <div>
            <label>{side === "buyer" ? "Message to the supplier" : "Message to the customer"}</label>
            <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div>
            <label>Delivery address</label>
            <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" className="btn btn-primary mt-4" disabled={saving} onClick={submit}>
          {saving ? "Saving…" : side === "buyer" ? (offline ? "Save inquiry" : "Send inquiry") : "Save and price it"}
        </button>
      </section>
    </div>
  );
}

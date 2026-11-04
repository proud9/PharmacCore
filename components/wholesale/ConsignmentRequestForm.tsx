"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  sku: string;
  kind: string;
  form: string | null;
};

export function ConsignmentRequestForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("ALL");
  const [lines, setLines] = useState<{ productId: string; name: string; quantity: number }[]>([]);
  const [error, setError] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (kind === "ALL" ? true : p.kind === kind))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, query, kind]);

  function add(product: Product) {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { productId: product.id, name: product.name, quantity: 1 }];
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length) {
      setError("Add at least one item.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/consignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: form.get("notes"),
        deliveryAddress: form.get("deliveryAddress"),
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not submit request");
      return;
    }
    router.push("/portal");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <div>
            <label>Search products</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Medicine or equipment" />
          </div>
          <div>
            <label>Type</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="ALL">All</option>
              <option value="MEDICINE">Medicines</option>
              <option value="EQUIPMENT">Medical equipment</option>
            </select>
          </div>
        </div>
        <div className="mt-4 divide-y divide-pine-900/10">
          {matches.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => add(product)}
              className="flex w-full items-center justify-between py-3 text-left hover:bg-sage-100/60"
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-xs text-ink/60">
                  {product.sku} · {product.kind === "EQUIPMENT" ? "Equipment" : "Medicine"}
                </p>
              </div>
              <span className="text-xs uppercase tracking-wide text-pine-700">Add</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="font-display text-xl text-pine-900">Order list</h2>
        <div className="mt-3 space-y-2 text-sm">
          {lines.length === 0 ? <p className="text-ink/60">No items added yet.</p> : null}
          {lines.map((line) => (
            <div key={line.productId} className="flex items-center justify-between gap-2">
              <span>{line.name}</span>
              <input
                className="w-20"
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) =>
                  setLines((current) =>
                    current.map((item) =>
                      item.productId === line.productId ? { ...item, quantity: Number(e.target.value) } : item,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          <div>
            <label>Delivery address</label>
            <input name="deliveryAddress" placeholder="Ward, stores, or pharmacy receiving bay" />
          </div>
          <div>
            <label>Notes</label>
            <textarea name="notes" rows={3} placeholder="How soon you need it, pack sizes, replacements…" />
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
        <button className="btn btn-primary mt-4 w-full">Send order</button>
      </section>
    </form>
  );
}

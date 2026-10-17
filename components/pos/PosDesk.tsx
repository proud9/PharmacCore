"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  stock: number;
  requiresRx: boolean;
};

type Line = Product & { quantity: number };

export function PosDesk({
  products,
  patients,
  currency,
}: {
  products: Product[];
  patients: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [patientId, setPatientId] = useState("");
  const [payment, setPayment] = useState("CASH");
  const [message, setMessage] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode ?? "").includes(q),
      )
      .slice(0, 8);
  }, [products, query]);

  function add(product: Product) {
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setQuery("");
  }

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  async function checkout() {
    setMessage("");
    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patientId || null,
        payment,
        items: cart.map((line) => ({ productId: line.id, quantity: line.quantity })),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Sale failed");
      return;
    }
    setCart([]);
    setPatientId("");
    setMessage(`Posted ${data.invoiceNo}`);
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <label>Search name, SKU, or barcode</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Start typing…" />
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
                  {product.sku} · {product.stock} on hand {product.requiresRx ? "· Rx" : ""}
                </p>
              </div>
              <p>{money(product.price, currency)}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="font-display text-xl text-pine-900">Basket</h2>
        <div className="mt-3 space-y-2">
          {cart.length === 0 ? <p className="text-sm text-ink/60">No lines yet.</p> : null}
          {cart.map((line) => (
            <div key={line.id} className="flex items-center justify-between text-sm">
              <div>
                <p>{line.name}</p>
                <p className="text-xs text-ink/60">
                  {line.quantity} × {money(line.price, currency)}
                </p>
              </div>
              <button className="text-xs text-rust" onClick={() => setCart((c) => c.filter((x) => x.id !== line.id))}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          <div>
            <label>Patient (optional)</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Walk-in</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Tender</label>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option>CASH</option>
              <option>CARD</option>
              <option>MOBILE</option>
              <option>INSURANCE</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between font-display text-2xl">
          <span>Due</span>
          <span>{money(subtotal, currency)}</span>
        </div>
        {message ? <p className="mt-2 text-sm">{message}</p> : null}
        <button className="btn btn-primary mt-4 w-full" disabled={!cart.length} onClick={checkout}>
          Complete sale
        </button>
      </section>
    </div>
  );
}

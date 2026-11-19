"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/utils";
import { useLookup } from "@/components/search/useLookup";
import { LookupPicker, type Picked } from "@/components/search/LookupPicker";

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

/** Products and patients are searched on the server as the cashier types (see /api/lookup). */
export function PosDesk({ currency }: { currency: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [patient, setPatient] = useState<Picked | null>(null);
  const [payment, setPayment] = useState("CASH");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; invoiceNo: string } | null>(null);

  const { results: matches, loading, reload } = useLookup<Product>("products", query);

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
        patientId: patient?.id ?? null,
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
    setPatient(null);
    reload();
    setReceipt({ id: data.id, invoiceNo: data.invoiceNo });
    setMessage("");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <label>Search name, SKU, or barcode</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Barcode scanners type the code and press Enter: add the first match.
            if (e.key === "Enter" && query.trim() && matches[0]) {
              e.preventDefault();
              add(matches[0]);
            }
          }}
          placeholder="Start typing or scan…"
        />
        <div className="mt-4 divide-y divide-pine-900/10">
          {matches.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => add(product)}
              className="flex w-full items-center justify-between py-3 text-left hover:bg-sage-100/60"
            >
              <div>
                <p>{product.name}</p>
                <p className="text-xs text-ink/60">
                  {product.sku} · {product.stock} on hand {product.requiresRx ? "· Rx" : ""}
                </p>
              </div>
              <p>{money(product.price, currency)}</p>
            </button>
          ))}
          {!loading && matches.length === 0 ? (
            <p className="py-3 text-sm text-ink/60">{query.trim() ? "No products match." : "No products yet."}</p>
          ) : null}
        </div>
      </section>
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="font-display text-xl text-pine-900">Basket</h2>
        <div className="mt-3 space-y-2">
          {cart.length === 0 ? <p className="text-sm text-ink/60">The basket is empty.</p> : null}
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
            <label htmlFor="pos-patient">Patient (optional)</label>
            <LookupPicker
              id="pos-patient"
              kind="patients"
              value={patient}
              onChange={setPatient}
              emptyLabel="Walk-in"
              placeholder="Search patient name or phone"
            />
          </div>
          <div>
            <label>Payment</label>
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
        {receipt ? (
          <p className="mt-2 text-sm">
            Sale saved.{" "}
            <Link className="text-pine-800 underline" href={`/documents/sales/${receipt.id}`}>
              Print invoice {receipt.invoiceNo}
            </Link>
          </p>
        ) : null}
        <button className="btn btn-primary mt-4 w-full" disabled={!cart.length} onClick={checkout}>
          Complete sale
        </button>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { id: string; name: string; sku: string; systemQty: number; counted: string };

export function StockTakeDesk({
  products,
}: {
  products: { id: string; name: string; sku: string; systemQty: number }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    products.map((p) => ({ ...p, counted: String(p.systemQty) })),
  );
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    setMessage("");
    const response = await fetch("/api/stock-take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        applyAdjustments: true,
        items: rows.map((row) => ({
          productId: row.id,
          countedQty: Number(row.counted || 0),
        })),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not post stock take");
      return;
    }
    setMessage(`Posted ${data.reference}`);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <div className="mb-4">
        <label>Count notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="End-of-month floor count" />
      </div>
      <table className="table-grid">
        <thead>
          <tr>
            <th>Product</th>
            <th>System</th>
            <th>Counted</th>
            <th>Variance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const counted = Number(row.counted || 0);
            const variance = counted - row.systemQty;
            return (
              <tr key={row.id}>
                <td>
                  {row.name}
                  <p className="font-mono text-[11px] text-ink/50">{row.sku}</p>
                </td>
                <td>{row.systemQty}</td>
                <td>
                  <input
                    className="w-24"
                    type="number"
                    min={0}
                    value={row.counted}
                    onChange={(e) =>
                      setRows((current) =>
                        current.map((item, i) => (i === index ? { ...item, counted: e.target.value } : item)),
                      )
                    }
                  />
                </td>
                <td className={variance === 0 ? "" : "font-semibold text-rust"}>{variance}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      <button className="btn btn-primary mt-4" onClick={submit}>
        Complete count and adjust stock
      </button>
    </section>
  );
}

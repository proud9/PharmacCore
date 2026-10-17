"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DispenseButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function run() {
    const response = await fetch(`/api/prescriptions/${id}/dispense`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Dispense failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button className="btn btn-primary" onClick={run}>
        Dispense and deduct stock
      </button>
      {error ? <p className="mt-1 text-sm text-rust">{error}</p> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReceivePoButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function run() {
    const response = await fetch(`/api/purchases/${id}/receive`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Receive failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button className="btn btn-primary" onClick={run}>
        Receive into inventory
      </button>
      {error ? <p className="mt-1 text-sm text-rust">{error}</p> : null}
    </div>
  );
}

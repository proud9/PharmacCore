"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL } from "@/lib/wholesale";

export function StatusActions({
  id,
  options,
}: {
  id: string;
  options: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function run(status: string) {
    setError("");
    const response = await fetch(`/api/consignments/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, message: `Moved to ${STATUS_LABEL[status] ?? status}` }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    router.refresh();
  }

  if (!options.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {options.map((status) => (
        <button key={status} className="btn btn-ghost" onClick={() => run(status)}>
          {STATUS_LABEL[status] ?? status}
        </button>
      ))}
      {error ? <p className="w-full text-sm text-rust">{error}</p> : null}
    </div>
  );
}

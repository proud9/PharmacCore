"use client";

import { Fragment, useState, type FormEvent } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Ban, CircleCheck, FileText, Wallet } from "lucide-react";
import { usePost } from "@/components/usePost";
import { Badge } from "@/components/Badge";
import { BILLING_METHODS, BILLING_METHOD_LABEL } from "@/lib/billing";
import { cn, money } from "@/lib/utils";

/**
 * The team marks an account as paid. Amount starts at fee × months when a fee is set. On success
 * it links the new receipt.
 */
export function RecordPaymentForm({
  orgId,
  monthlyFee,
  compact = false,
  wide = false,
  onDone,
}: {
  orgId: string;
  monthlyFee: number | null;
  /** In a list row: one month by default, no explanation. */
  compact?: boolean;
  /** Fields in one row on wide screens. */
  wide?: boolean;
  onDone?: () => void;
}) {
  const inRow = compact || wide;
  const { post, error, saving } = usePost();
  const [months, setMonths] = useState(compact ? 1 : 12);
  const [amount, setAmount] = useState(monthlyFee ? String(monthlyFee * (compact ? 1 : 12)) : "");
  const [touched, setTouched] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; no: string } | null>(null);

  function changeMonths(value: number) {
    setMonths(value);
    if (monthlyFee && !touched) setAmount(String(Math.round(monthlyFee * value * 100) / 100));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await post(`/api/admin/billing/${orgId}/payments`, {
      amount: Number(amount),
      months,
      paidOn: form.get("paidOn"),
      method: form.get("method"),
      reference: form.get("reference") || undefined,
    });
    if (result) {
      setReceipt({ id: String(result.id), no: String(result.receiptNo) });
      onDone?.();
    }
  }

  const id = (name: string) => `${orgId}-${name}`;
  return (
    <form onSubmit={onSubmit} className={cn("grid gap-3", inRow ? "sm:grid-cols-3 lg:grid-cols-6 lg:items-end" : "sm:grid-cols-2")}>
      <div>
        <label htmlFor={id("months")}>Months covered</label>
        <input id={id("months")} type="number" min={1} max={36} required value={months} onChange={(e) => changeMonths(Number(e.target.value) || 1)} />
      </div>
      <div>
        <label htmlFor={id("amount")}>Amount (ZMW)</label>
        <input
          id={id("amount")}
          type="number"
          min={0.01}
          step="any"
          required
          value={amount}
          onChange={(e) => {
            setTouched(true);
            setAmount(e.target.value);
          }}
        />
      </div>
      <div>
        <label htmlFor={id("paidOn")}>Paid on</label>
        <input id={id("paidOn")} name="paidOn" type="date" required max={format(new Date(), "yyyy-MM-dd")} defaultValue={format(new Date(), "yyyy-MM-dd")} />
      </div>
      <div>
        <label htmlFor={id("method")}>Paid by</label>
        <select id={id("method")} name="method" defaultValue="BANK_TRANSFER">
          {BILLING_METHODS.map((method) => (
            <option key={method} value={method}>
              {BILLING_METHOD_LABEL[method]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={id("reference")}>Reference</label>
        <input id={id("reference")} name="reference" maxLength={100} placeholder="Bank or mobile money reference" />
      </div>
      <div className={cn(!inRow && "sm:col-span-2")}>
        <button className="btn btn-primary w-full sm:w-fit" disabled={saving}>
          <CircleCheck className="h-4 w-4" />
          {saving ? "Saving…" : "Mark as paid"}
        </button>
      </div>
      {!compact ? (
        <p className={cn("text-xs text-ink/60", inRow ? "sm:col-span-3 lg:col-span-6" : "sm:col-span-2")}>
          The paid-up period runs on from the current end date, or from today if it has ended or the account is on trial. A numbered receipt is
          issued and the business sees it on its Billing page.
        </p>
      ) : null}
      {error ? <p className={cn("text-sm text-rust", inRow ? "sm:col-span-3 lg:col-span-6" : "sm:col-span-2")}>{error}</p> : null}
      {receipt ? (
        <p role="status" className={cn("text-sm text-pine-800", inRow ? "sm:col-span-3 lg:col-span-6" : "sm:col-span-2")}>
          Recorded. Receipt{" "}
          <a className="font-mono underline underline-offset-2" href={`/documents/subscription/${receipt.id}`}>
            {receipt.no}
          </a>{" "}
          issued.
        </p>
      ) : null}
    </form>
  );
}

/** The agreed fee per month. Blank clears it. */
export function FeeForm({ orgId, monthlyFee }: { orgId: string; monthlyFee: number | null }) {
  const { post, error, saving } = usePost();
  const [saved, setSaved] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const raw = String(new FormData(event.currentTarget).get("fee") ?? "").trim();
    if (await post(`/api/admin/billing/${orgId}`, { monthlyFee: raw === "" ? null : Number(raw) })) setSaved(true);
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[160px] flex-1">
        <label htmlFor={`${orgId}-fee`}>Fee per month (ZMW)</label>
        <input id={`${orgId}-fee`} name="fee" type="number" min={0} step="any" defaultValue={monthlyFee ?? ""} placeholder="Not agreed yet" />
      </div>
      <button className="btn btn-ghost" disabled={saving}>
        {saving ? "Saving…" : "Save fee"}
      </button>
      {saved ? <p className="w-full text-sm text-pine-800">Saved.</p> : null}
      {error ? <p className="w-full text-sm text-rust">{error}</p> : null}
    </form>
  );
}

/** Suspend at once (login stops, sessions end) or reactivate. */
export function SuspendToggle({ orgId, name, status, compact = false }: { orgId: string; name: string; status: string; compact?: boolean }) {
  const { post, error, saving } = usePost();
  const suspended = status === "SUSPENDED";
  async function toggle() {
    const question = suspended
      ? `Reactivate ${name}? Its login works again.`
      : `Suspend ${name} now? Its login stops working at once and it is signed out everywhere, until you reactivate it.`;
    if (!window.confirm(question)) return;
    await post(`/api/admin/businesses/${orgId}/status`, { status: suspended ? "ACTIVE" : "SUSPENDED" });
  }
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={cn("btn btn-ghost whitespace-nowrap", !suspended && "text-rust", compact && "px-2.5 py-1.5 text-xs")}
      >
        <Ban className="h-4 w-4" />
        {suspended ? "Reactivate" : "Suspend"}
      </button>
      {error ? <span className="mt-1 text-xs text-rust">{error}</span> : null}
    </span>
  );
}

export type BillingRowData = {
  id: string;
  name: string;
  kindLabel: string;
  town: string | null;
  status: string;
  stateLabel: string;
  stateTone: "neutral" | "good" | "warn" | "bad" | "brass" | "info";
  periodEnd: string | null;
  dueText: string;
  overdue: boolean;
  monthlyFee: number | null;
  lastPayment: { paidOn: string; amount: number; id: string } | null;
};

/** One account on the team's Billing list. "Mark as paid" opens the payment form in a row below. */
export function BillingRow({ row }: { row: BillingRowData }) {
  const [open, setOpen] = useState(false);
  return (
    <Fragment>
      <tr className={cn(row.status === "SUSPENDED" && "bg-rust/5")}>
        <td>
          <Link href={`/admin/billing/${row.id}`} className="font-semibold text-pine-800 hover:underline">
            {row.name}
          </Link>
          <p className="text-xs text-ink/60">
            {row.kindLabel}
            {row.town ? ` · ${row.town}` : ""}
          </p>
        </td>
        <td>
          <div className="flex flex-wrap gap-1">
            <Badge tone={row.stateTone}>{row.stateLabel}</Badge>
            {row.status === "SUSPENDED" ? <Badge tone="bad">Suspended</Badge> : null}
          </div>
        </td>
        <td className="whitespace-nowrap">
          {row.periodEnd ? format(new Date(row.periodEnd), "dd MMM yyyy") : "—"}
          <p className={cn("text-xs", row.overdue ? "font-semibold text-rust" : "text-ink/60")}>{row.dueText}</p>
        </td>
        <td className="whitespace-nowrap text-right tabular-nums">{row.monthlyFee != null ? money(row.monthlyFee) : "—"}</td>
        <td className="whitespace-nowrap">
          {row.lastPayment ? (
            <a href={`/documents/subscription/${row.lastPayment.id}`} className="inline-flex items-center gap-1 hover:underline" title="Open the receipt">
              <FileText className="h-3.5 w-3.5 text-pine-700" />
              {money(row.lastPayment.amount)}
              <span className="text-xs text-ink/60">· {format(new Date(row.lastPayment.paidOn), "dd MMM yyyy")}</span>
            </a>
          ) : (
            <span className="text-ink/50">None</span>
          )}
        </td>
        <td>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              className={cn("btn whitespace-nowrap px-2.5 py-1.5 text-xs", open ? "btn-primary" : "btn-ghost")}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <Wallet className="h-4 w-4" />
              Mark as paid
            </button>
            <SuspendToggle orgId={row.id} name={row.name} status={row.status} compact />
          </div>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={6} className="bg-shelf/70">
            <p className="mb-2 text-sm font-semibold text-pine-900">Record a payment from {row.name}</p>
            <RecordPaymentForm orgId={row.id} monthlyFee={row.monthlyFee} compact />
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

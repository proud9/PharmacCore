"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { BUYER_LABEL, SELLER_LABEL } from "@/lib/trade";
import { cn } from "@/lib/utils";
import { PlayToggle } from "./PlayToggle";
import { useCycle } from "./useCycle";

type Step = {
  by: "buyer" | "seller";
  title: string;
  text: string;
  /** The document this step produces, if any. */
  doc?: string;
  /** The order's status after this step (for each side's wording). */
  status: string;
};

const START: Step[] = [
  { by: "buyer", title: "Inquiry", text: "The buyer ticks items from the supplier's list (names only) with quantities and sends the inquiry.", doc: "Inquiry", status: "INQUIRY" },
  { by: "seller", title: "Quote", text: "The seller prices each line, sets a ready date and how long the price holds, and sends the quote. Only this buyer sees it.", doc: "Quotation", status: "QUOTED" },
  { by: "buyer", title: "Accept", text: "The buyer accepts the price. That sends the purchase order in the same step.", doc: "Purchase order", status: "ORDERED" },
];

const PREPAY: Step[] = [
  ...START,
  { by: "seller", title: "Invoice", text: "Paid before delivery: the seller issues the invoice first. Nothing can leave until it is paid.", doc: "Invoice", status: "ORDERED" },
  { by: "seller", title: "Payment", text: "The buyer pays into the seller's bank account; the seller records the payment on the order.", status: "ORDERED" },
  { by: "seller", title: "Dispatch", text: "Once it is paid in full the seller dispatches. Stock leaves the seller's inventory, earliest expiry first.", doc: "Delivery note", status: "DISPATCHED" },
  { by: "buyer", title: "Receive", text: "The buyer confirms what arrived. Received and paid in full, the order closes by itself.", status: "CLOSED" },
];

const LATER: Step[] = [
  ...START,
  { by: "seller", title: "Dispatch", text: "The seller dispatches with a delivery note. Stock leaves the seller's inventory, earliest expiry first.", doc: "Delivery note", status: "DISPATCHED" },
  { by: "buyer", title: "Receive", text: "The buyer confirms the quantities that arrived. A buyer that keeps stock finds the lines waiting in its delivery queue.", status: "RECEIVED" },
  { by: "seller", title: "Invoice", text: "The seller issues the invoice (it can also go out before dispatch). On credit, it is due after the agreed days.", doc: "Invoice", status: "RECEIVED" },
  { by: "seller", title: "Payment", text: "The buyer pays; the seller records it. Received and paid in full, the order closes by itself.", status: "CLOSED" },
];

/**
 * The order flow as two lanes, buyer and seller, with the documents passing between them. `you`
 * marks the reader's side; the panel shows how each side words the order's status at that step.
 */
export function OrderFlow({ you }: { you?: "buyer" | "seller" | "both" }) {
  const [terms, setTerms] = useState<"PREPAY" | "LATER">("LATER");
  const steps = terms === "PREPAY" ? PREPAY : LATER;
  const { index, choose, playing, reduced, toggle, hover } = useCycle(steps.length, 3000);
  const step = steps[Math.min(index, steps.length - 1)];
  const lanes: ("buyer" | "seller")[] = ["buyer", "seller"];

  return (
    <figure className="my-6 rounded-2xl border border-rule bg-shelf/60 p-4 sm:p-5" {...hover}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <figcaption className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine-700/80">How an order moves</figcaption>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-rule bg-white p-0.5 text-xs" role="group" aria-label="Payment terms">
            {(
              [
                ["LATER", "Pay on delivery or credit"],
                ["PREPAY", "Pay before delivery"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTerms(value);
                  choose(0);
                }}
                aria-pressed={terms === value}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  terms === value ? "bg-pine-800 text-white" : "text-pine-700 hover:bg-sage-100",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <PlayToggle playing={playing} reduced={reduced} onToggle={toggle} />
        </div>
      </div>

      {/* Wide screens: two lanes, one column per step */}
      <div className="hidden md:block">
        <div className="grid gap-x-1 gap-y-2" style={{ gridTemplateColumns: `56px repeat(${steps.length}, minmax(0, 1fr))` }}>
          {lanes.map((lane) => (
            <div key={lane} className="contents">
              <div className="flex flex-col justify-center pr-1">
                <span className="text-xs font-semibold text-pine-900">{lane === "buyer" ? "Buyer" : "Seller"}</span>
                {you === lane || you === "both" ? (
                  <span className="mt-0.5 w-fit rounded-full bg-dispensary-soft px-2 py-0.5 text-[10px] font-semibold text-dispensary">You</span>
                ) : null}
              </div>
              {steps.map((s, i) => {
                const mine = s.by === lane;
                const active = i === index;
                return (
                  <button
                    key={`${lane}-${s.title}-${i}`}
                    type="button"
                    onClick={() => choose(i)}
                    tabIndex={mine ? 0 : -1}
                    aria-hidden={!mine}
                    className={cn(
                      "relative flex min-h-[72px] min-w-0 flex-col items-start justify-center rounded-xl px-2 py-2 text-left transition duration-300",
                      mine
                        ? active
                          ? "bg-pine-800 text-white shadow-panel"
                          : i < index
                            ? "border border-pine-700/30 bg-white text-pine-900"
                            : "border border-rule bg-white text-ink/60 hover:border-pine-700/40"
                        : "pointer-events-none border border-dashed border-rule/70",
                    )}
                  >
                    {mine ? (
                      <>
                        <span className={cn("text-[10px] font-semibold", active ? "text-sage-300" : "text-foil")}>{i + 1}</span>
                        <span className="text-xs font-semibold leading-tight">{s.title}</span>
                        {s.doc ? (
                          <span
                            className={cn(
                              "mt-1 inline-flex max-w-full items-start gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                              active ? "guide-pop bg-white/15 text-white" : "bg-shelf text-pine-700",
                            )}
                          >
                            <FileText className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
                            {s.doc}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {/* progress track */}
        <div className="ml-[56px] mt-3 h-1 rounded-full bg-rule">
          <div className="h-full rounded-full bg-dispensary transition-[width] duration-700 ease-out" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {/* Narrow screens: one list, each step tagged with who does it */}
      <ol className="space-y-1.5 md:hidden">
        {steps.map((s, i) => (
          <li key={`${s.title}-${i}`}>
            <button
              type="button"
              onClick={() => choose(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                i === index ? "bg-pine-800 text-white" : "bg-white text-ink",
              )}
            >
              <span className="w-4 text-xs font-semibold opacity-70">{i + 1}</span>
              <span className="flex-1 font-semibold">{s.title}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", i === index ? "bg-white/15" : "bg-shelf text-pine-700")}>
                {s.by === "buyer" ? "Buyer" : "Seller"}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div key={`${terms}-${index}`} className="guide-fade mt-4 grid gap-3 rounded-xl bg-white p-4 text-sm shadow-sm sm:grid-cols-[1fr_auto]" aria-live="polite">
        <p>
          <span className="font-semibold text-pine-900">
            {index + 1}. {step.title}
          </span>{" "}
          <span className="text-ink/80">({step.by === "buyer" ? "buyer" : "seller"})</span>: {step.text}
        </p>
        <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-3 gap-y-1 text-xs sm:border-l sm:border-rule sm:pl-4">
          <dt className="text-foil">Buyer sees</dt>
          <dd className="font-semibold text-pine-900">{BUYER_LABEL[step.status]}</dd>
          <dt className="text-foil">Seller sees</dt>
          <dd className="font-semibold text-pine-900">{SELLER_LABEL[step.status]}</dd>
        </dl>
      </div>
    </figure>
  );
}

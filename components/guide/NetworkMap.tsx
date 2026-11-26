import { Factory, Hospital, ShieldCheck, Store, Warehouse, type LucideIcon } from "lucide-react";
import { ROLE_LABEL, TRADE_PAIRS, customerKinds, supplierKinds, type OrgKind } from "@/lib/capabilities";
import { cn } from "@/lib/utils";

const NODES: { kind: OrgKind; x: number; icon: LucideIcon; label: string }[] = [
  { kind: "MANUFACTURER", x: 95, icon: Factory, label: "Manufacturers" },
  { kind: "WHOLESALER", x: 285, icon: Warehouse, label: "Wholesalers" },
  { kind: "RETAILER", x: 475, icon: Store, label: "Pharmacies" },
  { kind: "CLIENT", x: 665, icon: Hospital, label: "Clients" },
];
const Y = 170;
const R = 30;

/** Path from seller to buyer for each allowed trade pair. Wholesaler → client arcs over pharmacies. */
function linkPath(seller: OrgKind, buyer: OrgKind) {
  const a = NODES.find((n) => n.kind === seller)!.x;
  const b = NODES.find((n) => n.kind === buyer)!.x;
  if (b - a > 200) return `M ${a + 12} ${Y - R + 4} C ${a + 70} 52, ${b - 70} 52, ${b - 12} ${Y - R + 4}`;
  return `M ${a + R + 4} ${Y} L ${b - R - 4} ${Y}`;
}

const plural = (kinds: OrgKind[]) => kinds.map((k) => NODES.find((n) => n.kind === k)!.label.toLowerCase());
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/**
 * Who trades with whom on Parallax, with the reader's own links drawn in and moving: inquiries and
 * purchase orders travel up the chain, quotes, goods and invoices come down it. For the team, the
 * businesses are drawn as closed boxes it manages but cannot look into.
 */
export function NetworkMap({ kind }: { kind: OrgKind | "ADMIN" }) {
  const team = kind === "ADMIN";
  const mine = (seller: OrgKind, buyer: OrgKind) => !team && (seller === kind || buyer === kind);
  const buysFrom = team ? [] : supplierKinds(kind);
  const sellsTo = team ? [] : customerKinds(kind);

  return (
    <figure className="my-6 rounded-2xl border border-rule bg-shelf/60 p-4 sm:p-5">
      <figcaption className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-pine-700/80">
        {team ? "The network you look after" : "Who you trade with"}
      </figcaption>

      <svg viewBox={`0 0 760 ${team ? 312 : 250}`} className="hidden w-full md:block" role="img" aria-label={summary(kind, buysFrom, sellsTo)}>
        {TRADE_PAIRS.map(({ seller, buyer }) => {
          const d = linkPath(seller, buyer);
          const active = mine(seller, buyer);
          return (
            <g key={`${seller}-${buyer}`}>
              <path d={d} fill="none" strokeWidth={active ? 2.5 : 1.5} className={active ? "stroke-pine-700" : "stroke-rule"} strokeDasharray={active ? undefined : "5 5"} />
              {active ? (
                <>
                  {/* buyer → seller: inquiries and purchase orders */}
                  <circle r="5" className="guide-moving fill-brass">
                    <animateMotion dur="3.4s" repeatCount="indefinite" path={d} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
                  </circle>
                  {/* seller → buyer: quotes, goods and invoices */}
                  <circle r="5" className="guide-moving fill-dispensary">
                    <animateMotion dur="3.4s" begin="1.7s" repeatCount="indefinite" path={d} />
                  </circle>
                </>
              ) : null}
            </g>
          );
        })}

        {team
          ? NODES.map((node) => (
              <path
                key={`team-${node.kind}`}
                d={`M 380 268 Q ${(380 + node.x) / 2} 250 ${node.x} ${Y + R + 32}`}
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="3 5"
                className="guide-dash stroke-sage-500"
              />
            ))
          : null}

        {NODES.map((node) => {
          const Icon = node.icon;
          const you = node.kind === kind;
          const related = team || you || buysFrom.includes(node.kind) || sellsTo.includes(node.kind);
          return (
            <g key={node.kind} className={cn("transition-opacity", related ? "opacity-100" : "opacity-40")}>
              {you ? <circle cx={node.x} cy={Y} r={R + 9} className="guide-pulse fill-dispensary/15" /> : null}
              <circle cx={node.x} cy={Y} r={R} strokeWidth={2} className={you ? "fill-pine-800 stroke-pine-800" : "fill-white stroke-pine-900/20"} />
              <Icon x={node.x - 13} y={Y - 13} width={26} height={26} strokeWidth={1.75} className={you ? "text-white" : "text-pine-800"} />
              {team ? <Lockish x={node.x + 17} y={Y - 32} /> : null}
              <text x={node.x} y={Y + R + 22} textAnchor="middle" className="fill-pine-900 font-display text-[15px] font-semibold">
                {node.label}
              </text>
              {you ? (
                <g>
                  <rect x={node.x - 20} y={Y - R - 34} width={40} height={20} rx={10} className="fill-dispensary" />
                  <text x={node.x} y={Y - R - 20} textAnchor="middle" className="fill-white text-[11px] font-semibold">
                    You
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {team ? (
          <g>
            <rect x={300} y={268} width={160} height={36} rx={12} className="fill-pine-800" />
            <ShieldCheck x={314} y={277} width={18} height={18} className="text-white" />
            <text x={392} y={291} textAnchor="middle" className="fill-white text-[13px] font-semibold">
              Parallax team
            </text>
          </g>
        ) : null}
      </svg>

      {/* Narrow screens: the same facts as a list */}
      <ul className="space-y-1.5 text-sm md:hidden">
        {team ? (
          <li>Manufacturers, wholesalers, pharmacies and clients each have a private account. You manage the accounts; you can&apos;t see inside them.</li>
        ) : (
          <>
            {buysFrom.length ? (
              <li>
                <span className="font-semibold text-pine-900">You buy from:</span> {list(plural(buysFrom))}
              </li>
            ) : null}
            {sellsTo.length ? (
              <li>
                <span className="font-semibold text-pine-900">You sell to:</span> {list(plural(sellsTo))}
              </li>
            ) : null}
          </>
        )}
      </ul>

      {team ? (
        <p className="mt-3 text-xs text-ink/70">Dotted lines: accounts, logins, subscriptions and announcements. The lock: their stock, prices and documents stay closed to you.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brass" aria-hidden="true" /> Inquiries and purchase orders go to the seller
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-dispensary" aria-hidden="true" /> Quotes, goods and invoices come back to the buyer
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2 border-dashed border-rule" aria-hidden="true" /> Trade that doesn&apos;t involve you
          </span>
        </div>
      )}
    </figure>
  );
}

function Lockish({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x + 8} cy={y + 8} r={11} className="fill-white stroke-pine-900/15" />
      <rect x={x + 3} y={y + 7} width={10} height={8} rx={1.5} className="fill-pine-800" />
      <path d={`M ${x + 5} ${y + 7} v -2.5 a 3 3 0 0 1 6 0 v 2.5`} fill="none" strokeWidth={1.6} className="stroke-pine-800" />
    </g>
  );
}

function summary(kind: OrgKind | "ADMIN", buys: OrgKind[], sells: OrgKind[]) {
  if (kind === "ADMIN") return "Manufacturers, wholesalers, pharmacies and clients each have a private account that the Parallax team manages but cannot see into.";
  const parts = [`You are a ${ROLE_LABEL[kind].toLowerCase()}.`];
  if (buys.length) parts.push(`You buy from ${list(plural(buys))}.`);
  if (sells.length) parts.push(`You sell to ${list(plural(sells))}.`);
  return parts.join(" ");
}

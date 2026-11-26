/**
 * Account types and what each can do. Nav (components/Shell.tsx), page guards and API guards all
 * read from here. Client-safe (no database).
 */
export const ORG_KINDS = ["MANUFACTURER", "WHOLESALER", "RETAILER", "CLIENT"] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

export const ROLES = ["ADMIN", ...ORG_KINDS] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Parallax team",
  MANUFACTURER: "Manufacturer",
  WHOLESALER: "Wholesaler",
  RETAILER: "Retailer",
  CLIENT: "Client",
};

export const KIND_HINT: Record<OrgKind, string> = {
  MANUFACTURER: "You make products and supply wholesalers.",
  WHOLESALER: "You buy from manufacturers and supply retailers and clients.",
  RETAILER: "A pharmacy or shop: you buy from wholesalers and serve clients and walk-in patients.",
  CLIENT: "A hospital, clinic, school, NGO or other service that buys medicines and supplies.",
};

/** Who may sell to whom. Change trading rules here only. */
export const TRADE_PAIRS: readonly { seller: OrgKind; buyer: OrgKind }[] = [
  { seller: "MANUFACTURER", buyer: "WHOLESALER" },
  { seller: "WHOLESALER", buyer: "RETAILER" },
  { seller: "WHOLESALER", buyer: "CLIENT" },
  { seller: "RETAILER", buyer: "CLIENT" },
];

export function canTrade(seller: string, buyer: string) {
  return TRADE_PAIRS.some((pair) => pair.seller === seller && pair.buyer === buyer);
}

/** Kinds this kind can buy from. */
export function supplierKinds(kind: string): OrgKind[] {
  return TRADE_PAIRS.filter((pair) => pair.buyer === kind).map((pair) => pair.seller);
}

/** Kinds this kind can sell to. */
export function customerKinds(kind: string): OrgKind[] {
  return TRADE_PAIRS.filter((pair) => pair.seller === kind).map((pair) => pair.buyer);
}

export type Capability = "sell" | "buy" | "inventory" | "counter" | "catalog";

const CAPS: Record<OrgKind, readonly Capability[]> = {
  MANUFACTURER: ["sell", "catalog"],
  WHOLESALER: ["sell", "buy", "inventory", "catalog"],
  RETAILER: ["sell", "buy", "inventory", "catalog", "counter"],
  CLIENT: ["buy"],
};

export function can(kind: string | null | undefined, capability: Capability) {
  return !!kind && (CAPS[kind as OrgKind] ?? []).includes(capability);
}

export function isOrgKind(value: string): value is OrgKind {
  return (ORG_KINDS as readonly string[]).includes(value);
}

/** Paying account types (clients use Parallax free). */
export const PAYING_KINDS: readonly OrgKind[] = ["MANUFACTURER", "WHOLESALER", "RETAILER"];

export function homePath(role: string) {
  if (role === "ADMIN") return "/admin";
  return "/dashboard";
}

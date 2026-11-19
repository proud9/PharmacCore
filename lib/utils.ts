import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(value: number, currency = "ZMW") {
  const locale = currency === "ZMW" ? "en-ZM" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ref(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export function stockOf(batches: { quantity: number }[]) {
  return batches.reduce((sum, batch) => sum + batch.quantity, 0);
}

export const ROLES = ["ADMIN", "FINANCE", "SALES", "BUYER", "MANUFACTURER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  FINANCE: "Finance",
  SALES: "Sales",
  BUYER: "Client account",
  MANUFACTURER: "Manufacturer",
};

export const STAFF_ROLES = ["ADMIN", "FINANCE", "SALES"] as const;

/** Roles removed in the wholesale role change; scripts/migrate-roles.ts moves their users to SALES. */
export const LEGACY_ROLES = ["WHOLESALE_ADMIN", "PHARMACIST", "TECHNICIAN", "CASHIER", "INVENTORY"] as const;

export { homePath } from "./paths";

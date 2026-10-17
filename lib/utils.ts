import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
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

export const ROLES = ["ADMIN", "PHARMACIST", "TECHNICIAN", "CASHIER", "INVENTORY"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  PHARMACIST: "Pharmacist",
  TECHNICIAN: "Pharmacy technician",
  CASHIER: "Cashier",
  INVENTORY: "Inventory officer",
};

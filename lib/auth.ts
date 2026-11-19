import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { LEGACY_ROLES, type Role } from "./utils";

export const SESSION_COOKIE = "pharmacore_session";
const COOKIE = SESSION_COOKIE;

/**
 * The session cookie is HTTPS-only in production. Set COOKIE_SECURE=false to run the production
 * server over plain HTTP on a trusted local network (otherwise signing in silently fails there).
 */
export function secureCookies() {
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  institutionId?: string | null;
};

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The signed-in, still-active user, or null. Cached per request: layout and page share one lookup. */
export const requireUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) return null;
  return {
    ...session,
    // Until scripts/migrate-roles.ts has run, users on removed roles work as SALES instead of being locked out.
    role: ((LEGACY_ROLES as readonly string[]).includes(user.role) ? "SALES" : user.role) as Role,
    institutionId: user.institutionId,
    supplierId: user.supplierId,
  };
});

/**
 * Wholesale staff roles:
 * - ADMIN: the owner account made at set-up; can do everything.
 * - FINANCE: quotations, invoices, payments, reports, company and bank details.
 * - SALES: stock intake and inventory, the sales counter, buyers, and moving orders to delivery.
 * BUYER is a client's single account (pharmacy, clinic, hospital, school).
 * MANUFACTURER is a supplier's single account: quotes, invoices and dispatches purchase orders.
 */
export function canManageStaff(role: string) {
  return role === "ADMIN";
}

export function isBuyer(role: string) {
  return role === "BUYER";
}

/** A manufacturer's single account: sees only its own purchase orders, in /supplier. */
export function isManufacturer(role: string) {
  return role === "MANUFACTURER";
}

/** Any wholesale staff member. Every staff role can see orders, documents, inventory and sales history. */
export function isStaff(role: string) {
  return role === "ADMIN" || role === "FINANCE" || role === "SALES";
}

/** Prices, quotations, invoices, payments, reports. */
export function canFinance(role: string) {
  return role === "ADMIN" || role === "FINANCE";
}

/** Stock, the sales counter, prescriptions, patients, buyers, and order progress. */
export function canSell(role: string) {
  return role === "ADMIN" || role === "SALES";
}

/** Company details, logo and bank details. */
export function canEditCompany(role: string) {
  return canFinance(role);
}

export function canDispense(role: string) {
  return canSell(role);
}

export function canAdjustStock(role: string) {
  return canSell(role);
}

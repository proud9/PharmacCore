import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import type { Role } from "./capabilities";

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

/** What the cookie carries. `sv` must match User.sessionVersion, so a reset ends old sessions. */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgId: string | null;
  sv: number;
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

/** Signs a user in on this response. */
export async function startSession(user: { id: string; email: string; name: string; role: string; orgId: string | null; sessionVersion: number }) {
  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    orgId: user.orgId,
    sv: user.sessionVersion,
  });
  await setSessionCookie(token);
}

/**
 * The signed-in, still-active user with their business, or null. Cached per request: layout and
 * page share one lookup. Null for a deactivated login, a suspended or deleted business, or a
 * session older than the last password reset.
 */
export const requireUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.id },
    include: { org: { include: { subscription: true } } },
  });
  if (!user || !user.active) return null;
  if ((session.sv ?? 0) !== user.sessionVersion) return null;
  if (user.role !== "ADMIN") {
    if (!user.org || user.org.status !== "ACTIVE" || user.org.kind !== user.role) return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    orgId: user.orgId,
    org: user.org,
    mustChangePassword: user.mustChangePassword,
  };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof requireUser>>>;

export function isPlatformAdmin(role: string) {
  return role === "ADMIN";
}

/** Minimum length for every new password. */
export const PASSWORD_MIN = 10;

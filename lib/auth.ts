import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import type { Role } from "./utils";

const COOKIE = "pharmacore_session";

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
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function requireUser() {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) return null;
  return { ...session, role: user.role as Role };
}

export function canManageStaff(role: string) {
  return role === "ADMIN";
}

export function canDispense(role: string) {
  return role === "ADMIN" || role === "PHARMACIST";
}

export function canAdjustStock(role: string) {
  return role === "ADMIN" || role === "INVENTORY" || role === "PHARMACIST";
}

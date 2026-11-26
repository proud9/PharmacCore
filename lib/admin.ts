import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireUser, type CurrentUser } from "./auth";
import { homePath } from "./capabilities";

/**
 * The Parallax team's area. It uses adminDb() (lib/db.ts), whose database role has no access to
 * any business's stock, orders, quotes, invoices or patients: only accounts, subscriptions,
 * announcements and demo requests.
 */
export async function pageAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user) redirect("/api/auth/signout");
  if (user.role !== "ADMIN") redirect(homePath(user.role));
  return user;
}

export async function apiAdmin(): Promise<{ ok: true; user: CurrentUser } | { ok: false; response: NextResponse }> {
  const user = await requireUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  if (user.role !== "ADMIN") return { ok: false, response: NextResponse.json({ error: "Your account can't do that." }, { status: 403 }) };
  return { ok: true, user };
}

export { temporaryPassword } from "./passwords";

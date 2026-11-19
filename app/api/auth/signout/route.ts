import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Clears the session cookie and goes to sign-in. Pages send people here when their cookie is
 * still valid but the account behind it was deactivated or deleted (e.g. after reseeding),
 * which would otherwise bounce between /login and the app forever.
 */
export async function GET(request: Request) {
  const url = new URL("/login?ended=1", request.url);
  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

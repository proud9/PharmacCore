import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { homePath } from "@/lib/capabilities";

const PUBLIC = [
  "/",
  "/login",
  "/signup",
  "/terms",
  "/privacy",
  "/api/auth/signout",
  "/api/auth/login",
  "/api/auth/register",
  "/api/demo-requests",
];

/**
 * First gate only: signed in or not, and which area a role belongs in. Every page and route
 * still checks the business and its capabilities itself (lib/tenant.ts).
 * - ADMIN (Parallax team) is confined to /admin and /api/admin.
 * - Businesses can never open /admin.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const token = request.cookies.get("pharmacore_session")?.value;

  async function roleFromToken() {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      return String(payload.role ?? "");
    } catch {
      return null;
    }
  }

  if (isPublic) {
    if (token && (pathname === "/login" || pathname === "/signup")) {
      const role = await roleFromToken();
      if (role) return redirect(request, homePath(role));
    }
    return NextResponse.next();
  }

  const role = await roleFromToken();
  if (!role) {
    if (pathname.startsWith("/api")) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (token) url.searchParams.set("ended", "1");
    else url.searchParams.set("next", pathname);
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete("pharmacore_session");
    return response;
  }

  const adminArea = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin");
  const shared = pathname.startsWith("/account") || pathname.startsWith("/api/account") || pathname === "/api/auth/logout";
  if (role === "ADMIN") {
    // The team may also open subscription receipts (the page itself checks who is asking).
    if (adminArea || shared || pathname.startsWith("/api/demo-requests") || pathname.startsWith("/documents/subscription/")) return NextResponse.next();
    if (pathname.startsWith("/api")) return NextResponse.json({ error: "Your account can't do that." }, { status: 403 });
    return redirect(request, "/admin");
  }
  if (adminArea) {
    if (pathname.startsWith("/api")) return NextResponse.json({ error: "Your account can't do that." }, { status: 403 });
    return redirect(request, homePath(role));
  }
  return NextResponse.next();
}

function redirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

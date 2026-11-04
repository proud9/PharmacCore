import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { homePath } from "@/lib/paths";

const PUBLIC = ["/login", "/api/auth/login"];

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
    if (token && pathname === "/login") {
      const role = await roleFromToken();
      if (role) {
        const url = request.nextUrl.clone();
        url.pathname = homePath(role);
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = await roleFromToken();
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (role === "BUYER" && !pathname.startsWith("/portal") && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  if (role !== "BUYER" && pathname.startsWith("/portal")) {
    const url = request.nextUrl.clone();
    url.pathname = homePath(role);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

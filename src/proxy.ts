/* ========================================
   CyneMora — Proxy (Route Protection)
   Next.js 16 replaces middleware.ts with proxy.ts
   Runs before routes render — protects dashboard
   ======================================== */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedPaths = ["/dashboard", "/project", "/admin"];

// Routes that should redirect TO dashboard if already authenticated
const authPaths = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("__session")?.value;

  // Check if user is accessing a protected route without a session
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user has session and tries to access auth pages, redirect to dashboard
  const isAuthPath = authPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isAuthPath && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (handled by route handlers)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest.json, etc
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.png$|.*\\.svg$).*)",
  ],
};

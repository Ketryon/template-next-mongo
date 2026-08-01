import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirects only — NOT authorisation.
 *
 * provsvaret wrapped their middleware in `auth()` and used it to gate
 * `/dashboard`. This template deliberately does not: middleware must be assumed
 * bypassable (CVE-2025-29927), and every real check already happens in the DAL,
 * below all entry points. Deleting this file would make the app uglier — an
 * unauthenticated visitor would reach a page that renders "not signed in"
 * instead of being redirected — not less safe.
 *
 * Reading the session cookie's *presence* is fine for that: the cost of being
 * wrong is a redirect, and the cookie is unforgeable-in-practice anyway.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession && pathname.startsWith("/orders")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|webp)$).*)",
  ],
};

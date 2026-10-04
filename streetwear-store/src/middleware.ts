import { NextResponse, type NextRequest } from "next/server";

/**
 * 1) CSRF protection: every state-changing request (POST/PUT/PATCH/DELETE – including Next.js
 *    Server Actions) must come from our own origin (Origin, or Referer as fallback).
 *    Webhooks are exempt (they are verified by signature instead).
 * 2) Fast redirect of anonymous visitors away from /admin (real session check happens server-side).
 */
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_EXEMPT = [/^\/api\/webhooks\//];

function requestHost(req: NextRequest) {
  return (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0]!.trim();
}

function sameOrigin(req: NextRequest) {
  const host = requestHost(req);
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source || !host) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (UNSAFE.has(req.method) && !CSRF_EXEMPT.some((r) => r.test(pathname)) && !sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !req.cookies.has("sa_admin")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};

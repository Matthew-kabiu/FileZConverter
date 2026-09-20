import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// NOTE (Next 16): the `middleware` file convention is deprecated and renamed
// to `proxy`. The locked template names middleware.ts; per the template's own
// precedence rule the current official API wins, so this ships as proxy.ts.
//
// RAG plan §3: auth gating for protected route groups lands here, never
// inside pages. Conversions, session purge, health, studios, sign-in, and
// first-run setup stay public. Edge-safe by construction: only the session
// COOKIE is read here (no DB on the edge) — Route Handlers re-verify the
// session server-side, so a stale cookie fails closed at the handler.
const GATED = [
  /^\/admin(\/|$)/,
  /^\/api\/v1\/ask(\/|$)/,
  /^\/api\/v1\/rag(\/|$)/,
  /^\/api\/v1\/admin(\/|$)/,
];

export function proxy(request: NextRequest) {
  const url = new URL(request.url);
  if (!GATED.some((re) => re.test(url.pathname))) {
    return NextResponse.next();
  }
  if (getSessionCookie(request)) {
    return NextResponse.next();
  }
  if (url.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, data: null, error: "unauthorized" },
      { status: 401 },
    );
  }
  const signIn = new URL("/", url);
  signIn.searchParams.set("auth", "signin");
  signIn.searchParams.set("next", `${url.pathname}${url.search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/v1/ask/:path*",
    "/api/v1/rag/:path*",
    "/api/v1/admin/:path*",
  ],
};

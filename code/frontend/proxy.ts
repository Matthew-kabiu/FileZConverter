import { NextResponse } from "next/server";

// NOTE (Next 16): the `middleware` file convention is deprecated and renamed
// to `proxy`. The locked template names middleware.ts; per the template's own
// precedence rule the current official API wins, so this ships as proxy.ts.
export function proxy() {
  // No auth surface yet — pass through. Auth gating for future protected
  // route groups lands here, never inside pages.
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    // React dev tooling needs eval() for callstack reconstruction; production
    // never uses it, so 'unsafe-eval' is dev-only. Scripts stay 'self' +
    // 'unsafe-inline' (Next.js renders its runtime inline, no nonce infra).
    const scriptSrc =
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // blob: is required: file previews render from object URLs in
            // sandboxed iframes / <img> tags (see SpookieFiles renderers).
            // 'unsafe-inline' scripts are required: Next.js renders its own
            // bootstrap/hydration scripts inline (no nonce infra here).
            // Without it the runtime never starts — blocked scripts broke
            // hydration (frozen UI) and dev threw Invariant self.__next_r.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data:",
              "frame-src 'self' blob:",
              "connect-src 'self'",
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

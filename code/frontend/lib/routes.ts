import { env } from "@/lib/config/env";

/** API version prefix — mirrors backend versioning (/api/v1) */
const API_V1 = `${env.NEXT_PUBLIC_API_BASE_URL}/v1`;

/**
 * Backend API routes — the ONLY place API paths are defined.
 * Frontend-only shape: these point at local Route Handlers (/api/v1/...).
 */
export const API_ROUTES = {
  health: `${env.NEXT_PUBLIC_API_BASE_URL}/health`,
  convert: {
    document: `${API_V1}/convert/document`,
    spreadsheet: `${API_V1}/convert/spreadsheet`,
    markdown: `${API_V1}/convert/markdown`,
    pdf: `${API_V1}/convert/pdf`,
  },
  session: `${API_V1}/session`,
  rag: {
    index: `${API_V1}/rag/index`,
    ask: `${API_V1}/ask`,
    sessions: `${API_V1}/rag/sessions`,
    file: `${API_V1}/rag/file`,
  },
  setup: {
    status: `${API_V1}/setup/status`,
    bootstrap: `${API_V1}/setup/bootstrap`,
    reset: `${API_V1}/setup/reset`,
    providers: `${API_V1}/setup/providers`,
    prefs: `${API_V1}/setup/prefs`,
  },
  admin: {
    users: `${API_V1}/admin/users`,
    resets: `${API_V1}/admin/resets`,
  },
} as const;

/**
 * Frontend page routes — the ONLY place page paths are defined.
 */
export const PAGE_ROUTES = {
  home: "/",
  markdown: "/",
  word: "/word",
  spreadsheet: "/spreadsheet",
  pdf: "/pdf",
  signIn: "/sign-in",
  aiSetup: "/ai-setup",
  admin: "/admin",
  adminAi: "/admin?tab=ai",
  adminUsers: "/admin?tab=users",
  reset: "/reset",
} as const;

/** Opens the global sign-in modal, optionally continuing to an internal route. */
export function getSignInRoute(next?: string): string {
  const query = new URLSearchParams({ auth: "signin" });
  if (next) query.set("next", next);
  return `${PAGE_ROUTES.home}?${query.toString()}`;
}

export const ROUTES = { api: API_ROUTES, pages: PAGE_ROUTES } as const;

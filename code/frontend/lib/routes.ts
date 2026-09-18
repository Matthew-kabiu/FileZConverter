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
} as const;

export const ROUTES = { api: API_ROUTES, pages: PAGE_ROUTES } as const;

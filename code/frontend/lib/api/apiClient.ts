import { ROUTES } from "@/lib/routes";
import { mapErrorToMessage } from "@/lib/api/errorMap";
import type { ApiEnvelope } from "@/types/api";

/** Thrown for every failed request — carries the SAFE user message. */
export class ApiClientError extends Error {
  constructor(
    public userMessage: string,
    public code: string,
    public statusCode: number,
  ) {
    super(userMessage);
  }
}

class ApiClient {
  private static instance: ApiClient;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) ApiClient.instance = new ApiClient();
    return ApiClient.instance;
  }

  /** Core request wrapper — envelope parsing, error mapping, timeouts. */
  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...init.headers },
      });

      const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

      if (!res.ok || !body?.success) {
        const code = body?.error ?? "UNKNOWN_ERROR";
        // Raw backend message goes to dev console ONLY — never to the UI.
        if (process.env.NODE_ENV !== "production") {
          console.error("[apiClient]", res.status, code, body?.message);
        }
        throw new ApiClientError(
          mapErrorToMessage(code, res.status),
          code,
          res.status,
        );
      }
      return body.data;
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
      throw new ApiClientError(
        mapErrorToMessage("NETWORK_ERROR", 0),
        "NETWORK_ERROR",
        0,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /** ─── Public API surface — mirrors API_ROUTES exactly ─── */
  markdown = {
    convert: (dto: { content: string; target: "txt" | "md" | "html" }) =>
      this.request<{ output: string; target: "txt" | "md" | "html" }>(
        ROUTES.api.convert.markdown,
        { method: "POST", body: JSON.stringify(dto) },
      ),
  };

  convert = {
    document: async (
      file: File | Blob,
      filename: string,
      target: string,
      sessionId?: string,
    ): Promise<Blob> => {
      const form = new FormData();
      form.append("file", file, filename);
      const params = new URLSearchParams({ target });
      if (sessionId) params.set("sessionId", sessionId);
      const res = await fetch(
        `${ROUTES.api.convert.document}?${params.toString()}`,
        { method: "POST", body: form, credentials: "include" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const code = body?.error ?? "UNKNOWN_ERROR";
        throw new ApiClientError(
          mapErrorToMessage(code, res.status),
          code,
          res.status,
        );
      }
      return res.blob();
    },
    spreadsheet: async (
      file: File | Blob,
      filename: string,
      edits: { sheet: string | number; cell: string; value: string | number | boolean | null }[],
    ): Promise<Blob> => {
      const form = new FormData();
      form.append("file", file, filename);
      form.append("edits", JSON.stringify(edits));
      const res = await fetch(ROUTES.api.convert.spreadsheet, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const code = body?.error ?? "UNKNOWN_ERROR";
        throw new ApiClientError(
          mapErrorToMessage(code, res.status),
          code,
          res.status,
        );
      }
      return res.blob();
    },
  };

  session = {
    purge: (sessionId: string) =>
      this.request<{ purged: boolean; vectorsDeleted: number }>(
        `${ROUTES.api.session}?sessionId=${encodeURIComponent(sessionId)}`,
        { method: "DELETE" },
      ),
  };

  rag = {
    index: (dto: { sessionId: string; studio: string; fileName: string; text: string }) =>
      this.request<{ chunks: number }>(ROUTES.api.rag.index, {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    ask: (dto: { sessionId: string; question: string }) =>
      this.request<{
        answer: string;
        citations: { file: string; section: string }[];
        empty: boolean;
      }>(ROUTES.api.rag.ask, { method: "POST", body: JSON.stringify(dto) }),
    sessions: () =>
      this.request<{ sessionId: string; studios: string[]; chunks: number }[]>(
        ROUTES.api.rag.sessions,
      ),
    revokeSession: (sessionId: string) =>
      this.request<{ deleted: number }>(
        `${ROUTES.api.rag.sessions}?sessionId=${encodeURIComponent(sessionId)}`,
        { method: "DELETE" },
      ),
    removeFile: (dto: { sessionId: string; studio: string; fileName: string }) =>
      this.request<{ deleted: number }>(
        `${ROUTES.api.rag.file}?sessionId=${encodeURIComponent(dto.sessionId)}&studio=${encodeURIComponent(dto.studio)}&fileName=${encodeURIComponent(dto.fileName)}`,
        { method: "DELETE" },
      ),
  };

  setup = {
    status: () =>
      this.request<{ bootstrapNeeded: boolean }>(ROUTES.api.setup.status),
    bootstrap: (dto: { name: string; email: string; password: string }) =>
      this.request<{ id: string; email: string }>(ROUTES.api.setup.bootstrap, {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    redeemReset: (dto: { token: string; password: string }) =>
      this.request<{ done: boolean }>(ROUTES.api.setup.reset, {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    providers: () =>
      this.request<{ provider: string; label: string | null; updatedAt: number }[]>(
        ROUTES.api.setup.providers,
      ),
    saveProvider: (dto: { provider: string; key: string; label?: string }) =>
      this.request<{ provider: string; label: string | null; updatedAt: number }>(
        ROUTES.api.setup.providers,
        { method: "POST", body: JSON.stringify(dto) },
      ),
    deleteProvider: (provider: string) =>
      this.request<{ deleted: boolean }>(
        `${ROUTES.api.setup.providers}?provider=${encodeURIComponent(provider)}`,
        { method: "DELETE" },
      ),
    prefs: () =>
      this.request<{
        chatProvider: string | null;
        chatModel: string | null;
        embedProvider: string | null;
        embedModel: string | null;
      }>(ROUTES.api.setup.prefs),
    savePrefs: (dto: {
      chatProvider?: string | null;
      chatModel?: string | null;
      embedProvider?: string | null;
      embedModel?: string | null;
    }) =>
      this.request<{
        chatProvider: string | null;
        chatModel: string | null;
        embedProvider: string | null;
        embedModel: string | null;
      }>(ROUTES.api.setup.prefs, { method: "PUT", body: JSON.stringify(dto) }),
  };

  admin = {
    users: (params?: { limit?: number; offset?: number; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.offset) query.set("offset", String(params.offset));
      if (params?.search) query.set("search", params.search);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      return this.request<{
        users: {
          id: string;
          name: string;
          email: string;
          role?: string | null;
          banned?: boolean | null;
        }[];
      }>(`${ROUTES.api.admin.users}${suffix}`);
    },
    createUser: (dto: { name: string; email: string; password: string; role?: string }) =>
      this.request<{ user: { id: string } }>(ROUTES.api.admin.users, {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    setBanned: (id: string, banned: boolean, banReason?: string) =>
      this.request<{ userId: string; banned: boolean }>(
        `${ROUTES.api.admin.users}/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify({ banned, banReason }) },
      ),
    removeUser: (id: string) =>
      this.request<{ userId: string }>(
        `${ROUTES.api.admin.users}/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      ),
    issueReset: (userId: string) =>
      this.request<{ resetUrl: string; expiresMinutes: number }>(
        ROUTES.api.admin.resets,
        { method: "POST", body: JSON.stringify({ userId }) },
      ),
  };

  pdf = {
    merge: (files: { blob: File | Blob; filename: string }[]): Promise<Blob> => {
      const form = new FormData();
      for (const f of files) form.append("files", f.blob, f.filename);
      return downloadBlob(ROUTES.api.convert.pdf, form);
    },
    split: (
      file: File | Blob,
      filename: string,
      pages: number[],
    ): Promise<Blob> => {
      const form = new FormData();
      form.append("file", file, filename);
      form.append("pages", JSON.stringify(pages));
      return downloadBlob(`${ROUTES.api.convert.pdf}?mode=split`, form);
    },
  };
}

async function downloadBlob(url: string, form: FormData): Promise<Blob> {
  const res = await fetch(url, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    const code = body?.error ?? "UNKNOWN_ERROR";
    throw new ApiClientError(
      mapErrorToMessage(code, res.status),
      code,
      res.status,
    );
  }
  return res.blob();
}

export const apiClient = ApiClient.getInstance();

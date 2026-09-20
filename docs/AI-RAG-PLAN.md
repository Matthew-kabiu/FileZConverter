# FilezConverter AI RAG Agent — Build Plan

Status: Approved by Matt (2026-09-19). Phased build; each phase verified (lint + type + tests) before the next begins.
Owner: Matt. References: TaskLabs project "FilezConverter" (`mh70mqjfv3mr3wq5wt0pvyjvgd8ena60`).

## 0. Decisions locked

- **D1 (vector store):** Redis Stack only. RediSearch vector fields (FLAT + HNSW, KNN) cover session chunks + embeddings + TTLs in one ephemeral service. No Postgres/pgvector.
- **D2 (embeddings):** `@huggingface/transformers` (Transformers.js, ONNX in-process, model `onnx-community/all-MiniLM-L6-v2-ONNX`, 384-dim). Default provider; pre-cached into the Docker image. Picker also offers bge-small / multilingual-MiniLM / OpenAI / Gemini API embeddings. Switching embedding models purges that session's vectors (dimension-bound index).
- **D3 (chat):** No local models (no extra container). API providers via adapter: OpenAI + OpenRouter (both through the `openai` SDK — OpenRouter is OpenAI-compatible via `baseURL`), Anthropic (`@anthropic-ai/sdk`), Gemini (`@google/genai`). Adapter splits `ChatProvider` / `EmbedProvider` (Anthropic has no embeddings API).
- **D4 (tenancy):** Multi-tenant, BYOK. Accounts via Better Auth (email + password). Provider keys roam per account (`user_id`-scoped vault); RAG vectors stay per-device (`user_id` + browser `session_id`). Phone starts fresh; laptop shares keys.
- **D5 (signup):** Closed. Admin creates accounts. No SMTP.
- **D6 (password reset):** Option B out of the box — admin-issued, time-limited (30 min), single-use reset links delivered out-of-band. Token hashes (SHA-256) in SQLite with expiry sweep; redemption endpoint rate-limited 5/hour/IP with oracle-free responses.
- **D7 (auth scope):** RAG/setup/admin paths only. Conversions, session purge, health, and studio pages stay public and byte-identical.
- **D8 (rate limits):** Implemented in this build (see §6), Redis sliding-window.

## 1. Tenant & session model

| Scope | Key | Roams devices? |
|---|---|---|
| Account | `user_id` (Better Auth) | Yes — one login everywhere |
| Provider keys (vault) | `user_id` | Yes — same API keys on phone + laptop |
| RAG vectors/chunks | `user_id` + browser `session_id` | No — per-device sessions preserved |

Session id becomes a `localStorage`-backed singleton (survives normal refresh, dies on site-data clear) shared by all studios — this also fixes today's per-studio divergent ids, so RAG spans studios for that browser automatically. Vectors tagged per-studio for citations and filtering.

## 2. Storage

- **SQLite** (`data/` Docker volume, WAL mode): Better Auth native tables + `provider_vault(user_id, provider, encrypted_key, label, updated_at)` + `password_reset_tokens(token_hash, user_id, expires_at, used_at)`.
- **Redis Stack** (sidecar, memory-only, persistence off): `rag:{userId}:{sessionId}:{studio}:*` with TTL (`AI_RAG_TTL_HOURS`, default 24). Index name includes embedding dim.
- **Crypto:** API keys AES-256-GCM under server master key `AI_VAULT_KEY` (never `NEXT_PUBLIC_*`). Master-key loss = vault unrecoverable (documented). Reset tokens SHA-256 hashed (compare-only — hashing is correct here, unlike API keys).

## 3. Auth (Better Auth, `better-sqlite3` adapter)

- Email + password; public signup **disabled**; minimum password length 12.
- Bootstrap: first-run `/ai-setup` creates the initial admin, then locks (repeat visits require login).
- Admin plugin: user create/list/ban/delete (delete cascades vectors + vault + sessions), temp flows, reset issuance.
- `proxy.ts` matcher on RAG/setup/admin paths only; every RAG handler re-verifies server-side.
- New server env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AI_VAULT_KEY`, `AI_CHAT_PROVIDER`, `AI_EMBED_PROVIDER`, `AI_RAG_TTL_HOURS`, `REDIS_URL`.

## 4. AI adapter (`lib/ai/`)

- `ChatProvider.complete(messages, opts)`; `EmbedProvider.embed(texts)`; factory from env; UI pickers list configured-only providers.
- Ingest: chunk (~256–384 tokens + overlap — load-bearing for MiniLM's 512-token cap) → embed → Redis, tagged per-studio.
- `POST /api/v1/ask` `{sessionId, question}`: hard `user_id`-scoped retrieve → chat → answer + citations (file, section).
- Clear button extends `DELETE /api/v1/session`: `DEL rag:{userId}:{sessionId}:*` + tmp purge + id rotation. Per-device revoke view per user. TTL + tmp sweeper cover orphans.

## 5. AI Setup UI + admin panel (`/ai-setup`, `/admin`)

- Provider pickers (chat + embeddings separately), key input → encrypted rows, rotate/delete, configured-only gating.
- Admin: users CRUD, ban, delete-with-cascade, reset-link issuance, provider status overview.
- Pre-RAG states: `409 SETUP_REQUIRED` + setup CTA while vault uninitialized.

## 6. Rate limits (`lib/security/rateLimit.ts`, Redis sliding-window, `ApiEnvelope` 429s + `Retry-After` / `RateLimit-*`)

| Surface | Key | Limit |
|---|---|---|
| Login | IP + email | 5 / 15 min, enumeration-free errors |
| Reset redemption | IP | 5 / hour |
| Reset issuance / admin ops | admin user | 10 / hour |
| `POST /ask` | user | 10 / min burst, 60 / hour |
| Ingest | user | 30 / hour (embedding CPU) |
| Vault/setup writes | user | 30 / hour |
| Conversions (public) | IP | 120 / hour (generous; LibreOffice cost) |
| Session purge | user (or IP) | 60 / hour |
| Health | — | Exempt (probes must never 429) |

Client IP from `X-Forwarded-For` first entry (single trusted proxy: Cloudflare → Coolify). Better Auth built-in limiter (Redis-backed) for auth endpoints.

## 7. Privacy notice update

Session TTL, button-purge, per-device revoke, site-data-clear semantics (normal refresh keeps, hard refresh keeps, site-data clear wipes), BYOK spend belongs to tenant.

## 8. Phases & verification

1. SQLite + volume, Better Auth (closed signup), bootstrap lock, proxy scoping.
2. Admin panel + Option-B reset links + sweeper.
3. Vault crypto + AI Setup UI.
4. Adapter SDKs + local embeddings + provider pickers.
5. Redis sidecar + ingest + `/ask` + purge/revoke + TTL.
6. Rate limits + isolation tests + privacy docs + capped ($3–4) live test.
- Per-phase: `npm run lint`, `npx tsc --noEmit`, `npm test`. Production build only on Matt's authority. No commits/pushes without explicit approval.

## 9. Rule-4 dependencies (require Matt's install approval — granted with this plan)

`better-auth`, `better-sqlite3`, `@huggingface/transformers` (local embeddings —
note: bare `transformers` on npm is an unrelated templating library, do NOT
install it), `openai`, `@anthropic-ai/sdk`, `@google/genai`, `redis`,
`kysely`, `@types/better-sqlite3`, `redis/redis-stack` sidecar.

## 10. Build status (2026-09-19, end of build pass — UNVERIFIED, no checks run)

P1–P6 implemented on disk, uncommitted. Amendments adopted during build:

- **D2 model id:** `onnx-community/all-MiniLM-L6-v2-ONNX` (v4 docs), not `Xenova/…`.
- **Base URLs:** env-driven only (`AI_OPENROUTER_BASE_URL`); no hardcoded URLs.
- **Redis:** password-protected (`REDIS_PASSWORD`, `requirepass`, password in `REDIS_URL`); unique secrets per env.
- **KNN session fence:** `owner` TAG = sha1(userId:sessionId) filtered in-query (first attempt was invalid, rewritten).
- **Bootstrap-open signal:** user-count-zero (no flag table); `isBootstrapNeeded()` cached 30s, invalidated on first-user creation.
- **Auth UX:** account setup is a modal (`SetupModal`: bootstrap vs sign-in from live status; error+Retry on slow/failed check, never a guessed mode); authed users get avatar dropdown (Admin panel if admin, Sign out with session rotation) + chatbot FAB; `/ai-setup` route renders as a 75dvh modal (keys/models/devices); `/sign-in` bounces to setup when zero users exist.
- **All new client code** uses centralized `apiClient` + `ROUTES` (extended); new error codes mapped.
- **Tests:** `.env.test` (committed dummies) auto-loaded by vitest; pure-function tests for chunk/rateKey/IP/crypto + auth bootstrap migration test.
- **Docker:** python3/make/g++ toolchain in deps (better-sqlite3 v12 compiles from source — kept per Matt, no downgrade); build-only dummy `BETTER_AUTH_SECRET`; `app-data` + password-protected `redis/redis-stack` sidecars; dev Dockerfile parallel stages + cache mounts.
- **Canonical prod domain:** `filezconverter.triffixsolutions.co.ke` (Matt ruling; vault 08/00 still say aibuildrs — needs curation).

Deferred: verification battery (lint → type → tests → build → compose up → bootstrap → upload → ask), onnxruntime model pre-cache into the image, capped $3–4 live test, STACK.md dependency rescan.

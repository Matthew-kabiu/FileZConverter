# RAG + AI Privacy Notice (FilezConverter)

Public-safe. No secrets, no values — names and behavior only.

## What the chat feature stores, and where

- **Documents stay yours.** Uploads live in browser memory; server conversion
  uses per-session tmp dirs deleted after every response (unchanged).
- **Chat memory (new):** when signed in, uploaded/extracted text is chunked,
  embedded, and stored in Redis under `rag:{userId}:{sessionId}:…` with a TTL
  (`AI_RAG_TTL_HOURS`, default 24h). Nobody else's browser can read it:
  retrieval filters on a session tag in the query itself.
- **Provider keys (new):** saved per account in SQLite, encrypted with
  AES-256-GCM under the server master key. Losing the master key orphans
  saved keys by design. Keys are never sent to the browser.

## Lifecycles

| Event | Effect |
|---|---|
| Normal refresh | Session id persists — chat memory survives |
| Hard refresh | Same — storage is untouched by hard refresh |
| "Clear chat memory" (chat panel) | This browser's vectors deleted, session rotated |
| Per-device revoke (AI Setup → devices, P5 UI) | That device's vectors deleted |
| Clear-all / tab close | Server tmp + vectors purged via beacon (best-effort) |
| Clear site data / cookies | Session id dies — old vectors orphan until TTL, unreachable without the id |
| Account deletion (admin) | Vault rows, reset tokens, sessions, vectors wiped |
| TTL expiry (default 24h) | Orphaned vectors self-delete |

## Model spend

Each tenant brings their own provider keys (BYOK) — chat/embedding spend
belongs to the key owner, never to the operator. Local MiniLM embeddings
are free and never leave the operator's infrastructure.

## Abuse controls

Rate limits per `docs/AI-RAG-PLAN.md` §6 (login 5/15min, reset redeem
5/hr, ask 10/min + 60/hr, ingest 30/hr, conversions 120/hr/IP).
429 responses carry `Retry-After`. Client IP is taken from
`X-Forwarded-For` (single trusted proxy: Cloudflare → Coolify).

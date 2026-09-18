# FilezConverter

> **Convert documents, spreadsheets, and PDFs — privately.** FilezConverter
> renders, edits, and converts file types in both directions wherever an
> engine exists. Text conversions run entirely in your browser; office and
> PDF conversions run on your own server and are deleted the moment your
> download is ready. Nothing is ever stored, logged, or sent to a third party.

Built by **TriffixSolutions** as the successor to SpookieFiles (a view-only file
renderer): same privacy DNA, now with real conversion and editing.

---

## Who is it for?

| Audience | Use case |
|---|---|
| 📊 **Data Analysts** | Convert XLSX↔CSV, clean sheets, export PDFs — locally or self-hosted |
| 🔬 **Researchers** | Turn DOCX reports into Markdown, extract PDF text, merge papers |
| 🎓 **Students & Educators** | Export Markdown notes to Word/PDF, preview anything instantly |
| 💻 **Developers** | Convert configs and docs, strip Markdown to text, script against a typed API |
| 🎨 **Freelancers & Designers** | Deliver client files in whatever format they ask for, without upload sites |

---

## What it does

**Render + convert, both directions wherever an engine exists:**

| Lane | Render | Edit | Convert to |
|---|---|---|---|
| Markdown | ✓ live preview | ✓ toolbar editor | DOCX, PDF, HTML, TXT |
| Word (DOCX/DOC/ODT/RTF) | via extraction | round-trip via Markdown | PDF, HTML, TXT, MD |
| Spreadsheets (XLSX/XLS/ODS/CSV) | ✓ table preview | ✓ cell editor | CSV, PDF, HTML |
| PDF | ✓ instant viewer | merge, page-split | TXT (text extraction) |
| TXT / HTML | ✓ | plain editing | MD, PDF, and more |

Four tool studios share one conversion core: **Markdown**, **Word**,
**Spreadsheet**, and **PDF** — each with upload, editing, live preview, and
download. A Tools menu deep-links every conversion directly.

---

## Privacy guarantee

This is the product's core promise, enforced in code — not a policy page:

- **Text conversions never leave your device.** Markdown, TXT, and HTML
  conversions run 100% in the browser.
- **Server conversions are tmp-only.** Office and PDF work runs in a
  per-session temp directory inside your own container and is **deleted after
  every response** — verified by automated tests that assert an empty tmp dir.
- **You can delete any time.** Per-file remove, clear-all (purges client and
  server), and closing the tab fires a purge beacon plus a server-side sweeper
  for orphans.
- **No content logging.** Errors carry mapped, user-safe messages; file bytes
  never touch logs, analytics, or third parties.

---

## Quickstart

**Requirements:** Node.js 20+ and npm for local dev; Docker + Docker Compose
for container runs. LibreOffice and poppler are bundled into the images, so
converters work out of the box.

```bash
# 1. Configure (fake values shown — never commit real ones)
cp .env.example .env
cp .env.example .env.development
# then fill in real ports/URLs (see comments inside each file)

# 2a. Local development (hot reload)
cd code/frontend && npm ci && npm run dev

# 2b. Or Docker dev (app on http://localhost:3001)
docker compose --env-file .env.development -f docker-compose.dev.yml up --build

# 2c. Or production (nginx on http://localhost:8080 → app)
docker compose --env-file .env -f docker-compose.prod.yml up --build -d
```

> The `--env-file` flag is required: compose interpolates build args and port
> mappings from it (the service-level `env_file` only covers runtime).
> Production serves through an nginx reverse proxy (`nginx.conf`)
> carrying app-safe security headers — no CSP there on purpose, the app sends
> its own. Upstream is fixed to the internal app port (see the note inside
> the file). Live domain is baked at build time from `.env`
> (`NEXT_PUBLIC_API_BASE_URL`).

Open the printed URL. Drop a file into any studio and convert.

---

## Technical overview

- **Stack:** Next.js 16 App Router (React 19, TypeScript strict) — a
  **frontend-only** shape: thin Route Handlers in `app/api/v1/*` delegate to
  `lib/services/*`. No Express, no database — stateless by design.
- **Conversion engines:** `docx`, `exceljs`, `pdf-lib`, `sharp`, `marked`,
  `turndown` (all vetted: registry + OSV advisory review), LibreOffice
  headless (strict argv, isolated profile per call, 60s timeout), and poppler
  `pdftotext -layout` for PDF text extraction.
- **UI system:** Tailwind v4 design tokens, four self-hosted font families
  (Outfit, Sora, Nunito, JetBrains Mono — zero CDN), Sonner toasts, tooltips,
  light + dark themes with persisted preference, reduced-motion support.
- **API surface:** every route and page path lives in `lib/routes.ts`; all
  client calls go through a singleton `apiClient`. Route Handlers validate
  with zod and return a standard `{ success, data, error }` envelope —
  binary conversions return file downloads instead.
- **Layout:** the app lives in `code/frontend/`; `code/backend/` is reserved
  for a future split if queueing, isolation, or independent scaling ever
  demands it. Repo root holds only compose files, env templates, docs, and
  coordination files.

### Repository map

```text
FilezConverter/
├── code/frontend/        # the Next.js app (App Router, services, tests)
├── code/backend/         # reserved for a future proven split
├── docs/samples/         # local fixture files (not published)
├── docker-compose.dev.yml / docker-compose.prod.yml
├── .env.example          # fake values only — copy to .env, never commit real ones
├── README.md             # this file
└── .github/workflows/ci.yml  # lint + typecheck + tests + build, nothing else
```

Internal planning files (`SOP.md`, `Changelog.md`, `Agenthandoff.md`,
`STACK.md`), the build-spec copies in `docs/`, and `docs/samples/` are
deliberately **gitignored** and never published.

---

## Quality gates

Every change is verified before it lands:

```bash
cd code/frontend
npm test          # vitest — 27 tests incl. live LibreOffice round-trips
npm run lint      # eslint, zero warnings
npx tsc --noEmit  # strict typecheck
npm run build     # production build (standalone output)
```

The same four steps run in CI on every push and pull request
(`.github/workflows/ci.yml`) — lint, typecheck, tests, build, and nothing
else. Test runners need LibreOffice + poppler on the runner, which the
workflow installs.

---

## Security notes for operators

- No credentials, tokens, or secrets anywhere in the repo — environment
  carries only ports and public base URLs, all validated at startup with
  fail-fast errors.
- Uploads are capped (25MB files, 1M text chars), conversion inputs are
  allowlisted by extension, and shell-outs use fixed argument vectors with
  timeouts — never user-supplied flags.
- Security headers (including a CSP that still permits blob previews) ship
  from `next.config.ts`.
- Found something? Please report vulnerabilities privately to the maintainer
  before opening a public issue.

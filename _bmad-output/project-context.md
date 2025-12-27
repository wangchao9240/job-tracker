---
project_name: 'job-tracker'
user_name: 'ggbb'
date: '2025-12-27T01:56:41+1000'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
existing_patterns_found: 0
status: 'complete'
rule_count: 50
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Language:** JavaScript only (no TypeScript). Use `.js/.jsx` (avoid `.ts/.tsx`).
- **Runtime:** Node.js **>= 20.9.0** (required by `create-next-app@latest` / Next 16.1.1). Ensure Vercel uses Node 20+.
- **Framework:** Next.js (App Router) **16.1.1** (`create-next-app 16.1.1`).
- **Styling/UI:** Tailwind CSS **4.1.18** + shadcn/ui.
- **Supabase (DB/Auth):**
  - `@supabase/supabase-js` **2.89.0**
  - `@supabase/ssr` **0.8.0**
  - Supabase CLI (npm `supabase`) **2.70.5** for SQL migrations.
- **Forms/Validation:** `react-hook-form` **7.69.0** + `zod` **4.2.1**
- **Server state:** `@tanstack/react-query` **5.90.12**
- **UI state:** `zustand` **5.0.9**
- **Deployment:** Vercel + Vercel Cron (`vercel.json` `crons`).
- **AI providers (via third-party gateway, server-only):**
  - OpenAI: `OPENAI_BASE_URL`, `OPENAI_API_KEY`
  - Anthropic: `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`
  - Outbound AI calls use **server-side `fetch`** (no vendor SDK), with streaming responses to the browser.

## Critical Implementation Rules

### Language-Specific Rules (JavaScript)

- **ESM only:** Use `import/export` everywhere. Do not introduce `require()` or `module.exports`.
- **No TypeScript:** Do not add `.ts/.tsx` files or TypeScript-only tooling. Keep code in `.js/.jsx`.
- **Client vs Server boundaries:**
  - Server-only code must live under `src/lib/server/**` and must not be imported by Client Components.
  - Any file that uses secrets (`SUPABASE_SERVICE_ROLE_KEY`, AI keys/tokens, `CRON_SECRET`) must be server-only.
- **Environment variables:**
  - Never read server-only env vars from client code.
  - Only `NEXT_PUBLIC_*` env vars may be referenced in browser code.
- **Date/time:** Always treat timestamps as UTC and serialize as ISO-8601 (`toISOString()`); never store UI-local formatted strings.
- **Error objects:** Throw/return stable error codes from server boundaries (Route Handlers) and avoid leaking raw upstream error messages to the client.

### Framework-Specific Rules (Next.js + Supabase)

- **App Router only:** Use `src/app/**` (no Pages Router).
- **Route Handlers are the API boundary:** Implement server APIs only in `src/app/api/**/route.js`.
- **Auth/session:** Use cookie-based session via `@supabase/ssr` in server code (`src/lib/supabase/server.js`).
- **RLS is mandatory:** All user-owned tables must have RLS enabled and policies must enforce `user_id = auth.uid()`.
- **Service role usage:** Use the service role client only for privileged background/admin tasks (cron, account deletion). Never expose service role to the browser.
- **AI streaming endpoint:** Canonical streaming endpoint is `POST /api/cover-letter/stream`.
  - Stream events: `delta`, `done`, `error`.
  - Persist final output to `cover_letter_versions` on `done`.
- **Cron reminders endpoint:** `POST /api/cron/reminders` must require `Authorization: Bearer $CRON_SECRET` and be idempotent (safe to retry, no duplicate reminders).
- **DB access pattern:** UI components must not access Supabase directly for data. All DB reads/writes go through Route Handlers and server repos under `src/lib/server/db/**`.

### Testing Rules

- **Framework:** Jest (`jest` `30.2.0`).
- **Scope:** Add/adjust tests only for the code you change; don’t refactor unrelated areas just to improve test coverage.
- **Unit tests first:** Prefer unit tests for pure logic:
  - request/response mappers (snake_case ↔ camelCase)
  - zod validators
  - streaming protocol helpers (event framing)
  - AI provider adapters (mock `fetch`)
- **Minimal integration tests for Route Handlers:**
  - verify the standard envelope `{ data, error }` for non-stream endpoints
  - verify streaming endpoints emit `delta` then terminal `done` or `error`
  - verify auth-required endpoints return `UNAUTHORIZED` when no session
  - verify cron endpoint rejects missing/invalid `Authorization: Bearer <CRON_SECRET>`
- **Determinism:** No network calls in tests; mock `fetch` and any Supabase client calls.

### Code Quality & Style Rules

- **Formatter:** Do not add Prettier. Use ESLint only.
- **Imports:** Use `@/*` alias; avoid deep relative imports like `../../..`.
- **File naming:**
  - React components: `PascalCase.jsx`.
  - Other modules: `camelCase.js`.
  - Directories: `kebab-case/`.
- **API response shape:** Non-stream endpoints must return `{ data, error }` envelope; never mix raw JSON responses.
- **Streaming protocol:** Streaming endpoints must use `delta/done/error` events; never invent new event names without updating architecture + project-context.
- **Logging:** Server logs must be structured JSON; never log secrets (`*_KEY`, `*_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) or full JD text.
- **No direct vendor calls from browser:** AI and privileged DB ops are server-only.

### Development Workflow Rules

- **Architecture is source of truth:** Before introducing new endpoints, tables, or protocol changes (API envelope / streaming events), update `_bmad-output/architecture.md` and `_bmad-output/project-context.md` first.
- **Security changes require explicit validation:** Any change involving auth, RLS policies, service role usage, cron authorization, or server-only secrets must include a brief validation plan in the PR (what you tested, how to reproduce).
- **Keep scope tight:** Avoid unrelated refactors; implement the smallest change that satisfies the story while preserving documented patterns.

### Critical Don’t-Miss Rules

- **Never leak secrets:** No server-only env vars in client code. Never log secrets.
- **Canonical streaming endpoint:** Use `POST /api/cover-letter/stream` only. Stream events must be `delta`, `done`, `error`.
- **Cron must be authenticated:** `POST /api/cron/reminders` must require `Authorization: Bearer $CRON_SECRET`.
- **DB/API naming boundary:** DB `snake_case` ↔ API/UI `camelCase` must be mapped at the server boundary.

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code.
- Follow ALL rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- If you introduce a new pattern, update this file (and `_bmad-output/architecture.md`) first.

**For Humans:**
- Keep this file lean and focused on agent needs.
- Update when the technology stack or protocols change.
- Remove rules that become obvious or redundant over time.

Last Updated: 2025-12-27T01:56:41+1000

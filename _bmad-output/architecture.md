---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/prd.md
  - _bmad-output/project-planning-artifacts/product-brief-job-tracker-2025-12-26.md
  - _bmad-output/project-planning-artifacts/ux-design-specification.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
project_name: 'job-tracker'
user_name: 'ggbb'
date: '2025-12-27T00:19:40+1000'
completedAt: '2025-12-27T01:44:03+1000'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- Total: 36 FRs across 8 areas: Account & Data, Job Capture & Normalization, JD Analysis, Evidence Library, Mapping-First Workflow, Cover Letter Workflow, Application Tracking, Follow-up & Interview Prep.
- Core workflow: paste job link → (best-effort parse, with mandatory manual JD fallback) → extract requirements → propose evidence mapping → user review/confirm mapping → generate cover letter draft(s) → save final version → track application status + notes + history.

**Non-Functional Requirements:**
- Performance: <2s for core non-AI interactions; AI operations can be slower but must be clearly in-progress and non-blocking.
- Reliability: no data loss; resumable workflow state; persist intermediate artifacts (requirements, confirmed mapping, drafts).
- Security & Privacy: authenticated access only; user-scoped reads/writes; account deletion that permanently removes all user data.
- Accessibility: baseline keyboard operability, labeled inputs, visible focus states, readable contrast.

**Scale & Complexity:**
- Primary domain: desktop-first SPA web app with backend persistence + AI-assisted pipeline.
- Complexity level: low-to-medium (no real-time collaboration, no regulated domain, single-user focus; but includes multi-source ingestion/parsing + AI workflows + reminders + traceability).
- Estimated architectural components: ~6–8 (UI shell, Auth/Identity, Persistence/Domain model, Ingestion & Parsing, AI Pipeline, Background jobs/reminders, Observability).

### Technical Constraints & Dependencies

- Desktop Chrome is the primary supported browser; mobile is out of MVP scope.
- Persistence and authentication are expected (Supabase is explicitly acceptable); enforce user data isolation.
- UX direction implies a tool-like SPA (3-panel workspace), with clear state visibility and first-class recovery actions.
- AI-heavy operations (extraction/mapping/generation) must be asynchronous, retryable, and explain failures without forcing re-entry.
- Link parsing reliability is the highest technical risk; manual JD paste is a mandatory fallback, and JD snapshot storage is required.

### Cross-Cutting Concerns Identified

- Workflow state machine: application lifecycle status + AI step statuses (parsed/needs JD/requirements ready/mapping confirmed/draft saved).
- Data modeling for traceability: store JD snapshots, extracted requirements, confirmed mappings, draft versions, status history/timestamps.
- Idempotency & retries: ingestion/parsing and AI generation should tolerate retries without duplicating or corrupting records.
- Security & data lifecycle: RLS/user scoping, secrets management for AI providers, and hard-delete semantics for account deletion.
- UX reliability: optimistic vs confirmed saves, clear progress indicators, and “no dead ends” recovery paths.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (desktop-first SPA UX) built with Next.js (App Router) + Tailwind CSS + shadcn/ui, deployed on Vercel, with Supabase (Postgres + Auth).

### Starter Options Considered

**Option A — Minimal Next.js (recommended for JS-first codebase)**
- Bootstrap with `create-next-app@latest` using `--js`, App Router, Tailwind, ESLint.
- Add shadcn/ui via `npx shadcn@latest init`.
- Add Supabase (`@supabase/supabase-js` + `@supabase/ssr`) and wire Auth/DB incrementally.
- Pros: clean, minimal, aligns with “JavaScript only” preference; easiest to evolve around our domain model and workflows.
- Cons: Supabase Auth patterns need to be integrated (but we control the shape and can keep it minimal).

**Option B — Next.js official example: `with-supabase`**
- Bootstrap via `npx create-next-app --example with-supabase <app>`.
- Includes: Supabase SSR cookie auth (`@supabase/ssr`), Tailwind, shadcn/ui, and ready-to-run auth UI.
- Pros: fastest way to get Supabase Auth SSR + UI patterns working; maintained in the Next.js repo.
- Cons: template is TypeScript-oriented (typescript + `tsconfig.json` included); may be heavier/more opinionated than we need.

### Selected Starter: Option A — Minimal Next.js (JS) + shadcn/ui

**Rationale for Selection:**
- Matches your explicit preference for a JavaScript codebase.
- Keeps the foundation boring and predictable for a solo builder.
- Avoids inheriting template features we’ll delete; we’ll add Supabase + AI provider integration intentionally.

**Initialization Command:**

```bash
npx create-next-app@latest job-tracker \
  --js \
  --app \
  --tailwind \
  --eslint \
  --src-dir \
  --import-alias "@/*" \
  --use-npm
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- JavaScript (no TypeScript bootstrap), Next.js via `create-next-app` (current: 16.1.1).
- Note: `create-next-app@latest` requires Node >= 20.9.0.

**Styling Solution:**
- Tailwind CSS configured.
- shadcn/ui to be initialized next (`npx shadcn@latest init`) after Node upgrade.

**Build Tooling:**
- Next.js default bundler/config (no Turbopack/Rspack flags chosen initially for stability).

**Testing/Linting:**
- ESLint configured via Next.js defaults.

**Code Organization:**
- App Router enabled; `src/` directory layout; import alias `@/*`.

**Development Experience:**
- Standard Next.js dev/build/start scripts; ready for Vercel deployment workflows.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Data Architecture

**Database:** Supabase Postgres (managed) with Supabase Auth.

**Schema & Migrations:**
- Use Supabase CLI migrations (SQL files committed to the repo) for traceable, repeatable schema evolution.
- Verified tooling: `supabase` CLI (npm) `2.70.5`.
- No local Docker requirement for this workflow; migrations are applied to the remote Supabase project.

**Data Modeling (MVP, hybrid):**
- `applications` is the aggregate root for the "one job → one application record" workflow.
- Core fields: company, role, link, status, applied_date, notes, `source` (tracking where the job was found: seek, linkedin, company, unknown; defaults to 'unknown' until ingestion is implemented in Epic 3).
- Store high-churn, per-application AI artifacts as JSONB in `applications` for MVP speed:
  - `jd_snapshot` (text)
  - `extracted_requirements` (JSONB array; user-editable)
  - `confirmed_mapping` (JSONB; requirement → projectBulletIds; user-editable)
- Use normalized tables where append-only history and retrieval are core product guarantees:
  - `cover_letter_versions` (preview/final + history; references `applications`)
  - `application_status_events` (status change timeline; references `applications`)
    - Event types: `status_changed`, `field_changed`
    - Payload structure:
      - `status_changed`: `{ from: string, to: string }` (old status → new status)
      - `field_changed`: `{ field: string, from: any, to: any }` (which field changed and values)
    - Tracked fields: company, role, link (notes and appliedDate are not tracked)
    - Event creation: Events created atomically BEFORE application update to ensure timeline integrity
    - If event insertion fails, application update is rolled back (entire request fails)
    - RLS enforced: users can only read/write their own events
  - `reminders` (7-day follow-up reminders; references `applications`)
    - Reminder types: `no_response_follow_up`
    - Table structure:
      - `id`, `application_id`, `user_id`, `type`, `due_at`, `dismissed_at`, `created_at`, `updated_at`
      - Unique constraint on `(application_id, type)` for idempotent upserts
    - Computation logic:
      - Cron job runs periodically (configured in vercel.json)
      - Finds applications with status="applied" AND applied_date <= 7 days ago
      - Creates reminder with due_at = applied_date + 7 days
      - Uses service role client to bypass RLS (scan all users' applications)
    - Idempotency guarantee:
      - Upsert by (application_id, type) prevents duplicates
      - Safe to run cron multiple times
      - Updates existing reminder if run again
    - Dismissal:
      - User can dismiss via UI ("Mark followed up")
      - Sets dismissed_at timestamp
      - Dismissed reminders excluded from active list
    - Security:
      - Cron endpoint requires `Authorization: Bearer $CRON_SECRET`
      - RLS enforced: users can only read/write/dismiss their own reminders
      - Never log CRON_SECRET value in error logs
- Evidence library is normalized:
  - `projects`, `project_bullets` (user-owned; used by mapping).

**Validation Strategy:**
- Use `zod` `4.2.1` for runtime validation at server boundaries (Route Handlers / Server Actions) and for form validation.

**Traceability Guarantees (persist all):**
- JD snapshot, extracted requirements, confirmed mapping, cover letter versions, status history events, reminders.

### Authentication & Security

**Authentication (MVP):**
- Supabase Auth with Magic Link (email OTP) as the default sign-in method.

**Session Model (Next.js App Router):**
- Cookie-based session using `@supabase/ssr` `0.8.0` to make the user session available across Server Components, Route Handlers, Server Actions, Middleware, and Client Components.

**Authorization / Data Isolation:**
- Enable Postgres Row Level Security (RLS) on all user-owned tables.
- Use a `user_id` column on rows and enforce `user_id = auth.uid()` in policies.
- Server-side “admin” operations (e.g., account deletion) use the Supabase service role key and MUST remain server-only.

**Secrets & Provider Configuration (AI via third-party gateway):**
- All AI credentials and gateway base URLs are server-only (never exposed to the browser).
- Provider configuration is pluggable to support OpenAI, Anthropic, and future vendors.
- Environment variables (server-only):
  - `OPENAI_BASE_URL` + `OPENAI_API_KEY`
  - `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`
- Requests to AI providers are routed through a server-side abstraction layer that selects provider by name and uses the corresponding base URL and credentials.

### API & Communication Patterns

**Server Interface Pattern:**
- Use Next.js App Router Route Handlers as the primary server API boundary (`/app/api/**/route.js`).
- The client communicates with the server via `fetch` calls to these endpoints.

**Settings & Preferences (Non-MVP):**
- `/settings` is a protected route (unauthenticated users are redirected to `/sign-in` by middleware).
- Preferences are user-owned and persisted with RLS-first tables keyed by `user_id`:
  - `high_fit_preferences` (job search "high-fit" hard filter preferences)
  - `generation_preferences` (cover letter generation preferences: tone, emphasis, keywords)
- Route Handlers expose preferences via `{ data, error }` envelopes:
  - `GET/PUT /api/preferences/high-fit` → reads/writes `high_fit_preferences` for the current session user
  - `GET/PUT /api/preferences/generation` → reads/writes `generation_preferences` for the current session user
- **Generation preferences application:** When generating cover letters in Epic 6, the system will:
  - Fetch user's `generation_preferences` via server repo
  - Apply tone, emphasis, and keyword preferences to AI prompt construction
  - Default values are used if user has not set preferences (tone: 'professional', emphasis/keywords: empty arrays)

**AI Provider Integration (via third-party gateway):**
- Do not rely on vendor SDKs for outbound AI calls.
- Implement provider adapters using `fetch` for maximum control and to support a custom gateway `baseURL`.
- Provider selection is explicit in the request body, e.g.:
  - `{ "provider": "openai" | "anthropic" | "...", "model": "...", "input": ... }`

**Streaming (MVP):**
- AI generation endpoints stream results back to the browser in MVP.
- Preferred transport: Server-Sent Events (SSE) or chunked streaming `Response` from Route Handlers.
- Stream protocol includes clear event types (e.g., `delta`, `done`, `error`) so the UI can render partial output and recover on failures.

**Error & Retry Semantics:**
- Server endpoints return consistent JSON error envelopes for non-stream responses.
- Streaming endpoints emit a terminal `error` event with a stable error code and message.

### Frontend Architecture

**UI System & Layout:**
- Tailwind CSS + shadcn/ui components.
- **Current Layout (Epic 2)**: 2-panel inbox layout for application management
  - Left panel: Application list with filters (status, source, search, date range)
  - Right panel: Detail/edit view or create form
  - Orchestrated by `ApplicationsInbox` component (`src/components/features/applications/ApplicationsInbox.jsx`)
  - Selection persistence via URL query parameters (`?applicationId=<uuid>`)
  - Filter persistence via URL query parameters (`?status=...&q=...&from=...&to=...`)
- **Future Layout (Epic 4+)**: 3-panel workspace layout (list + record workspace + context panel) as defined in UX spec, to be implemented when requirements extraction and mapping features are added.

**Server State / Data Fetching:**
- Use `@tanstack/react-query` `5.90.12` for server state: caching, retries, background refetch, and list/detail consistency.
- All server mutations go through Route Handlers; invalidate or update query cache on success.

**Forms & Validation:**
- Use `react-hook-form` `7.69.0` with `zod` `4.2.1` for schema-driven validation and ergonomic form state management.

**Client/UI State (non-server state):**
- Use `zustand` `5.0.9` for UI state that spans panels and components (e.g., selected application id, panel open/close, in-progress drafts, filters that should persist).

**Streaming Consumption (AI output):**
- Render streamed AI output incrementally in the UI (append `delta` chunks as they arrive).
- Persist the final content as a new `cover_letter_versions` row once the stream completes (`done`).
- If the stream errors, keep partial output in UI with a retry action, without losing the underlying application record.

### Infrastructure & Deployment

**Hosting & Runtime:**
- Deploy on Vercel.

**Scheduled Jobs (Follow-up reminders):**
- Use Vercel Cron Jobs to trigger a Next.js Route Handler on a schedule.
- Cron configuration is defined via `vercel.json` `crons` (path + schedule), following Vercel’s cron examples.
 - The cron endpoint must be protected via `CRON_SECRET` (server-only) and reject unauthorized requests.

**Background Execution & Authorization:**
- Background/cron handlers run server-side and use the Supabase service role key for privileged database operations.
- Cron jobs MUST be idempotent (safe to retry) and should avoid duplicate reminder creation.

**Environment Configuration:**
- Local development: `.env.local`.
- Deployment: Vercel Project Environment Variables for Preview/Production.
- Public vs server-only split:
  - Public (browser): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key).
  - Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and all AI gateway credentials (`OPENAI_BASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`).

**Observability (MVP):**
- Use Vercel Logs.
- Emit structured JSON logs for server endpoints and background jobs (include request id, route, outcome, application id; never log secrets).

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Next.js App Router + Vercel deployment foundation.
- Supabase Postgres + Supabase Auth with RLS on all user-owned tables.
- Cookie-based sessions via `@supabase/ssr`.
- Schema migrations via Supabase CLI migrations.
- Server API boundary via Route Handlers.
- AI provider gateway integration via server-side `fetch` adapters with streaming responses.
- Vercel Cron-based 7-day follow-up reminders (background job pattern).

**Important Decisions (Shape Architecture):**
- Hybrid data modeling (JSONB in `applications` + normalized history tables).
- React Query for server state + RHF+Zod for forms.
- Zustand for cross-panel UI state.

**Deferred Decisions (Post-MVP / As-needed):**
- Advanced observability (e.g., Sentry).
- More complex ingestion pipelines / queues.
- Bundler/tooling optimizations beyond defaults.

### Decision Impact Analysis

**Implementation Sequence (high-level):**
1. Bootstrap Next.js project + Tailwind + shadcn/ui.
2. Create Supabase project, set up auth (Magic Link) and RLS.
3. Establish schema + migrations (applications, projects, project_bullets, cover_letter_versions, application_status_events, reminders).
4. Implement core CRUD + traceability primitives.
5. Implement AI provider abstraction (server-only) + streaming endpoints.
6. Implement mapping-first workflow and cover letter generation/versioning.
7. Implement Vercel Cron reminders + idempotent reminder creation.

**Cross-Component Dependencies:**
- RLS + session model impacts every DB read/write path.
- Streaming protocol shapes both UI rendering and persistence of final artifacts.
- Background jobs require service role usage and strict endpoint hardening.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** naming, structure, API formats, streaming protocol, state boundaries, error handling, logging, and time formats.

### Naming Patterns

**Database Naming Conventions (Supabase/Postgres):**
- Tables: `snake_case`, plural nouns (e.g., `applications`, `project_bullets`, `cover_letter_versions`, `application_status_events`, `reminders`).
- Columns: `snake_case` (e.g., `user_id`, `created_at`, `jd_snapshot`).
- Primary keys: `id` (uuid).
- Foreign keys: `{table_singular}_id` (e.g., `application_id`, `project_id`).

**API Naming Conventions (Route Handlers):**
- REST-ish endpoints, plural resources:
  - `GET /api/applications`, `POST /api/applications`
  - `GET /api/applications/:id`, `PATCH /api/applications/:id`
- Streaming endpoints use a verb:
  - `POST /api/cover-letter/stream` (streaming response)

**JSON Field Naming (client/server boundary):**
- API JSON uses `camelCase`.
- DB uses `snake_case`.
- Rule: never return `snake_case` fields to the browser; map at the server boundary.

**Code Naming Conventions (JS):**
- React components: `PascalCase` names, files `PascalCase.jsx`.
- Non-component modules: `camelCase.js`.
- Directories: `kebab-case`.
- Imports: use `@/*` alias; avoid deep relative imports.

### Structure Patterns

**Project Organization (Next.js App Router):**
- Route Handlers: `src/app/api/**/route.js`.
- UI pages/layouts: `src/app/**`.
- Shared UI components: `src/components/**`.
- Domain and server utilities: `src/lib/**` (server-only helpers under `src/lib/server/**`).
- DB access: repository-style modules under `src/lib/server/db/**` (no direct SQL/Supabase calls from components).

**Supabase Client Placement:**
- Browser client: `src/lib/supabase/browser.js`.
- Server client (cookie session): `src/lib/supabase/server.js` using `@supabase/ssr`.
- Service role client: `src/lib/supabase/service.js` (server-only, never imported by client code).

### Format Patterns

**API Response Format (non-stream):**
- Success: `{ "data": <payload>, "error": null }`
- Error: `{ "data": null, "error": { "code": "<STABLE_CODE>", "message": "<human_message>", "details": <optional> } }`

**Streaming Format (SSE / chunked stream):**
- Event types: `delta`, `done`, `error`.
- Each `delta` contains only incremental output; `done` includes final metadata; `error` is terminal.

**Date/Time:**
- DB: `timestamptz`.
- API/UI: ISO-8601 strings in UTC (`toISOString()`), never local-formatted strings.

### Communication Patterns

**State Boundaries:**
- Server state: `@tanstack/react-query` (fetch/cache/invalidate).
- UI state: `zustand` for cross-panel UI (selected application, panel visibility, in-progress streamed draft text).
- Rule: don’t duplicate server state into zustand; keep zustand for UI-only state.

### Process Patterns

**Validation:**
- Use `zod` schemas in Route Handlers for request validation (400 on validation failure).
- Use the same schemas for forms with `react-hook-form` (client-side feedback).

**Error Handling:**
- Auth-required endpoints return `UNAUTHORIZED` when no session.
- RLS violations and not-found return stable codes (`FORBIDDEN`, `NOT_FOUND`).
- Streaming errors emit terminal `error` event and keep partial content client-side for retry.

**Logging (MVP):**
- JSON structured logs in server routes and cron handlers.
- Never log secrets or full JD content; log identifiers and outcome only.

### Enforcement Guidelines

**All AI Agents MUST:**
- Use `snake_case` in DB and `camelCase` in API/UI (with explicit mapping at server boundary).
- Use the standardized API envelope for non-stream responses and `delta/done/error` for streams.
- Keep Supabase service role usage strictly server-only and confined to background/admin tasks.
- Put Route Handlers under `src/app/api/**/route.js` and reuse shared server utilities under `src/lib/server/**`.

**Pattern Enforcement:**
- If a PR introduces a new endpoint, it must follow the envelope/stream conventions.
- If a PR introduces a new table/column, it must follow DB naming and include RLS policy + migration.
- If a pattern needs to change, update this Architecture Decision Document first.

### Pattern Examples

**Good Examples:**
- DB column `jd_snapshot` → API field `jdSnapshot`.
- `POST /api/cover-letter/stream` emits `delta` events while generating, then `done`, and persists to `cover_letter_versions`.

**Anti-Patterns:**
- Returning raw DB rows (snake_case) directly to the browser.
- Mixing response formats across endpoints (sometimes raw JSON, sometimes wrapped).
- Calling AI providers directly from the browser.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
repo-root/
├── _bmad/
├── _bmad-output/
├── aim.txt
└── job-tracker/                               # Vercel Root Directory
    ├── README.md
    ├── package.json
    ├── next.config.mjs
    ├── postcss.config.mjs
    ├── tailwind.config.js
    ├── eslint.config.mjs
    ├── vercel.json                            # Cron config (`crons`)
    ├── .env.example
    ├── .gitignore
    ├── supabase/
    │   ├── config.toml
    │   ├── migrations/
    │   │   └── 0001_init.sql
    │   └── seed.sql
    ├── public/
    │   └── (static-assets)
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.jsx
        │   ├── page.jsx                        # 3-panel shell entry
        │   ├── (auth)/
        │   │   ├── sign-in/page.jsx            # Magic link sign-in
        │   │   └── callback/route.js           # auth callback if needed
        │   └── api/
        │       ├── health/route.js
        │       ├── applications/
        │       │   ├── route.js                # GET(list), POST(create)
        │       │   └── [id]/route.js           # GET, PATCH, DELETE
        │       ├── projects/
        │       │   ├── route.js                # GET, POST
        │       │   └── [id]/route.js           # GET, PATCH, DELETE
        │       ├── project-bullets/
        │       │   ├── route.js
        │       │   └── [id]/route.js
        │       ├── ingestion/
        │       │   └── parse/route.js          # URL -> extracted fields + jdSnapshot (best-effort)
        │       ├── requirements/
        │       │   └── extract/route.js        # jdSnapshot -> requirements list
        │       ├── mapping/
        │       │   └── propose/route.js        # requirements + bullets -> proposed mapping
        │       ├── cover-letter/
        │       │   └── stream/route.js         # streaming generation -> persist version on done
        │       └── cron/
        │           └── reminders/route.js      # Vercel Cron trigger (idempotent)
        ├── components/
        │   ├── ui/                              # shadcn/ui components
        │   └── features/
        │       ├── applications/
        │       ├── projects/
        │       ├── mapping/
        │       ├── cover-letter/
        │       └── paste-link-capture/
        ├── lib/
        │   ├── utils/
        │   │   ├── dates.js                    # ISO-8601 UTC helpers
        │   │   └── errors.js                   # stable error codes/envelope helpers
        │   ├── supabase/
        │   │   ├── browser.js                  # auth-only usage on client
        │   │   ├── server.js                   # cookie session client (@supabase/ssr)
        │   │   └── service.js                  # service role client (server-only)
        │   └── server/
        │       ├── db/
        │       │   ├── applicationsRepo.js
        │       │   ├── projectsRepo.js
        │       │   ├── projectBulletsRepo.js
        │       │   ├── coverLetterVersionsRepo.js
        │       │   ├── statusEventsRepo.js
        │       │   └── remindersRepo.js
        │       ├── ai/
        │       │   ├── providers/
        │       │   │   ├── openai.js           # fetch adapter using OPENAI_BASE_URL + OPENAI_API_KEY
        │       │   │   └── anthropic.js        # fetch adapter using ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN
        │       │   ├── streamProtocol.js       # delta/done/error helpers
        │       │   └── router.js               # provider selection from request body
        │       └── ingestion/
        │           ├── sourceDetect.js
        │           └── normalize.js
        ├── store/
        │   └── uiStore.js                      # zustand UI-only state (selected id, panels, streaming text)
        └── middleware.js                       # session refresh + route protection (if needed)
```

### Architectural Boundaries

**API Boundaries:**
- All non-auth data reads/writes go through Route Handlers under `src/app/api/**/route.js`.
- Streaming generation is only via `POST /api/cover-letter/stream`.

**Component Boundaries:**
- UI renders 3 panels; server state is via React Query; UI-only state via Zustand.
- Components never call Supabase directly for data (auth-only allowed in `browser.js`).

**Service Boundaries:**
- DB access only via `src/lib/server/db/**` repository modules.
- AI calls only via `src/lib/server/ai/**` using server-only env vars and `fetch`.

**Data Boundaries:**
- DB schema managed via Supabase CLI migrations under `supabase/migrations/**`.
- DB uses `snake_case`; API/UI uses `camelCase` with explicit mapping at Route Handler boundary.

### Requirements to Structure Mapping

**FR Category: Account & Data →**
- UI: `src/app/(auth)/**`
- Server auth/session: `src/lib/supabase/server.js`, `src/middleware.js`
- Account deletion/admin ops: server-only with `src/lib/supabase/service.js`

**FR Category: Job Capture & Normalization →**
- UI: `src/components/features/paste-link-capture/**`, `src/components/features/applications/**`
- API: `src/app/api/ingestion/parse/route.js`, `src/app/api/applications/**`
- Server: `src/lib/server/ingestion/**`

**FR Category: JD Analysis & Requirement Extraction →**
- API: `src/app/api/requirements/extract/route.js`
- Server: `src/lib/server/ai/**` (if AI-assisted extraction is used)

**FR Category: Project/Experience Library (Evidence Store) →**
- UI: `src/components/features/projects/**`
- API: `src/app/api/projects/**`, `src/app/api/project-bullets/**`
- DB: `src/lib/server/db/projectsRepo.js`, `src/lib/server/db/projectBulletsRepo.js`

**FR Category: Mapping-First Workflow →**
- UI: `src/components/features/mapping/**`
- API: `src/app/api/mapping/propose/route.js`

**FR Category: Cover Letter Workflow →**
- UI: `src/components/features/cover-letter/**`
- API: `src/app/api/cover-letter/stream/route.js`
- DB history: `src/lib/server/db/coverLetterVersionsRepo.js`

**FR Category: Application Tracking & Traceability →**
- UI: `src/components/features/applications/**`
- API: `src/app/api/applications/**`
- DB history: `src/lib/server/db/statusEventsRepo.js`

**FR Category: Follow-up & Interview Prep →**
- Cron: `vercel.json` + `src/app/api/cron/reminders/route.js`
- DB: `src/lib/server/db/remindersRepo.js`
- (Interview prep API can be added later under `src/app/api/interview-prep/**`)

### External Integrations

- Supabase (DB/Auth): configured via `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; server uses `SUPABASE_SERVICE_ROLE_KEY` for background/admin.
- Vercel Cron: triggers `src/app/api/cron/reminders/route.js` and requires `Authorization: Bearer $CRON_SECRET` (server-only).
- AI gateway (server-only):
  - `OPENAI_BASE_URL` + `OPENAI_API_KEY`
  - `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- Next.js (App Router) + Vercel deployment is compatible with Supabase Postgres/Auth.
- RLS-first authorization aligns with cookie-based sessions via `@supabase/ssr` `0.8.0`.
- Route Handlers + `fetch`-based AI adapters align with “server-only secrets” and third-party gateway base URLs.
- Frontend choices (React Query `5.90.12`, RHF `7.69.0` + Zod `4.2.1`, Zustand `5.0.9`) align with the 3-panel UX.

**Pattern Consistency:**
- DB `snake_case` + API/UI `camelCase` with server-boundary mapping is consistently defined.
- Standard envelopes and streaming event types (`delta/done/error`) reduce agent divergence.
- Server-only service role boundaries are explicit.

**Structure Alignment:**
- Project structure maps PRD FR categories to concrete routes/modules.
- Repository-style DB access and server-only AI adapters are separated from UI.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
- Account/Auth: Supabase Auth (Magic Link), cookie session, RLS.
- Capture/Normalization: ingestion parse endpoint + manual fallback path.
- Requirement extraction, mapping-first workflow, cover letter generation/versioning, tracking/history, reminders: each has an API location + persistence plan.

**Non-Functional Requirements Coverage:**
- Performance: React Query caching + async AI operations with streaming.
- Reliability: persisted intermediate artifacts + version/history tables + idempotent cron jobs.
- Security/Privacy: RLS + server-only secrets + service-role only for privileged ops.
- Accessibility: baseline via shadcn/ui + explicit UX requirement.

### Implementation Readiness Validation ✅

**Decision Completeness:**
- Core stack and key versions verified (Next `16.1.1`, Supabase SDK `2.89.0`, etc.).
- AI gateway requirements (custom `BASE_URL`) are supported and constrained to server-only.

**Structure Completeness:**
- Concrete file/directory mapping exists for all major features and cross-cutting concerns.

**Pattern Completeness:**
- Naming, response formats, streaming events, state boundaries, and logging conventions are defined.

### Gap Analysis Results

**Critical Gaps (must resolve before implementation):**
1. **Streaming endpoint naming** is now standardized as the canonical endpoint: `POST /api/cover-letter/stream`.
2. **Cron endpoint hardening**: require server-only `CRON_SECRET` and reject requests without `Authorization: Bearer <CRON_SECRET>`.
3. **Local/runtime Node version**: `create-next-app@latest` requires Node `>= 20.9.0`.
   - Resolution: upgrade local Node and ensure Vercel runtime uses Node 20+ (consider setting `engines.node` in `job-tracker/package.json`).

**Important Gaps (recommended):**
- Decide test placement convention (`src/**/__tests__` vs `tests/`) so agents don’t scatter tests.

**Nice-to-Have (later):**
- Sentry, richer ingestion reliability tooling, queues.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context analyzed
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Stack + versions verified
- [x] Auth/RLS/security boundaries defined
- [x] AI gateway constraints defined

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Response/streaming formats specified
- [x] Error/logging/time formats specified

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Boundaries and mappings defined

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION  
**Confidence Level:** medium-high (pending Node upgrade + cron auth wiring)  

**Key Strengths:**
- Clear security boundaries (RLS + server-only secrets).
- Explicit traceability model (versions + status events + reminders).
- Streaming-first AI UX aligned end-to-end (API → UI → persistence).

**Areas for Future Enhancement:**
- Observability (Sentry), ingestion robustness, background job maturity.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
- Upgrade Node to `>= 20.9.0`, then initialize the Next.js project using the Step 3 `create-next-app` command.

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅  
**Total Steps Completed:** 8  
**Date Completed:** 2025-12-27T01:44:03+1000  
**Document Location:** `_bmad-output/architecture.md`

### Final Architecture Deliverables

**Complete Architecture Document**
- Architectural decisions documented (data, auth/security, API patterns, frontend, infra)
- Implementation patterns ensuring AI agent consistency
- Complete project structure with boundaries and requirement mapping
- Validation confirming coherence and completeness

**Implementation Ready Foundation**
- Functional requirements supported: 36 FRs (PRD)
- Non-functional requirements addressed: performance, reliability, security/privacy, accessibility
- Traceability model: JD snapshot, requirements, confirmed mapping, versioned cover letters, status events, reminders

### Implementation Handoff

**For AI Agents:**
This document is the single source of truth for implementing `job-tracker`. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**
Upgrade Node to `>= 20.9.0`, then initialize the Next.js project using the Step 3 starter command and place the app under `./job-tracker/`.

**Next Development Sequence (high-level):**
1. Initialize Next.js + Tailwind + shadcn/ui.
2. Create Supabase project, configure Magic Link and RLS.
3. Add schema migrations (Supabase CLI migrations) and core tables.
4. Implement CRUD + traceability primitives.
5. Implement streaming cover letter generation (`POST /api/cover-letter/stream`) with server-only AI gateway configuration.
6. Implement Vercel Cron reminders with `CRON_SECRET` authorization and idempotency.

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Document Maintenance:** Update this architecture when major technical decisions change during implementation.

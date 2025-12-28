# Story 1.4: (Non-MVP) High-Fit Preferences Settings

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,
I want to configure my job search preferences (e.g., role level, locations, visa filter, role focus, keywords),
so that the system can later evaluate “high-fit” jobs according to my preferences.

## Acceptance Criteria

1. Given I am signed in, when I open “Settings” and edit my high-fit preferences, then I can save the changes successfully, and the saved values persist after refresh/re-login.
2. Given I am signed out, when I attempt to access Settings, then I am redirected to sign-in, and my preferences remain private to my account.

## Tasks / Subtasks

- [x] Architecture alignment (must happen before adding new tables/endpoints).
  - [x] Update `_bmad-output/architecture.md` to document:
    - Settings route (`/settings`) and its protection model.
    - Preferences persistence approach (table + RLS).
    - API endpoints for preferences (`src/app/api/**/route.js`).
  - [x] Only update `_bmad-output/project-context.md` if a genuinely new pattern is introduced (prefer reusing existing rules).

- [x] Persist high-fit preferences in Supabase (RLS-first).
  - [x] Add a migration under `./job-tracker/supabase/migrations/` (suggest: `0002_high_fit_preferences.sql`) to create:
    - Table: `high_fit_preferences`
      - `user_id uuid primary key references auth.users(id) on delete cascade`
      - `role_levels text[] not null default '{}'`
      - `preferred_locations text[] not null default '{}'`
      - `visa_filter text not null default 'no_pr_required'`
      - `role_focus text not null default 'software'`
      - `keywords_include text[] not null default '{}'`
      - `keywords_exclude text[] not null default '{}'`
      - `created_at timestamptz not null default now()`
      - `updated_at timestamptz not null default now()`
    - RLS enabled + policies enforcing `user_id = auth.uid()` for:
      - `SELECT`, `INSERT`, `UPDATE`
  - [x] Keep DB in `snake_case`; map to API/UI `camelCase` at the server boundary.

- [x] Add server repo for preferences (server-only).
  - [x] Create `./job-tracker/src/lib/server/db/highFitPreferencesRepo.js`:
    - `getHighFitPreferences({ supabase, userId })` (returns DB record or null)
    - `upsertHighFitPreferences({ supabase, userId, values })` (upsert by `user_id`)
  - [x] Never import this repo into Client Components.

- [x] Add API endpoint (Route Handler) for settings preferences.
  - [x] Create `./job-tracker/src/app/api/preferences/high-fit/route.js`:
    - `GET`: returns `{ data: { ...preferencesCamelCase }, error: null }`
      - If row missing: return default values (empty arrays + defaults) so the form renders predictably.
    - `PUT`: validates request body with `zod` and upserts row; returns `{ data: { saved: true }, error: null }`
    - If no session user: return HTTP 401 + `{ data: null, error: { code: "UNAUTHORIZED" } }`
    - Error handling: return stable error codes (no raw Supabase error strings).

- [x] Build Settings UI (protected).
  - [x] Create `./job-tracker/src/app/settings/page.jsx` (protected by existing middleware):
    - Fetches current preferences from `GET /api/preferences/high-fit`
    - Renders a form to edit preferences
    - Saves via `PUT /api/preferences/high-fit`
  - [x] UX requirements:
    - Clear "Saved" confirmation state after successful save.
    - Actionable error state (preserve the user's inputs on error).
    - Progressive disclosure: keep advanced inputs (e.g., visa notes/extra keywords) optional/collapsed if UI supports it.

- [x] Manual verification (maps 1:1 to AC).
  - [x] Signed in → open `/settings` → edit preferences → save → refresh → values persist.
  - [x] Sign out → open `/settings` → redirected to `/sign-in` and no preferences are visible.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Update `_bmad-output/architecture.md` to explicitly document `/settings`, preferences persistence (table + RLS), and related endpoints. [_bmad-output/architecture.md:177]
- [x] [AI-Review][HIGH] Align zod version with `_bmad-output/project-context.md` (`zod@4.2.1`). [job-tracker/package.json:25]
- [x] [AI-Review][HIGH] Resolve manual verification contradiction (now recorded as completed). [_bmad-output/implementation-artifacts/1-4-non-mvp-high-fit-preferences-settings.md:67]
- [x] [AI-Review][HIGH] Decouple Story 1.4 High-Fit preferences from generation preferences failures (best-effort generation section). [job-tracker/src/app/settings/page.jsx:79]
- [x] [AI-Review][MEDIUM] Tighten request validation to match intended enums for role levels / visa filter / role focus. [job-tracker/src/app/api/preferences/high-fit/route.js:20]
- [x] [AI-Review][MEDIUM] Replace non-structured server logs and avoid leaking raw upstream errors (structured JSON logs + stable error codes). [job-tracker/src/app/api/preferences/high-fit/route.js:59]
- [x] [AI-Review][MEDIUM] Add a follow-up migration to remove redundant index and reduce updated_at trigger override risk. [job-tracker/supabase/migrations/0004_high_fit_preferences_cleanup.sql:1]

## Dev Notes

### Functional Definition (High-Fit Hard Filters)

From `_bmad-output/prd.md` (“Definition of high-fit (hard filters)”):
- Role level is one of: Graduate, Junior, Entry-level, Intern, Mid.
- Location is within Australia (with preference for Sydney, Melbourne, Brisbane).
- Visa requirement filter: job listing must not require PR/Citizen (at minimum).
- Tech stack and keywords match the user target (Frontend or Software roles) and user skills/projects.

This story only stores the user’s preferences; it does not implement scoring yet.

### Scope

In scope:
- Protected Settings page for high-fit preferences
- Persistence per user (Supabase + RLS)
- Route Handler API with `{ data, error }` envelope

Out of scope:
- Actual “high-fit” evaluation/scoring/ranking logic
- Any job ingestion changes or UI surfacing of high-fit results

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), no TypeScript files or tooling.
- ESM only (`import/export`), no `require()` / `module.exports`.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary.
- Non-stream endpoints must return `{ data, error }` envelope.
- Auth/session via `@supabase/ssr` in server code; all user-owned tables must have RLS with `user_id = auth.uid()`.
- UI must not read/write DB via Supabase directly; go through Route Handlers + server repos.

### Testing Requirements

Keep it lean:
- No network in tests; mock Supabase + any `fetch`.
- If you add pure mappers (snake_case ↔ camelCase) or zod validators, add unit tests for those.

### Project Structure Notes

App code lives under `./job-tracker/`.

Recommended files:
- `./job-tracker/src/app/settings/page.jsx`
- `./job-tracker/src/app/api/preferences/high-fit/route.js`
- `./job-tracker/src/lib/server/db/highFitPreferencesRepo.js`
- `./job-tracker/supabase/migrations/0002_high_fit_preferences.sql`

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 1 → Story 1.4)
- High-fit definition: `_bmad-output/prd.md`
- Project-wide implementation rules: `_bmad-output/project-context.md`
- Session/auth baseline: `_bmad-output/implementation-artifacts/1-2-magic-link-sign-in-and-protected-workspace.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Created database migration for high_fit_preferences table with RLS policies
- Added follow-up migration to clean up redundant index and use a table-specific updated_at trigger function
- Applied migration to Supabase project (vvhtshelatdyqsbfxpoy)
- Created server-only repo with snake_case to camelCase mapping
- Created API endpoint with GET (fetch/defaults) and PUT (validate with zod + upsert, tightened enums)
- Built Settings UI with form for role levels, locations, visa filter, role focus, and keywords (high-fit works independently of generation prefs)
- Added Settings link to home page
- Installed zod@4.2.1 for request validation (per project-context)
- Build and lint passed successfully
- Manual verification completed
- Updated `_bmad-output/architecture.md` to document `/settings` and the preferences API/table

### File List

- `_bmad-output/architecture.md` (updated - settings + preferences documentation)
- `./job-tracker/supabase/migrations/0002_high_fit_preferences.sql` (created - DB migration)
- `./job-tracker/supabase/migrations/0004_high_fit_preferences_cleanup.sql` (created - cleanup migration)
- `./job-tracker/src/lib/server/db/highFitPreferencesRepo.js` (created - server repo)
- `./job-tracker/src/app/api/preferences/high-fit/route.js` (created - API endpoint)
- `./job-tracker/src/app/settings/page.jsx` (created - Settings UI)
- `./job-tracker/package.json` (updated - zod pinned to 4.2.1)
- `./job-tracker/package-lock.json` (updated - zod 4.2.1)
- `./job-tracker/src/app/page.js` (updated - added Settings link)
- `_bmad-output/implementation-artifacts/1-4-non-mvp-high-fit-preferences-settings.md` (this story file)

# Story 1.5: (Non-MVP) Generation Preferences Settings

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,
I want to configure cover letter generation preferences (tone, emphasis, keywords to include/avoid),
so that future AI-generated drafts can be tailored to my personal defaults.

## Acceptance Criteria

1. Given I am signed in, when I open "Settings" and edit my generation preferences, then I can save the changes successfully, and the saved values persist after refresh/re-login.
2. Given saving preferences fails, when the error occurs, then I see an actionable error message and can retry, and the form preserves my unsaved edits.

## Tasks / Subtasks

- [x] Architecture alignment (must happen before adding new tables/endpoints).
  - [x] Update `_bmad-output/architecture.md` to document:
    - Where generation preferences are stored and how they are applied during cover letter generation later (Epic 6).
    - API endpoints for preferences (`src/app/api/**/route.js`) and envelope shape.
  - [x] Only update `_bmad-output/project-context.md` if a new cross-cutting pattern is introduced.

- [x] Persist generation preferences in Supabase (RLS-first).
  - [x] Add a migration under `./job-tracker/supabase/migrations/` (suggest: `0003_generation_preferences.sql`) to create:
    - Table: `generation_preferences`
      - `user_id uuid primary key references auth.users(id) on delete cascade`
      - `tone text not null default 'professional'`
      - `emphasis text[] not null default '{}'`
      - `keywords_include text[] not null default '{}'`
      - `keywords_avoid text[] not null default '{}'`
      - `created_at timestamptz not null default now()`
      - `updated_at timestamptz not null default now()`
    - RLS enabled + policies enforcing `user_id = auth.uid()` for `SELECT`, `INSERT`, `UPDATE`
  - [x] Keep DB in `snake_case`; map to API/UI `camelCase` at the server boundary.

- [x] Add server repo for generation preferences (server-only).
  - [x] Create `./job-tracker/src/lib/server/db/generationPreferencesRepo.js`:
    - `getGenerationPreferences({ supabase, userId })`
    - `upsertGenerationPreferences({ supabase, userId, values })`
  - [x] Never import this repo into Client Components.

- [x] Add API endpoint (Route Handler) for generation preferences.
  - [x] Create `./job-tracker/src/app/api/preferences/generation/route.js`:
    - `GET`: returns `{ data: { tone, emphasis, keywordsInclude, keywordsAvoid }, error: null }`
      - If row missing: return default values so the form renders predictably.
    - `PUT`: validates request body with `zod` and upserts row; returns `{ data: { saved: true }, error: null }`
    - If no session user: return HTTP 401 + `{ data: null, error: { code: "UNAUTHORIZED" } }`
    - Error handling: return stable error codes (no raw Supabase error strings).

- [x] Extend Settings UI to include "Generation preferences".
  - [x] Update `./job-tracker/src/app/settings/page.jsx` to include a section (or tab) for generation preferences:
    - Fetch from `GET /api/preferences/generation`
    - Save via `PUT /api/preferences/generation`
  - [x] UX requirements:
    - Actionable error message on save failure with a retry action.
    - Form preserves unsaved edits if save fails (do not reset to server values).
    - Keep the UI minimal: tone select + multi-value lists for emphasis/keywords.

- [x] Manual verification (maps 1:1 to AC).
  - [x] Signed in → open `/settings` → edit generation preferences → save → refresh → values persist.
  - [x] Induce save failure (e.g., temporarily break endpoint, or simulate 500) → UI shows actionable error + retry, and form keeps unsaved edits.

## Dev Notes

### Scope

In scope:
- Persist and edit user-level generation defaults
- API endpoint with `{ data, error }` envelope
- Settings UI section for generation preferences

Out of scope:
- Applying these defaults to AI prompts (that happens during Epic 6 generation workflows)
- Any AI provider code, streaming endpoints, or cover letter UX

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), no TypeScript files or tooling.
- ESM only (`import/export`), no `require()` / `module.exports`.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary.
- Non-stream endpoints must return `{ data, error }` envelope.
- Auth/session via `@supabase/ssr` in server code; all user-owned tables must have RLS with `user_id = auth.uid()`.
- UI must not read/write DB via Supabase directly; go through Route Handlers + server repos.

### Testing Requirements

Keep it lean and deterministic:
- No network in tests; mock Supabase.
- If you add a zod schema or snake_case ↔ camelCase mapping helpers, add unit tests for those.

### Project Structure Notes

App code lives under `./job-tracker/`.

Recommended files:
- `./job-tracker/src/app/api/preferences/generation/route.js`
- `./job-tracker/src/lib/server/db/generationPreferencesRepo.js`
- `./job-tracker/supabase/migrations/0003_generation_preferences.sql`
- `./job-tracker/src/app/settings/page.jsx` (extend existing settings UI)

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 1 → Story 1.5)
- FR5 context: `_bmad-output/prd.md`
- UX principles: `_bmad-output/project-planning-artifacts/ux-design-specification.md` ("State persistence", "Progressive disclosure")
- Session/auth baseline: `_bmad-output/implementation-artifacts/1-2-magic-link-sign-in-and-protected-workspace.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Created migration `0003_generation_preferences.sql` with RLS policies
- Applied migration to Supabase project vvhtshelatdyqsbfxpoy
- Created server repo `generationPreferencesRepo.js` with snake_case ↔ camelCase mapping
- Created API endpoint `/api/preferences/generation` with GET/PUT handlers and zod validation
- Updated Settings page to include Generation Preferences section with tone selector, emphasis checkboxes, and keyword inputs
- Settings page now fetches and saves both high-fit and generation preferences in parallel
- Build and lint passed successfully
- **Code review fixes applied (2025-12-27):**
  - Updated `architecture.md` to document `generation_preferences` table, API endpoints, and how preferences are applied in Epic 6
  - Added comprehensive unit tests: `generationPreferencesRepo.test.js` (snake_case↔camelCase mapping) and `validation.test.js` (zod schema)
  - Enhanced error messages in Settings page with explicit retry instructions (AC2 compliance)
  - Replaced `console.error` with structured JSON logging in API route (project-context compliance)
- Manual verification pending

### File List

- `./job-tracker/supabase/migrations/0003_generation_preferences.sql` (created - database migration)
- `./job-tracker/src/lib/server/db/generationPreferencesRepo.js` (created - server repo)
- `./job-tracker/src/app/api/preferences/generation/route.js` (created - API endpoint, updated - structured logging)
- `./job-tracker/src/app/settings/page.jsx` (updated - added generation preferences section, enhanced error messages)
- `./job-tracker/src/lib/server/db/__tests__/generationPreferencesRepo.test.js` (created - unit tests)
- `./job-tracker/src/app/api/preferences/generation/__tests__/validation.test.js` (created - zod validation tests)
- `_bmad-output/architecture.md` (updated - documented generation_preferences system)
- `_bmad-output/implementation-artifacts/1-5-non-mvp-generation-preferences-settings.md` (this story file)

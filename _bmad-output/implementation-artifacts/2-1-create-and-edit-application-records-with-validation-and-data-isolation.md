# Story 2.1: Create and Edit Application Records (with Validation and Data Isolation)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,
I want to create and edit an application record (company, role, link, status, applied date, notes),
so that I can reliably track my job applications in one place.

## Acceptance Criteria

1. Given I am signed in, when I create a new application with at least company and role, then the application is saved successfully, and I can later reopen it and see the saved values.
2. Given I am creating or editing an application, when I set status to `Applied` (or any status after Applied), then the UI requires an `applied date` before saving, and the user sees a clear, inline validation message if it is missing.
3. Given I am creating or editing an application, when I set status to `Draft`, then `applied date` is optional, and saving succeeds without requiring a date.
4. Given I am signed in, when I edit the application fields (company, role, link, notes, status, applied date) and save, then the changes persist after refresh/re-login, and I see a clear saved/loading/error state with an actionable retry on failure.
5. Given two different users exist, when user A attempts to access or modify user B's application by ID, then access is denied (no data is returned), and user A cannot infer user B's application existence.

## Tasks / Subtasks

- [x] Persist application records in Supabase (RLS-first).
  - [x] Add a migration under `./job-tracker/supabase/migrations/` (suggest: `0004_applications.sql`) to create:
    - Table: `applications`
      - `id uuid primary key default gen_random_uuid()`
      - `user_id uuid not null references auth.users(id) on delete cascade`
      - `company text not null`
      - `role text not null`
      - `link text`
      - `status text not null default 'draft'`
      - `applied_date date` (nullable; required by validation rules depending on `status`)
      - `notes text`
      - `jd_snapshot text` (nullable; for later epics)
      - `extracted_requirements jsonb` (nullable; for later epics)
      - `confirmed_mapping jsonb` (nullable; for later epics)
      - `created_at timestamptz not null default now()`
      - `updated_at timestamptz not null default now()`
    - Index on `user_id` and optionally `(user_id, updated_at desc)` for listing.
    - RLS enabled + policies enforcing `user_id = auth.uid()` for `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
  - [x] Keep DB in `snake_case`; map to API/UI `camelCase` at the server boundary.

- [x] Define application status values + applied-date rule (shared by UI + server).
  - [x] Create a small module (e.g., `./job-tracker/src/lib/utils/applicationStatus.js`) with:
    - `APPLICATION_STATUSES` (start minimal): `draft`, `applied`, `interview`, `offer`, `rejected`, `withdrawn`
    - `requiresAppliedDate(status)`:
      - `false` only for `draft`
      - `true` for `applied` and any "after Applied" statuses
  - [x] Ensure UI uses this rule for inline validation, and server enforces it so the rule can't be bypassed.

- [x] Add server repo for applications (server-only).
  - [x] Create `./job-tracker/src/lib/server/db/applicationsRepo.js`:
    - `createApplication({ supabase, userId, values })`
    - `getApplicationById({ supabase, userId, id })` (returns null when not found/not owned)
    - `listApplications({ supabase, userId })`
    - `updateApplication({ supabase, userId, id, patch })` (returns updated row; null when not found/not owned)
  - [x] Do not import this repo into Client Components.

- [x] Add API endpoints (Route Handlers) for create/read/update (API boundary).
  - [x] Create `./job-tracker/src/app/api/applications/route.js`:
    - `GET`: list current user's applications (minimal fields are OK for this story).
    - `POST`: create application.
      - Validate body with `zod`.
      - Enforce: `company` and `role` required.
      - Enforce applied-date rule server-side using `requiresAppliedDate`.
      - Return `{ data, error }` envelope.
  - [x] Create `./job-tracker/src/app/api/applications/[id]/route.js`:
    - `GET`: fetch application by id.
    - `PATCH`: update application by id.
      - Apply patch, then validate cross-field rules (status/appliedDate).
    - Data isolation rule:
      - If row is missing OR not owned (RLS returns 0 rows), return the same response (e.g., HTTP 404 + `{ data: null, error: { code: "NOT_FOUND" } }`) so user A cannot infer existence.
    - If no session user: HTTP 401 + `{ data: null, error: { code: "UNAUTHORIZED" } }`.
    - Never leak raw Supabase errors; log structured JSON without secrets.

- [x] Implement minimal UI for create/edit with clear states.
  - [x] Build this as a small "applications" area inside the existing workspace entry (`./job-tracker/src/app/page.js`) or a feature component under `./job-tracker/src/components/features/applications/**`.
  - [x] Must include:
    - Create form (company + role required).
    - Editable fields: company, role, link, status, appliedDate, notes.
    - Inline validation:
      - If status requires appliedDate and it's missing, block save and show message next to the appliedDate control.
    - Saved/loading/error states:
      - On save: show loading; on success: show "Saved"; on failure: show actionable error + "Retry" without clearing the form.
    - Reopen behavior:
      - Provide a list (from `GET /api/applications`) and selection to load a record (from `GET /api/applications/[id]`), so the user can reopen and see saved values.

- [ ] Manual verification (maps 1:1 to AC).
  - [ ] Create application with only company+role → saved → reopen via list → values match.
  - [ ] Set status to `applied` (or later) without appliedDate → inline validation blocks save.
  - [ ] Set status to `draft` → appliedDate optional → save succeeds.
  - [ ] Save edits → refresh/re-login → changes persist; errors show retry without losing edits.
  - [ ] Cross-user isolation:
    - With two users, attempt to fetch/update another user's application id → response is indistinguishable from non-existent (no leakage).

## Dev Notes

### Scope

This story is the start of Epic 2 and establishes the core "application record" persistence and edit loop.

In scope:
- `applications` persistence with RLS
- Create/edit flows + inline validation for appliedDate rule
- Minimal list + reopen UX sufficient to prove persistence

Out of scope:
- Full inbox UX polish (Story 2.2)
- Search/filter (Story 2.3)
- Timeline/history (Story 2.4)
- Follow-up prompts (Story 2.5)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), ESM only.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary; non-stream endpoints return `{ data, error }`.
- UI must not access Supabase directly for data; all DB reads/writes go through Route Handlers + server repos under `src/lib/server/db/**`.
- RLS is mandatory; user-owned tables enforce `user_id = auth.uid()`.
- Error codes at API boundaries must be stable; don't leak raw upstream error strings to the client.
- Treat timestamps as UTC ISO-8601; for `appliedDate` prefer a stable `YYYY-MM-DD` date string in the API and store as `date` in DB.

### Middleware / Auth Boundary Gotcha

Current middleware treats `"/api/**"` as public (not redirected). Therefore every applications API handler must enforce auth and return `UNAUTHORIZED` when no session.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 2 → Story 2.1)
- Architecture (API + structure): `_bmad-output/architecture.md` (applications as aggregate root; expected API paths)
- Project-wide implementation rules: `_bmad-output/project-context.md`
- Auth/session baseline: `_bmad-output/implementation-artifacts/1-2-magic-link-sign-in-and-protected-workspace.md`
- API patterns examples: `job-tracker/src/app/api/preferences/high-fit/route.js`, `job-tracker/src/app/api/me/route.js`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Created migration `0004_applications.sql` with full RLS policies for SELECT, INSERT, UPDATE, DELETE
- Applied migration to Supabase project vvhtshelatdyqsbfxpoy
- Created `applicationStatus.js` utility with APPLICATION_STATUSES, STATUS_LABELS, requiresAppliedDate, isValidStatus
- Created `applicationsRepo.js` with createApplication, getApplicationById, listApplications, updateApplication
- Created `/api/applications` endpoint with GET (list) and POST (create) handlers
- Created `/api/applications/[id]` endpoint with GET and PATCH handlers
- Both endpoints enforce appliedDate rule server-side using requiresAppliedDate
- Created ApplicationForm component with inline validation
- Created ApplicationList component with status badges
- Created ApplicationDetail component for detailed view
- Created ApplicationsInbox component for inbox layout
- Created ApplicationsManager component integrating list and form
- Updated main page to display applications UI
- Build and lint passed successfully
- **Code review fixes applied (2025-12-27):**
  - Added comprehensive unit tests: `applicationsRepo.test.js` (snake_case↔camelCase mapping) and `validation.test.js` (zod schema)
  - Updated file list to include all created components (ApplicationDetail.jsx, ApplicationsInbox.jsx) and test files
  - Replaced console.error with structured JSON logging in both API routes (4 locations - project-context compliance)
  - Enhanced error messages with explicit retry instructions (AC4 compliance)
- Manual verification pending

### File List

- `./job-tracker/supabase/migrations/0004_applications.sql` (created - database migration)
- `./job-tracker/src/lib/utils/applicationStatus.js` (created - status utility)
- `./job-tracker/src/lib/server/db/applicationsRepo.js` (created - server repo)
- `./job-tracker/src/app/api/applications/route.js` (created - list/create API, updated - structured logging)
- `./job-tracker/src/app/api/applications/[id]/route.js` (created - get/update API, updated - structured logging)
- `./job-tracker/src/components/features/applications/ApplicationForm.jsx` (created - form component)
- `./job-tracker/src/components/features/applications/ApplicationList.jsx` (created - list component)
- `./job-tracker/src/components/features/applications/ApplicationDetail.jsx` (created - detail view component)
- `./job-tracker/src/components/features/applications/ApplicationsInbox.jsx` (created - inbox layout component)
- `./job-tracker/src/components/features/applications/ApplicationsManager.jsx` (created - manager component, updated - enhanced error messages)
- `./job-tracker/src/app/page.js` (updated - integrated applications UI)
- `./job-tracker/src/lib/server/db/__tests__/applicationsRepo.test.js` (created - unit tests)
- `./job-tracker/src/app/api/applications/__tests__/validation.test.js` (created - zod validation tests)
- `_bmad-output/implementation-artifacts/2-1-create-and-edit-application-records-with-validation-and-data-isolation.md` (this story file)

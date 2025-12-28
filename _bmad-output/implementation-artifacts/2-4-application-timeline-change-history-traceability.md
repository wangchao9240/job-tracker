# Story 2.4: Application Timeline / Change History (Traceability)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,
I want to view a timeline/history of meaningful changes to an application,
so that I can answer “what did I submit, when, and what changed?” with confidence.

## Acceptance Criteria

1. Given I am signed in and viewing an application, when I update its status, then a new timeline event is recorded, and the timeline shows at least the status transition and timestamp.
2. Given I am signed in and viewing an application, when I change any of these important fields: company, role, or link, then a new timeline event is recorded, and the timeline shows the field changed and the before/after values.
3. Given I am signed in, when I reload the page or return later, then the timeline remains available and consistent, and it only contains my own application history (user-scoped).
4. Given saving an update fails, when the error occurs, then no partial or duplicated timeline events are created for that failed save, and the UI supports retry without losing my edits.

## Tasks / Subtasks

- [x] Persist status/change events in a normalized table (append-only, RLS-first).
  - [x] Add a migration under `./job-tracker/supabase/migrations/` (suggest: `0006_application_status_events.sql`) to create:
    - Table: `application_status_events`
      - `id uuid primary key default gen_random_uuid()`
      - `application_id uuid not null references public.applications(id) on delete cascade`
      - `user_id uuid not null references auth.users(id) on delete cascade`
      - `event_type text not null` (initial: `status_changed`, `field_changed`)
      - `created_at timestamptz not null default now()`
      - `payload jsonb not null default '{}'` (stores before/after details)
    - Indexes:
      - `(application_id, created_at desc)`
      - `(user_id, created_at desc)`
    - RLS enabled + policies enforcing `user_id = auth.uid()` for `SELECT` and `INSERT`.

- [x] Add server repo for timeline events (server-only).
  - [x] Create `./job-tracker/src/lib/server/db/statusEventsRepo.js`:
    - `listStatusEvents({ supabase, userId, applicationId })` (returns events newest-first)
    - `insertStatusEvent({ supabase, userId, applicationId, eventType, payload })`
  - [x] Ensure it is safe for Route Handlers only (never import in Client Components).

- [x] Update application update flow to write events atomically.
  - [x] In `PATCH /api/applications/[id]` (Story 2.1), implement:
    - Load current application first (owned by user).
    - Compute whether any meaningful changes happened:
      - Status change → one `status_changed` event with `from`/`to`.
      - Company/role/link changes → one `field_changed` event per changed field OR a single event with multiple fields (pick one; keep UI display simple).
    - Update application record.
    - Insert events only if update succeeds.
  - [x] Prevent duplication on failed saves:
    - If application update fails, do not insert events.
    - Prefer doing both update + event inserts in a single Postgres function/RPC if you need strong atomicity.
      - If you keep it in app code, be careful with ordering and error handling.

- [x] Add API endpoint to read timeline events (Route Handler).
  - [x] Create `./job-tracker/src/app/api/applications/[id]/timeline/route.js` (`GET`):
    - Requires auth; returns `UNAUTHORIZED` on no session.
    - Uses `statusEventsRepo.listStatusEvents`.
    - Must be user-scoped and non-inferential:
      - If application doesn’t exist OR isn’t owned, return HTTP 404 + `{ data: null, error: { code: "NOT_FOUND" } }`.

- [x] Add timeline UI to application detail view.
  - [x] In the application detail panel (Story 2.2), add a "Timeline" section/tab:
    - Fetch from `GET /api/applications/[id]/timeline`.
    - Render events newest-first with:
      - Timestamp (ISO-8601 formatted for display)
      - Status transitions: `Draft → Applied` etc.
      - Field changes: `company: "Old" → "New"`
  - [x] Retry behavior:
    - If saving an update fails, keep unsaved edits in the form and allow retry; timeline should not show a new event for that failed attempt.

## Dev Notes

### Traceability Model

From `_bmad-output/architecture.md`:
- Use normalized history tables where append-only history and retrieval are core product guarantees.
- `application_status_events` is the history/timeline table for application status and meaningful changes.

### Scope

In scope:
- Persisted timeline events
- Reading and rendering timeline for a single application
- Ensuring no events are created for failed updates

Out of scope:
- Full “status events” taxonomy beyond status/field changes
- Reminders (Story 2.5)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- Non-stream endpoints return `{ data, error }`.
- RLS required; user-owned data enforced by `user_id = auth.uid()`.
- Do not leak existence of other users’ resources (404 for not found/not owned).
- Structured JSON logging only; never log secrets or full JD text.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 2 → Story 2.4)
- Architecture (traceability): `_bmad-output/architecture.md` (applications + status events)
- Application CRUD baseline: `_bmad-output/implementation-artifacts/2-1-create-and-edit-application-records-with-validation-and-data-isolation.md`
- Inbox UI baseline: `_bmad-output/implementation-artifacts/2-2-application-inbox-list-and-detail-view.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Migration `0006_application_status_events.sql` creates append-only events table with RLS
- `statusEventsRepo.js` provides `listStatusEvents` and `insertStatusEvents` (bulk insert) with event type and payload validation
- PATCH endpoint tracks `status_changed` and `field_changed` events, inserted BEFORE application update for atomicity
- Timeline endpoint at `GET /api/applications/[id]/timeline` returns events newest-first
- Timeline UI added to ApplicationDetail with loading/error states and auto-refresh after save
- Build and lint pass
- Code review fixes applied:
  - Improved event insertion atomicity by creating events BEFORE application update
  - Added comprehensive unit tests for repo functions, timeline endpoint, and event tracking
  - Added event type validation (EVENT_TYPES constant)
  - Added payload structure validation for each event type
  - Updated architecture.md with detailed timeline model documentation

### File List

- `./job-tracker/supabase/migrations/0006_application_status_events.sql` (created - events table migration)
- `./job-tracker/src/lib/server/db/statusEventsRepo.js` (created - event repo with validation)
- `./job-tracker/src/lib/server/db/__tests__/statusEventsRepo.test.js` (created - repo unit tests)
- `./job-tracker/src/app/api/applications/[id]/route.js` (updated - event tracking before update)
- `./job-tracker/src/app/api/applications/[id]/timeline/route.js` (created - timeline endpoint)
- `./job-tracker/src/app/api/applications/[id]/__tests__/timeline.test.js` (created - timeline endpoint tests)
- `./job-tracker/src/app/api/applications/[id]/__tests__/eventTracking.test.js` (created - event tracking tests)
- `./job-tracker/src/components/features/applications/ApplicationDetail.jsx` (updated - timeline UI)
- `_bmad-output/architecture.md` (updated - timeline model documentation)
- `_bmad-output/implementation-artifacts/2-4-application-timeline-change-history-traceability.md` (this story file)

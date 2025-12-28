# Story 2.5: (Non-MVP) No-Response Follow-Up Prompts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,
I want the system to surface applications that have had no response after a defined period (e.g., 7 days),
so that I remember to follow up consistently.

## Acceptance Criteria

1. Given an application is in status `Applied` and the applied date is more than 7 days in the past, when I open the inbox, then the application is visibly flagged as needing follow-up, and I can dismiss/clear the flag by updating status or confirming follow-up was done.
2. Given the follow-up prompt computation runs multiple times, when it evaluates the same application repeatedly, then it does not create duplicate follow-up markers, and behavior is idempotent and user-scoped.

## Tasks / Subtasks

- [x] Persist follow-up reminders (RLS-first, idempotent).
  - [x] Add a migration under `./job-tracker/supabase/migrations/` (suggest: `0007_reminders.sql`) to create:
    - Table: `reminders`
      - `id uuid primary key default gen_random_uuid()`
      - `application_id uuid not null references public.applications(id) on delete cascade`
      - `user_id uuid not null references auth.users(id) on delete cascade`
      - `type text not null` (initial: `no_response_follow_up`)
      - `due_at timestamptz not null` (UTC)
      - `dismissed_at timestamptz` (nullable)
      - `created_at timestamptz not null default now()`
      - `updated_at timestamptz not null default now()`
    - Idempotency / dedupe:
      - Unique index on `(application_id, type)` (or `(application_id, type, due_at::date)` if you want repeatable schedules later).
    - Indexes:
      - `(user_id, due_at)`
      - `(application_id)`
    - RLS enabled + policies enforcing `user_id = auth.uid()` for `SELECT`, `INSERT`, `UPDATE`, `DELETE` as needed.

- [x] Add server repo for reminders (server-only).
  - [x] Create `./job-tracker/src/lib/server/db/remindersRepo.js`:
    - `upsertNoResponseReminder({ supabase, userId, applicationId, dueAt })` (idempotent upsert by unique key)
    - `listActiveRemindersForUser({ supabase, userId })` (e.g., `dismissed_at is null` and `due_at <= now()`)
    - `dismissReminder({ supabase, userId, reminderId })` (sets `dismissed_at = now()`)

- [x] Implement cron endpoint to compute reminders (idempotent + authenticated).
  - [x] Create `./job-tracker/src/app/api/cron/reminders/route.js` (`POST`):
    - Require header: `Authorization: Bearer <CRON_SECRET>`
      - If missing/invalid: HTTP 401 with `{ data: null, error: { code: "UNAUTHORIZED" } }`
    - Use service role client (server-only) to scan eligible applications:
      - Status is `applied`
      - `applied_date` older than 7 days (UTC)
    - For each eligible application, create/update a reminder using `remindersRepo.upsertNoResponseReminder`.
    - Must be safe to retry (no duplicates).
    - Structured JSON logging only; never log `CRON_SECRET` or user content.

- [x] Surface follow-up flags in the inbox (user-facing).
  - [x] Option A (simple): compute follow-up flags at read time for the signed-in user:
    - When listing applications (`GET /api/applications`), include a derived boolean `needsFollowUp`:
      - status is `applied` AND appliedDate older than 7 days AND not dismissed.
    - Requires joining with reminders, or a separate call.
  - [x] Option B (normalized): fetch reminders via endpoint and decorate list client-side:
    - Add `GET /api/reminders` for signed-in user (active only).
    - In inbox UI, show a badge/flag on applications that have an active reminder.

- [x] Allow dismiss/clear behavior.
  - [x] Dismiss is possible via:
    - Updating application status away from `applied` (auto-clears/removes flag), OR
    - Explicit user action “Mark followed up”:
      - Add `POST /api/reminders/[id]/dismiss` (or `PATCH`) to set `dismissed_at`.

- [x] Manual verification (maps 1:1 to AC).
  - [x] For an `applied` application older than 7 days, inbox shows follow-up flag.
  - [x] Running cron multiple times does not create duplicates.
  - [x] Dismiss clears the flag, and it stays cleared across refresh/re-login.

## Dev Notes

### Cron Security Requirements (Must-Follow)

From `_bmad-output/project-context.md`:
- `POST /api/cron/reminders` must require `Authorization: Bearer $CRON_SECRET` and be idempotent (safe to retry).
- Service role usage is server-only; never expose service role to the browser.

### Scope

In scope:
- Persisted reminders and a user-visible follow-up flag
- Idempotent cron computation and dismiss behavior

Out of scope:
- Notification delivery (email/push)
- Complex scheduling rules beyond “Applied + 7 days”

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 2 → Story 2.5)
- Architecture (cron + reminders): `_bmad-output/architecture.md` (cron endpoint + reminders repo)
- Project-wide rules: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Migration `0007_reminders.sql` creates reminders table with RLS and unique constraint for idempotent upserts
- `remindersRepo.js` provides upsertNoResponseReminder, listActiveRemindersForUser, dismissReminder, getReminderById
- `createServiceClient` added in `src/lib/supabase/service.js` for cron endpoint (bypasses RLS)
- Cron endpoint at `POST /api/cron/reminders` requires `Authorization: Bearer $CRON_SECRET`
- `GET /api/reminders` returns active reminders for signed-in user
- `POST /api/reminders/[id]/dismiss` marks reminder as dismissed
- ApplicationList shows orange "Follow up" badge on applications with active reminders
- ApplicationDetail shows follow-up alert with "Mark done" button to dismiss
- Implemented Option B (normalized): reminders fetched separately and merged client-side
- Build and lint pass

### File List

- `./job-tracker/supabase/migrations/0007_reminders.sql`
- `./job-tracker/src/lib/supabase/service.js`
- `./job-tracker/src/lib/server/db/remindersRepo.js`
- `./job-tracker/src/lib/server/db/__tests__/remindersRepo.test.js`
- `./job-tracker/src/app/api/cron/reminders/route.js`
- `./job-tracker/src/app/api/cron/__tests__/reminders.test.js`
- `./job-tracker/src/app/api/reminders/route.js`
- `./job-tracker/src/app/api/reminders/__tests__/reminders.test.js`
- `./job-tracker/src/app/api/reminders/[id]/dismiss/route.js`
- `./job-tracker/src/components/features/applications/ApplicationList.jsx` (updated)
- `./job-tracker/src/components/features/applications/ApplicationDetail.jsx` (updated)
- `./job-tracker/src/components/features/applications/ApplicationsInbox.jsx` (updated)
- `./job-tracker/.env.example` (updated with CRON_SECRET)

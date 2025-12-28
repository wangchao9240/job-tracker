# Story 6.1: Generate Cover Letter Draft from Confirmed Mapping

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to generate a cover letter draft for an application based on the confirmed mapping and JD snapshot,  
so that I can start from an evidence-based draft instead of writing from scratch.

## Acceptance Criteria

1. Given an application has a saved JD snapshot and a confirmed mapping, when I request “Generate cover letter draft,” then the system generates a draft grounded in the confirmed mapping, and the draft is saved as the application’s latest draft.
2. Given I request generation, when generation is in progress, then the UI shows a clear streaming/in-progress state, and I can navigate elsewhere in the app without the UI breaking.
3. Given generation completes, when I view the application, then I can read the latest saved draft, and I can regenerate later to replace the latest draft.
4. Given the application is missing a confirmed mapping or JD snapshot, when I attempt to generate a draft, then the UI blocks the action with a clear explanation of what is missing, and it provides a direct path to fix it (e.g., “Confirm mapping” or “Paste JD”).

## Tasks / Subtasks

- [ ] Prereqs: confirm required inputs and persistence model.
  - [ ] Application has:
    - `jd_snapshot` (API: `jdSnapshot`) (Epic 3)
    - `confirmed_mapping` (API: `confirmedMapping`) (Epic 5)
  - [ ] Ensure cover letter drafts are versioned per architecture:
    - Create `cover_letter_versions` table (if not present) via Supabase migration.

- [ ] Create `cover_letter_versions` table (RLS-first; traceability).
  - [ ] Add a migration under `./job-tracker/supabase/migrations/` to create `public.cover_letter_versions`:
    - Columns (suggested):
      - `id uuid primary key default gen_random_uuid()`
      - `user_id uuid not null references auth.users(id) on delete cascade`
      - `application_id uuid not null references public.applications(id) on delete cascade`
      - `kind text not null` (`draft` now; later `submitted`)
      - `content text not null`
      - `created_at timestamptz not null default now()`
    - Latest-draft semantics (choose one, keep it simple):
      - Option A (recommended): store every generation and add `is_latest boolean not null default true`, plus a partial unique constraint on `(application_id, kind)` where `is_latest = true`; on new draft, flip previous latest to false in a transaction.
      - Option B: keep only one draft row per application (overwrite content) (less history; not recommended).
    - RLS enabled + policies enforcing `user_id = auth.uid()` for `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
  - [ ] Keep DB in `snake_case`; map to API/UI `camelCase` at the server boundary.

- [ ] Add server repo for cover letter versions (server-only).
  - [ ] Create `./job-tracker/src/lib/server/db/coverLetterVersionsRepo.js`:
    - `createDraftVersion({ supabase, userId, applicationId, content })` (handles “latest draft” semantics)
    - `getLatestDraft({ supabase, userId, applicationId })`
    - (future) `createSubmittedVersion(...)` for Story 6.3
  - [ ] Do not import into Client Components.

- [ ] Implement streaming generation endpoint (canonical).
  - [ ] Create `./job-tracker/src/app/api/cover-letter/stream/route.js` (`POST`) as the only canonical streaming endpoint.
  - [ ] Auth-required:
    - If no session user: HTTP 401 + stream terminal `error` event (or a non-stream 401 if you prefer to fail fast before streaming starts).
  - [ ] Request body (validate with `zod`):
    - `applicationId: string`
  - [ ] Server steps:
    1) Load application; 404 `NOT_FOUND` if not found/not owned.
    2) Validate prerequisites:
       - If missing `jdSnapshot`: emit terminal `error` with `JD_SNAPSHOT_REQUIRED`.
       - If missing `confirmedMapping`: emit terminal `error` with `CONFIRMED_MAPPING_REQUIRED`.
    3) Build a prompt grounded in:
       - JD snapshot text (do not log it)
       - confirmed mapping items + selected bullet texts (load bullets by id)
       - (optional) generation preferences baseline tone (do not block on this in 6.1)
    4) Call AI provider through server-side `fetch` (no vendor SDK), using streaming response.
    5) Stream to client using events:
       - `delta`: incremental text chunks
       - `done`: terminal event with metadata (e.g., `draftId`, `applicationId`)
       - `error`: terminal event with stable error code
    6) On `done`, persist the final content as the application’s latest draft in `cover_letter_versions`.
  - [ ] Guardrails:
    - Do not log secrets or full JD / bullet content.
    - Logs must be structured JSON.

- [ ] Client UI: start streaming generation and show non-blocking progress.
  - [ ] Add a “Cover Letter” section/tab in the application workspace.
  - [ ] “Generate draft” CTA:
    - Disabled until JD snapshot + confirmed mapping exist, with clear missing-state messaging and direct actions:
      - “Paste JD” (to Story 3.3 area)
      - “Confirm mapping” (to Story 5.5 workbench)
  - [ ] Streaming UX:
    - Render streamed draft progressively while `delta` events arrive.
    - Allow user to navigate away without losing the in-progress draft text (use UI-only state per architecture; do not duplicate server state).
    - If stream errors: keep partial output visible with Retry; do not lose underlying application data.
  - [ ] After completion:
    - Show the saved latest draft (loaded from server) and allow regenerate (replaces latest draft).

- [ ] Minimal tests (only what changes).
  - [ ] Streaming endpoint test:
    - emits `delta` then terminal `done` on success
    - emits terminal `error` when missing JD snapshot or confirmed mapping
  - [ ] Repo tests for “latest draft” semantics (no duplicates; latest replaced).
  - [ ] Mock `fetch` for AI provider; no network in tests.

## Dev Notes

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- Canonical streaming endpoint: `POST /api/cover-letter/stream`.
- Stream events must be `delta`, `done`, `error`.
- Persist final output to `cover_letter_versions` on `done`.
- Outbound AI calls use server-side `fetch` only (no vendor SDK), never from the browser.
- UI must not access Supabase directly for data; use Route Handlers + server repos.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 6 → Story 6.1)
- Architecture (streaming + versioning): `_bmad-output/architecture.md` (`/api/cover-letter/stream`, `cover_letter_versions`)
- Project-wide rules: `_bmad-output/project-context.md`
- Dependencies: `_bmad-output/implementation-artifacts/3-3-manual-jd-snapshot-paste-and-storage.md`, `_bmad-output/implementation-artifacts/5-5-mapping-workbench-review-confirm-and-persist-mapping-including-uncovered-requirements.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/6-1-generate-cover-letter-draft-from-confirmed-mapping.md` (this story file)

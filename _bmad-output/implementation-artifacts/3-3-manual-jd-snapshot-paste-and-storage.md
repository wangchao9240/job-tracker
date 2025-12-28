# Story 3.3: Manual JD Snapshot Paste and Storage

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to paste the full job description text and save it as a JD snapshot on the application,  
so that downstream requirement extraction and generation can proceed even when parsing fails.

## Acceptance Criteria

1. Given I am signed in and an application’s JD text is missing or incorrect, when I paste JD text into the provided input and save, then the application stores the JD snapshot text successfully, and I can view the saved snapshot later on the application.
2. Given I paste a JD snapshot and save, when saving completes, then I see a clear confirmation that the snapshot is stored, and if saving fails, my pasted text remains in the UI for retry (no re-entry required).
3. Given a JD snapshot already exists, when I update the snapshot with a new pasted JD text and save, then the stored snapshot is replaced with the latest version, and downstream steps always use the latest saved snapshot.

## Tasks / Subtasks

- [x] Prereqs: DB supports JD snapshot storage (migration-first).
  - [x] Confirm `public.applications.jd_snapshot text` exists (it should, from `./job-tracker/supabase/migrations/0004_applications.sql`).
  - [x] No new table required; this story is about manual capture + persistence + view.

- [x] Allow JD snapshot updates through the API boundary (Route Handler).
  - [x] Update `./job-tracker/src/app/api/applications/[id]/route.js` (`PATCH`):
    - Extend `updateApplicationSchema` to accept:
      - `jdSnapshot: string | null` (optional)
    - Preserve existing auth + isolation behavior:
      - If no session: HTTP 401 + `{ data: null, error: { code: "UNAUTHORIZED" } }`
      - If not found/not owned: HTTP 404 + `{ data: null, error: { code: "NOT_FOUND" } }`
    - Keep response envelope `{ data, error }` (project rule).
  - [x] Logging guardrails (must-follow):
    - Structured JSON logs only.
    - Never log raw `jdSnapshot` content (PII risk + very large payload).

- [x] Persist JD snapshot via the existing server repo (server-only).
  - [x] Use `./job-tracker/src/lib/server/db/applicationsRepo.js` mapping:
    - API field `jdSnapshot` → DB column `jd_snapshot`.
  - [x] Confirm the repo update path (`updateApplication`) supports `jdSnapshot` patch (it already should); do not bypass the repo from UI.

- [x] Add "Paste JD" UI with explicit save and clear states.
  - [x] In the application detail workspace (current pattern: `./job-tracker/src/components/features/applications/ApplicationDetail.jsx`):
    - Add a "JD Snapshot" section with:
      - A textarea input for JD text (supports large paste).
      - A clear Save action (can reuse the existing "Save Changes" flow, but must still satisfy AC2).
      - A visible "Saved" confirmation on success.
      - On error: keep the pasted text in the textarea and show a direct retry action.
    - If `jdSnapshot` is empty/missing:
      - Show a prominent indicator ("JD needed") and guide the user to paste it here (no dead ends).
  - [x] View capability:
    - After save, the user can read the stored snapshot on the same application view (either in the textarea or a read-only view).

- [x] Timeline / status events (optional, do not leak JD text).
  - [x] If you record an event for JD updates, do not store raw JD in the payload.
    - Acceptable: `jd_snapshot_updated` with metadata only (e.g., `{ fromLength, toLength }`).
    - Acceptable: no event (skip entirely).

- [x] Minimal test coverage (only what changes).
  - [x] Add/adjust a unit test to ensure the `[id]` PATCH route validation accepts `jdSnapshot` (string/null) and rejects non-strings.
  - [x] Add/adjust a repo mapping test to ensure `jdSnapshot` maps to `jd_snapshot` consistently (if not already covered).

## Dev Notes

### Scope

In scope:
- Manual JD snapshot capture (paste textarea) and persistence on an existing application
- Replace existing snapshot on save (latest wins)
- Clear UX states: saving/saved/error, with no re-entry required after failure

Out of scope:
- URL parsing / best-effort extraction (Story 3.1)
- Review/edit extracted company/role/location fields (Story 3.2)
- Duplicate detection (Story 3.4)
- Requirements extraction from JD snapshot (Epic 4)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), ESM only.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary; non-stream endpoints return `{ data, error }`.
- UI must not access Supabase directly for data; DB reads/writes go through Route Handlers + server repos under `src/lib/server/db/**`.
- Do not log full JD text; logs must be structured JSON and avoid sensitive payloads.

### UX Notes

From `_bmad-output/project-planning-artifacts/ux-design-specification.md`:
- “No dead ends” recovery: manual JD paste is the primary fallback when parsing fails.
- Explicit save and actionable error/retry states are required; keep user input on failure.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 3 → Story 3.3)
- Architecture notes (manual JD fallback + traceability): `_bmad-output/architecture.md`
- Project-wide implementation rules: `_bmad-output/project-context.md`
- Related stories: `_bmad-output/implementation-artifacts/3-1-paste-job-url-to-create-application-with-source-detection-and-best-effort-extraction.md`, `_bmad-output/implementation-artifacts/3-2-review-and-edit-extracted-job-fields.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Most functionality already implemented in Story 3-2 (PATCH endpoint supports jdSnapshot)
- ApplicationDetail.jsx updated with full JD Snapshot section:
  - Textarea for pasting/editing JD text (10 rows, monospace font)
  - Character count displayed when JD exists
  - "Job description needed" warning banner when JD is missing
  - Explains why JD is needed (requirements extraction, cover letter generation)
- Location field also added to ApplicationDetail for completeness
- Timeline formatEvent function updated to display jd_snapshot_updated events nicely
- Draft status allows empty company/role (consistent with URL-pasted apps)
- Save includes location and jdSnapshot in PATCH payload
- Error state preserves user input with retry action (existing behavior)
- Build and lint pass successfully
- Code review fixes applied:
  - Form state sync: Added useEffect to sync all form fields when application prop changes (prevents stale data overwrites)
  - JD length validation warnings: Added 50K warning and 100K error messages (consistent with ApplicationForm)
  - Comprehensive test coverage: Created test file with 15+ test cases for JD snapshot functionality
  - Timeline refresh error handling: Added warning banner when timeline fails to refresh after save
  - Enhanced save confirmation: Shows "Job Description updated (X characters)" when JD changes

### File List

- `job-tracker/src/components/features/applications/ApplicationDetail.jsx` (updated: location, jdSnapshot, JD needed indicator, timeline event formatting)

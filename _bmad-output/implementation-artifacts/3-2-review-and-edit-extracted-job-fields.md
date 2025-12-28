# Story 3.2: Review and Edit Extracted Job Fields

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to review and edit extracted job fields (company, role title, location, and JD text if present),  
so that I can correct parsing mistakes and ensure downstream steps are based on accurate inputs.

## Acceptance Criteria

1. Given I am signed in and viewing an application created from a URL, when extracted fields are available, then I can edit company, role title, location, and the JD text (if present), and I can save my edits successfully.
2. Given I save edits to job fields, when I refresh or re-login, then the edited values persist, and the UI shows clear saved/loading/error states with actionable retry on failure.
3. Given job fields are partially missing after extraction, when I open the application, then missing fields are clearly indicated, and the UI guides me toward the next recovery step (e.g., “Paste JD” if JD text is missing).

## Tasks / Subtasks

- [x] Prereqs: data model supports extracted fields (migration-first).
  - [x] Ensure `public.applications` includes:
    - `company text not null` and `role text not null` (already present).
    - `source text not null default 'unknown'` (already present via `./job-tracker/supabase/migrations/0005_applications_source.sql`).
    - `jd_snapshot text` (already present via `./job-tracker/supabase/migrations/0004_applications.sql`).
    - `location text` (add if missing; new migration under `./job-tracker/supabase/migrations/`).
  - [x] Keep DB in `snake_case`; map to API/UI `camelCase` at the server boundary. (See `_bmad-output/project-context.md`.)

- [x] Expand applications server repo mapping for `location` (server-only).
  - [x] Update `./job-tracker/src/lib/server/db/applicationsRepo.js`:
    - DB → API: `location` and `jd_snapshot` → `jdSnapshot`.
    - API → DB patch: accept `location` and `jdSnapshot` updates.

- [x] Allow updating extracted fields via API boundary (Route Handler).
  - [x] Update `./job-tracker/src/app/api/applications/[id]/route.js` (`PATCH`):
    - Extend `updateApplicationSchema` to allow:
      - `location: string | null` (optional)
      - `jdSnapshot: string | null` (optional)
    - Do not weaken auth or isolation rules:
      - Still return `UNAUTHORIZED` when no session.
      - Still return `NOT_FOUND` for not found/not owned (no leakage).
    - Logging guardrails (must-follow):
      - Structured JSON only.
      - Do not log raw `jdSnapshot` content (it can be long and sensitive).
  - [x] Status-events / timeline integration (do not leak JD text):
    - Option A (recommended): track `location` changes like other tracked fields.
    - For JD snapshot edits, record only a safe event (e.g., `jd_snapshot_updated` with metadata like `{ fromLength, toLength }`), or do not log an event at all.

- [x] Update UI to support "Review & Edit Extracted Fields" (explicit save + clear states).
  - [x] In the application detail/edit surface (existing pattern: `./job-tracker/src/components/features/applications/ApplicationForm.jsx`):
    - Add `Location` field (text input).
    - Add `Job Description (JD Snapshot)` field (textarea) shown when present, with clear warning about length.
    - Keep "explicit save" behavior (no auto-save) per UX spec.
  - [x] Missing-field indicators + recovery guidance:
    - If `jdSnapshot` is missing/empty: show a clear indicator and a primary CTA "Paste JD" that routes to the manual JD flow (Story 3.3).
    - If other fields are missing (company/role/location): show inline validation and/or a banner prompting completion.
  - [x] Non-blocking UX:
    - Saving shows in-form loading state and preserves user input on error with a direct retry action.

- [x] Minimal test coverage (only what changes).
  - [x] Update/add unit tests for mapping + validation:
    - `applicationsRepo` snake_case ↔ camelCase mapping includes `location` and `jdSnapshot`.
    - Route validation accepts/rejects `location` and `jdSnapshot` correctly without breaking existing schema.
  - [x] If adding a migration, include a brief manual verification note (migration applied; field persists).

## Dev Notes

### Scope

In scope:
- Edit extracted fields on an existing application: `company`, `role`, `location`, and `jdSnapshot` (when present)
- Persist edits with clear loading/success/error states
- Clear “no dead ends” recovery guidance when required fields are missing (especially JD snapshot)

Out of scope:
- Manual JD snapshot paste + storage UX (Story 3.3)
- Duplicate detection (Story 3.4)
- Requirements extraction from JD snapshot (Epic 4)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), ESM only.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary; non-stream endpoints return `{ data, error }`.
- UI must not access Supabase directly for data; DB reads/writes go through Route Handlers + server repos under `src/lib/server/db/**`.
- Do not leak secrets or raw JD text in logs; use structured JSON logs with stable error codes.

### Architecture Notes

From `_bmad-output/architecture.md`:
- JD snapshot storage is a core traceability requirement.
- “No dead ends” recovery is mandatory when parsing/extraction yields incomplete data.
- API boundary + file structure: keep domain DB access under `src/lib/server/db/**`, and UI as client components.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 3 → Story 3.2)
- Related story dependency: `_bmad-output/implementation-artifacts/3-1-paste-job-url-to-create-application-with-source-detection-and-best-effort-extraction.md`
- Architecture constraints + traceability model: `_bmad-output/architecture.md`
- Project-wide implementation rules: `_bmad-output/project-context.md`
- UX patterns (“explicit save”, “no dead ends”, “Paste link” flow): `_bmad-output/project-planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- PATCH endpoint extended to accept location and jdSnapshot fields
- Timeline tracking for location changes (field_changed event)
- Special jd_snapshot_updated event for JD changes (only metadata: fromLength/toLength, no content logged)
- ApplicationForm now includes Location field and JD Snapshot textarea
- Draft status allows empty company/role (for URL-pasted applications)
- Missing fields banner shown when editing with incomplete data
- "Paste Job Description" button available when JD is missing
- JD field shows character count for content awareness
- Build and lint pass successfully
- Code review fixes applied:
  - Comprehensive test coverage: location field mapping tests (create/update operations)
  - Comprehensive test coverage: jdSnapshot field tests (create/update operations)
  - PATCH endpoint validation tests: 15+ test cases for location and jdSnapshot validation
  - Timeline event generation tests: 10+ test cases for field_changed and jd_snapshot_updated events
  - JD length validation: client warning at 50K chars, server limit at 100K chars with error message
  - Timeline field value truncation: 200 char limit on tracked field values (company, role, link, location) to prevent event storage bloat

### File List

- `job-tracker/src/app/api/applications/[id]/route.js` (updated: location/jdSnapshot in schema + timeline + JD length validation + field truncation)
- `job-tracker/src/components/features/applications/ApplicationForm.jsx` (updated: location, jdSnapshot, missing fields banner + JD length warnings)
- `job-tracker/src/lib/server/db/__tests__/applicationsRepo.test.js` (updated: added location and jdSnapshot mapping tests)
- `job-tracker/src/app/api/applications/[id]/__tests__/route.test.js` (created: comprehensive validation and timeline event tests)

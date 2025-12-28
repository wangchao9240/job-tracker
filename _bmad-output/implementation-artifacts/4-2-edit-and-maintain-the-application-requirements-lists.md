# Story 4.2: Edit and Maintain the Application Requirements Lists

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to review and edit the extracted responsibilities and requirements/skills,  
so that the final lists reflect what I believe matters for this application.

## Acceptance Criteria

1. Given I am signed in and viewing extracted lists, when I add, edit, delete, or reorder items in either list and save, then my changes persist across refresh/re-login, and the UI shows clear saved/loading/error states with retry on failure.
2. Given I am editing the lists, when I decide the extraction missed an important requirement, then I can add a new item manually, and the item is treated the same as extracted items downstream.
3. Given I am editing the lists, when I want to reduce noise, then I can delete or consolidate items, and the saved lists reflect the final reduced set.

## Tasks / Subtasks

- [x] Prereqs: define the persisted requirements shape (compatible with existing DB field).
  - [x] Persisted field: `public.applications.extracted_requirements jsonb` (already present).
  - [x] Canonical stored shape (recommendation):
    - `{ responsibilities: string[], requirements: string[], extractedAt: string, updatedAt: string, source: "ai" | "manual" | "mixed" }`
  - [x] Note: Even if originally extracted, once the user edits, the lists are authoritative for downstream mapping.

- [x] Expose extracted requirements in application GET responses (if not already).
  - [x] Confirm `./job-tracker/src/lib/server/db/applicationsRepo.js` maps:
    - DB `extracted_requirements` → API `extractedRequirements`
  - [x] Confirm `GET /api/applications/[id]` returns `extractedRequirements` inside `data`.

- [x] Add endpoint for saving edited lists (API boundary; non-stream).
  - [x] Option A (preferred): reuse `PATCH /api/applications/[id]` to accept `extractedRequirements`.
    - Extend `updateApplicationSchema` in `./job-tracker/src/app/api/applications/[id]/route.js` to allow:
      - `extractedRequirements: object` (validate shape with `zod`)
    - Validate:
      - `responsibilities` and `requirements` are arrays of non-empty strings
      - Enforce max item counts and max string lengths to keep UI and tokens manageable (e.g., ≤ 50 items per list; ≤ 200 chars per item)
    - On save, set `updatedAt` field in the JSONB (UTC ISO-8601).
  - [x] Option B: create a dedicated endpoint `POST /api/requirements/save` (only if Option A becomes messy).
  - [x] Auth + isolation rules:
    - 401 when no session (`UNAUTHORIZED`)
    - 404 for not found/not owned (`NOT_FOUND`)
  - [x] Response envelope `{ data, error }` only; stable error codes; no raw DB errors leaked.

- [x] UI: Editable lists with reordering and explicit save.
  - [x] In the application detail workspace (current pattern: `./job-tracker/src/components/features/applications/ApplicationDetail.jsx`):
    - Add a "Requirements" section below extraction (Story 4.1):
      - Two editable lists: Responsibilities + Requirements/Skills
      - Operations: add item, edit item inline, delete item
      - Reorder (lightweight):
        - Up/Down controls are acceptable (no drag-drop required for MVP)
      - Explicit "Save requirements" action with states: saving/saved/error
      - On save error: keep the user's edits in UI and offer retry
    - If no extracted requirements exist yet:
      - Show empty state with primary CTA "Extract requirements" (Story 4.1) and/or guidance.
  - [x] "Treated the same as extracted":
    - Ensure UI does not visually segregate manual items after save (or, if you track source, it must not affect downstream behavior).

- [x] Guardrails.
  - [x] Do not log list contents (they can contain sensitive JD-derived text); structured JSON logs only.
  - [x] Keep UX "no dead ends": always offer a next action (extract, paste JD, retry save).

- [x] Minimal tests (only what changes).
  - [x] Unit tests for the `zod` schema validating `extractedRequirements`.
  - [x] Minimal Route Handler test to assert:
    - Rejects invalid shapes
    - Accepts valid arrays of strings
    - Preserves `{ data, error }` envelope and auth behavior

## Dev Notes

### Cross-Story Alignment

- Story 4.1 writes `extracted_requirements` initially; this story makes the user-edited list the authoritative version for downstream mapping and generation.
- Keep Story 4.3 (low-signal JD) in mind: it may introduce a “select top responsibilities” step, but it should operate on the same persisted lists.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 4 → Story 4.2)
- Architecture (requirements extraction + later mapping): `_bmad-output/architecture.md` (`extracted_requirements`, `/api/requirements/extract`)
- UX design flow (review/edit extracted requirements): `_bmad-output/project-planning-artifacts/ux-design-specification.md`
- Project-wide rules: `_bmad-output/project-context.md`
- Dependency story: `_bmad-output/implementation-artifacts/4-1-extract-responsibilities-and-requirements-from-jd-snapshot.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (Claude Code CLI)

### Debug Log References

N/A

### Completion Notes List

- Confirmed `extracted_requirements jsonb` column and mapping already exist
- Extended PATCH /api/applications/[id] with zod schema for `extractedRequirements` with validation:
  - Max 50 items per list, max 200 chars per item
  - Automatic `updatedAt` timestamp
  - Automatic `source` field tracking (ai/manual/mixed)
  - Timeline event creation for requirements_updated (tracks counts)
- Updated Story 4.1 extraction endpoint to set `source: "ai"` and `updatedAt`
- Implemented full editable UI in ApplicationDetail.jsx:
  - Click-to-edit inline editing
  - Add/delete items
  - Up/down reorder controls
  - Explicit "Save requirements" button with saving/saved/error states
  - Cancel editing preserves original state
  - Source badge display (AI/Manual/Mixed)
  - AbortController for save requests (prevents race conditions)
  - Timeline refresh after successful save
- Added comprehensive test coverage in route.test.js:
  - 9 test cases for extractedRequirements validation
  - Tests for max length, max items, empty strings, invalid types
  - Tests for source tracking (ai → mixed → manual transitions)
  - Tests for extractedAt preservation and updatedAt updates
- Extended statusEventsRepo.js with requirements_updated event type and validation
- Build and lint pass

### File List

- `_bmad-output/implementation-artifacts/4-2-edit-and-maintain-the-application-requirements-lists.md` (this story file)
- `src/app/api/applications/[id]/route.js` (updated - added extractedRequirements schema, updatedAt/source handling, timeline events)
- `src/app/api/applications/[id]/__tests__/route.test.js` (updated - added 9 test cases for extractedRequirements)
- `src/app/api/requirements/extract/route.js` (updated - added source: "ai" and updatedAt fields)
- `src/components/features/applications/ApplicationDetail.jsx` (updated - full editable requirements UI with AbortController and timeline refresh)
- `src/lib/server/db/statusEventsRepo.js` (updated - added requirements_updated event type and validation)

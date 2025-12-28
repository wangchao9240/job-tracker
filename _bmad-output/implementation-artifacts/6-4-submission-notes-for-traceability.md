# Story 6.4: Submission Notes for Traceability

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to record submission notes (where it was submitted, what version was used, and any notes),  
so that I can later trace what I sent and keep follow-ups consistent.

## Acceptance Criteria

1. Given I am viewing an application, when I add or edit submission notes for a specific submitted cover letter version and save, then the notes persist across refresh/re-login, and they remain scoped to this application.
2. Given I have multiple submitted cover letter versions, when I view the application’s history or “Submitted versions” list, then each submission note is clearly associated with its submitted version (what/when/where), and I can retrieve the exact text that was submitted for that note.

## Tasks / Subtasks

- [x] Decide persistence model for submission notes (version-scoped).
  - [x] Recommended: store notes on the submitted version row in `cover_letter_versions`:
    - Add columns via migration:
      - `submission_where text` (nullable)
      - `submission_notes text` (nullable)
      - `submitted_at timestamptz` (nullable; optional, can use `created_at` as submission time if preferred)
  - [x] Ensure only `kind = "submitted"` rows use these fields (enforced at app layer; DB constraint optional).
  - [x] RLS must remain `user_id = auth.uid()`.

- [x] Extend cover letter versions repo (server-only).
  - [x] Update `./job-tracker/src/lib/server/db/coverLetterVersionsRepo.js`:
    - `updateSubmissionNotes({ supabase, userId, id, patch })` where `patch` includes:
      - `submissionWhere`, `submissionNotes`, optional `submittedAt`
    - Ensure updates apply only to the user's row and do not allow changing `content` for submitted versions (immutability).

- [x] Add API endpoint to update submission notes (non-stream).
  - [x] Create `./job-tracker/src/app/api/cover-letter/submitted/[id]/notes/route.js` (`PATCH`):
    - Auth required (`UNAUTHORIZED`).
    - Validate body with `zod`:
      - `submissionWhere?: string | null`
      - `submissionNotes?: string | null`
      - `submittedAt?: string | null` (ISO-8601; optional)
    - Return `{ data, error }` envelope with the updated submitted version metadata.
    - Errors:
      - 404 `NOT_FOUND` for missing/not owned
      - 400 `VALIDATION_FAILED` for invalid input
  - [x] Logging guardrails:
    - Structured JSON only.
    - Do not log cover letter text or notes content.

- [x] UI: attach notes to a specific submitted version.
  - [x] In "Submitted versions" list (Story 6.3 UI):
    - When a submitted version is selected, show:
      - Where submitted (input)
      - Submission notes (textarea)
      - Save button with saving/saved/error states + retry
    - Ensure the notes shown/edited are for the selected version, not global to the application.

- [x] Minimal tests (only what changes).
  - [x] Repo tests ensure:
    - Notes update does not mutate `content`
    - Updates are user-scoped
  - [x] Route tests cover:
    - `UNAUTHORIZED`
    - `NOT_FOUND`
    - valid patch updates stored fields

## Dev Notes

### Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- Non-stream endpoints must return `{ data, error }`.
- Do not log sensitive content (cover letter text, notes); structured JSON logs only.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 6 → Story 6.4)
- Architecture (versioning + traceability): `_bmad-output/architecture.md`
- Dependency story: `_bmad-output/implementation-artifacts/6-3-save-submitted-cover-letter-version-immutable-versioned.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - All tests passed, build has pre-existing issue in /mapping/proposal (not related to Story 6.4)

### Completion Notes List

- Created database migration (0014_submission_notes.sql) to add submission metadata columns
- Implemented `updateSubmissionNotes` function in coverLetterVersionsRepo.js with immutability protection
- Content field cannot be updated - only submission metadata fields are mutable
- All updates are user-scoped via RLS and explicit userId filtering
- Created PATCH /api/cover-letter/submitted/[id]/notes endpoint with zod validation
- Extended CoverLetterPanel UI with submission notes form (where/notes/submittedAt fields)
- Notes form appears when a submitted version is selected
- Comprehensive test coverage: 8 repo tests + 8 API tests = 16 tests passing
- All validation and error handling implemented per spec

### File List

**Created:**
- `job-tracker/supabase/migrations/0014_submission_notes.sql` - Database migration for submission notes columns
- `job-tracker/src/lib/server/db/__tests__/coverLetterVersionsRepo.updateNotes.test.js` - Repo tests (8 tests)
- `job-tracker/src/app/api/cover-letter/submitted/[id]/notes/route.js` - PATCH API endpoint
- `job-tracker/src/app/api/cover-letter/submitted/[id]/notes/__tests__/route.test.js` - API tests (8 tests)

**Modified:**
- `job-tracker/src/lib/server/db/coverLetterVersionsRepo.js` - Added updateSubmissionNotes function
- `job-tracker/src/components/features/cover-letter/CoverLetterPanel.jsx` - Added submission notes form UI
- `_bmad-output/implementation-artifacts/6-4-submission-notes-for-traceability.md` (this story file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status

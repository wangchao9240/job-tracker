# Story 6.4: Submission Notes for Traceability

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to record submission notes (where it was submitted, what version was used, and any notes),  
so that I can later trace what I sent and keep follow-ups consistent.

## Acceptance Criteria

1. Given I am viewing an application, when I add or edit submission notes for a specific submitted cover letter version and save, then the notes persist across refresh/re-login, and they remain scoped to this application.
2. Given I have multiple submitted cover letter versions, when I view the application’s history or “Submitted versions” list, then each submission note is clearly associated with its submitted version (what/when/where), and I can retrieve the exact text that was submitted for that note.

## Tasks / Subtasks

- [ ] Decide persistence model for submission notes (version-scoped).
  - [ ] Recommended: store notes on the submitted version row in `cover_letter_versions`:
    - Add columns via migration:
      - `submission_where text` (nullable)
      - `submission_notes text` (nullable)
      - `submitted_at timestamptz` (nullable; optional, can use `created_at` as submission time if preferred)
  - [ ] Ensure only `kind = "submitted"` rows use these fields (enforced at app layer; DB constraint optional).
  - [ ] RLS must remain `user_id = auth.uid()`.

- [ ] Extend cover letter versions repo (server-only).
  - [ ] Update `./job-tracker/src/lib/server/db/coverLetterVersionsRepo.js`:
    - `updateSubmissionNotes({ supabase, userId, id, patch })` where `patch` includes:
      - `submissionWhere`, `submissionNotes`, optional `submittedAt`
    - Ensure updates apply only to the user’s row and do not allow changing `content` for submitted versions (immutability).

- [ ] Add API endpoint to update submission notes (non-stream).
  - [ ] Create `./job-tracker/src/app/api/cover-letter/submitted/[id]/notes/route.js` (`PATCH`):
    - Auth required (`UNAUTHORIZED`).
    - Validate body with `zod`:
      - `submissionWhere?: string | null`
      - `submissionNotes?: string | null`
      - `submittedAt?: string | null` (ISO-8601; optional)
    - Return `{ data, error }` envelope with the updated submitted version metadata.
    - Errors:
      - 404 `NOT_FOUND` for missing/not owned
      - 400 `VALIDATION_FAILED` for invalid input
  - [ ] Logging guardrails:
    - Structured JSON only.
    - Do not log cover letter text or notes content.

- [ ] UI: attach notes to a specific submitted version.
  - [ ] In “Submitted versions” list (Story 6.3 UI):
    - When a submitted version is selected, show:
      - Where submitted (input)
      - Submission notes (textarea)
      - Save button with saving/saved/error states + retry
    - Ensure the notes shown/edited are for the selected version, not global to the application.

- [ ] Minimal tests (only what changes).
  - [ ] Repo tests ensure:
    - Notes update does not mutate `content`
    - Updates are user-scoped
  - [ ] Route tests cover:
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

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/6-4-submission-notes-for-traceability.md` (this story file)

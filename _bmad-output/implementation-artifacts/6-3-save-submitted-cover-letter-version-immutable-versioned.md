# Story 6.3: Save Submitted Cover Letter Version (Immutable + Versioned)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to edit a generated draft and save it as a submitted cover letter version for an application,  
so that I can preserve what I actually submitted and retrieve it later for traceability.

## Acceptance Criteria

1. Given I have a latest draft, when I edit the text and save as “Submitted,” then the application creates a new submitted cover letter version with a timestamp, and that submitted version is immutable and retrievable later at any time.
2. Given one or more submitted cover letter versions already exist, when I regenerate a cover letter draft, then the system only replaces the latest draft, and it does not modify or overwrite any submitted versions.
3. Given I have already submitted once and want to submit a revised letter later, when I save another “Submitted” version, then the system creates an additional submitted version (version history is preserved), and the UI can show the most recent submitted version by default while keeping access to older versions.
4. Given saving a submitted version fails, when the error occurs, then I see an actionable error and can retry, and my edited content is preserved in the UI (no re-entry required).

## Tasks / Subtasks

- [ ] Confirm persistence model for cover letter versions supports “draft” + “submitted”.
  - [ ] Use `cover_letter_versions` table (from Story 6.1) and represent:
    - `kind: "draft" | "submitted"`
    - `content: text`
    - `created_at` timestamp
  - [ ] Draft rules:
    - Only one latest draft is active at a time (replace on regenerate).
  - [ ] Submitted rules:
    - Every “Submitted” save creates a new row (immutable history).
    - Regeneration must never change submitted rows.

- [ ] Add repo methods for submitted versions (server-only).
  - [ ] Extend `./job-tracker/src/lib/server/db/coverLetterVersionsRepo.js`:
    - `createSubmittedVersion({ supabase, userId, applicationId, content })` (insert new row)
    - `listSubmittedVersions({ supabase, userId, applicationId })` (ordered newest first)
    - `getMostRecentSubmitted({ supabase, userId, applicationId })`
  - [ ] Ensure all queries are user-scoped (`user_id`) and rely on RLS.

- [ ] Add API endpoints to save and list submitted versions (API boundary).
  - [ ] Create `./job-tracker/src/app/api/cover-letter/submitted/route.js`:
    - `GET`: list submitted versions for `applicationId` query param (required).
    - `POST`: create a submitted version:
      - Body: `{ applicationId: string, content: string }` (validate with `zod`)
      - Auth-required (`UNAUTHORIZED`).
      - Insert new submitted version row and return it.
      - Return `{ data, error }` envelope.
  - [ ] Optional (if needed for detail view): `GET /api/cover-letter/submitted/[id]` (only if you don’t want to return full content in the list).
  - [ ] Logging guardrails:
    - Structured JSON only.
    - Do not log cover letter content (it is user-generated and sensitive).

- [ ] UI: edit draft → save as submitted + view submitted history.
  - [ ] In the cover letter section:
    - Show the latest draft content (from generation).
    - Allow edits (client-side textarea editor).
    - “Save as Submitted” button:
      - Calls `POST /api/cover-letter/submitted`
      - On success: show confirmation and set the most recent submitted as the default display.
      - On failure: keep edited text in the editor and show retry.
    - “Submitted versions” list:
      - Show timestamps and allow selecting older versions to view (read-only).
  - [ ] Ensure regenerate still only affects the draft:
    - Regeneration continues to use `POST /api/cover-letter/stream` and replaces only latest draft.

- [ ] Minimal tests (only what changes).
  - [ ] Repo tests: submitted insertion does not overwrite; list ordering newest-first.
  - [ ] API tests:
    - `UNAUTHORIZED` behavior
    - `POST` creates submitted version
    - `GET` returns submitted versions for applicationId
  - [ ] Mock Supabase and avoid network.

## Dev Notes

### Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- Do not log full content; structured JSON logs only.
- Non-stream endpoints must return `{ data, error }`.
- Regeneration uses canonical streaming endpoint only (`POST /api/cover-letter/stream`).

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 6 → Story 6.3)
- Architecture (versioning model + streaming): `_bmad-output/architecture.md`
- Dependency story: `_bmad-output/implementation-artifacts/6-1-generate-cover-letter-draft-from-confirmed-mapping.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/6-3-save-submitted-cover-letter-version-immutable-versioned.md` (this story file)

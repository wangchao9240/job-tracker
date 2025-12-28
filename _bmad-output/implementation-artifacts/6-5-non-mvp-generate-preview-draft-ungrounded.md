# Story 6.5: (Non-MVP) Generate Preview Draft (Ungrounded)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to generate a clearly-labeled preview cover letter draft without confirming evidence mapping,  
so that I can quickly sanity-check tone/structure while still treating the evidence-grounded draft as the true submission baseline.

## Acceptance Criteria

1. Given an application has a saved JD snapshot, when I request “Generate preview draft,” then the system generates a draft and stores it as the latest draft, and the UI labels it clearly as “Preview (Ungrounded)” with a warning that it is not evidence-confirmed.
2. Given I have a preview draft, when I later confirm mapping and generate an evidence-grounded draft, then the evidence-grounded draft replaces the latest draft, and any previously submitted versions remain unchanged.
3. Given generation of a preview draft fails, when the error occurs, then I see an actionable error and can retry, and my underlying application data (JD snapshot, requirements, mapping, submitted versions) remains intact.

## Tasks / Subtasks

- [x] Decide how to represent "preview" vs "grounded draft" in persistence.
  - [x] Use `cover_letter_versions.kind` to distinguish:
    - `draft` (grounded)
    - `preview` (ungrounded)
    - `submitted` (immutable)
  - [x] Latest draft semantics:
    - There is one "latest" among `draft|preview` per application (preview can be replaced by grounded draft later).
    - Submitted versions are never overwritten.

- [x] Extend canonical streaming endpoint to support preview generation.
  - [x] Keep using `POST /api/cover-letter/stream` (canonical).
  - [x] Accept request body:
    - `applicationId: string`
    - `mode: "grounded" | "preview"` (default `grounded`)
  - [x] Behavior for `mode="preview"`:
    - Require only `jdSnapshot`; do not require `confirmedMapping`.
    - Prompt must include a warning instruction to avoid inventing claims and to keep content generic where evidence is missing.
    - Persist as `kind = "preview"` and mark as latest.
  - [x] Behavior for `mode="grounded"` remains the same as Story 6.1 (requires `confirmedMapping`).
  - [x] Streaming protocol unchanged: `delta`, `done`, `error`.

- [x] UI: "Preview (Ungrounded)" experience.
  - [x] In cover letter section:
    - Add "Generate preview draft" CTA when JD snapshot exists (even if mapping not confirmed).
    - Display a persistent warning banner for preview drafts.
    - When a grounded draft is generated later, the warning disappears and the latest content is replaced.

- [x] Minimal tests (only what changes).
  - [x] Streaming endpoint test:
    - `mode="preview"` works with JD only
    - `mode="grounded"` still requires confirmed mapping
  - [x] Repo/persistence test: preview and grounded obey latest semantics; submitted unaffected.

## Dev Notes

Non-MVP: implement only after grounded generation (6.1) is stable; do not let preview undermine mapping-first discipline.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 6 → Story 6.5)
- Project rules (canonical streaming endpoint, event types): `_bmad-output/project-context.md`
- Dependency story: `_bmad-output/implementation-artifacts/6-1-generate-cover-letter-draft-from-confirmed-mapping.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - All tests passed on first run after fixing UUIDs

### Completion Notes List

- Created database migration (0015_preview_draft_kind.sql) to add 'preview' kind value
- Updated CHECK constraint to allow 'draft', 'preview', 'submitted' values
- Implemented shared latest semantics using two partial unique indexes:
  - `idx_cover_letter_versions_latest_draft_or_preview`: ensures only one latest among draft OR preview
  - `idx_cover_letter_versions_latest_submitted`: separate latest tracking for submitted versions
- Added `createPreviewVersion()` function to coverLetterVersionsRepo.js
- Updated `createDraftVersion()` to mark both draft AND preview as not latest (shared semantics)
- Extended streaming endpoint `/api/cover-letter/stream` with mode parameter
- Added two prompt building functions: `buildGroundedPrompt()` and `buildPreviewPrompt()`
- Preview prompt includes strong warnings against inventing claims and keeping content generic
- Conditional validation: preview mode requires only JD, grounded mode requires confirmed mapping
- Updated UI with "Generate preview draft" button (appears when JD exists but no mapping)
- Added warning banner for preview drafts with explanation and CTA to generate grounded draft
- Updated draft title to show "Preview Draft (Ungrounded)" vs "Latest Draft (Editable)"
- Comprehensive test coverage: 2 repo tests + 6 API tests = 8 tests passing
- All tests use mocks (not integration tests) following existing patterns from Story 6.4

### File List

**Created:**
- `job-tracker/supabase/migrations/0015_preview_draft_kind.sql` - Database migration for preview kind
- `job-tracker/src/lib/server/db/__tests__/coverLetterVersionsRepo.createPreview.test.js` - Repo tests (2 tests)
- `job-tracker/src/app/api/cover-letter/stream/__tests__/route.mode.test.js` - API tests (6 tests)

**Modified:**
- `job-tracker/src/lib/server/db/coverLetterVersionsRepo.js` - Added createPreviewVersion function
- `job-tracker/src/app/api/cover-letter/stream/route.js` - Added mode parameter, buildPreviewPrompt, conditional logic
- `job-tracker/src/components/features/cover-letter/CoverLetterPanel.jsx` - Added preview UI, warning banner, dual buttons
- `_bmad-output/implementation-artifacts/6-5-non-mvp-generate-preview-draft-ungrounded.md` (this story file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status

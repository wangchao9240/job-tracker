# Story 6.2: Iterate Draft Generation with User Constraints (Tone/Emphasis/Keywords)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to iterate on cover letter generation with additional constraints (tone, emphasis, keywords),  
so that I can tailor the output to the specific role and my preferences.

## Acceptance Criteria

1. Given an application has a confirmed mapping and JD snapshot, when I provide iteration constraints (tone/emphasis/keywords to include/avoid) and regenerate, then the system uses those constraints for the new generation, and the resulting output replaces the latest draft.
2. Given I change constraints and regenerate multiple times, when each generation completes, then only the latest draft is retained as the stored draft, and the system does not require me to re-enter unchanged inputs between retries.

## Tasks / Subtasks

- [x] Define iteration constraints model (client + server contract).
  - [x] Constraints object (API/UI, camelCase):
    - `tone: string | null` (e.g., `professional`, `friendly`, `confident`)
    - `emphasis: string | null` (short free-text guidance)
    - `keywordsInclude: string[]` (optional)
    - `keywordsAvoid: string[]` (optional)
  - [x] Validation (zod):
    - Trim strings, drop empty keywords, cap counts (e.g., ≤ 20 each) and lengths (e.g., ≤ 40 chars per keyword).

- [x] Extend canonical streaming endpoint to accept constraints.
  - [x] Update `POST /api/cover-letter/stream` (`./job-tracker/src/app/api/cover-letter/stream/route.js`):
    - Accept request body:
      - `applicationId: string`
      - `constraints?: { tone?, emphasis?, keywordsInclude?, keywordsAvoid? }`
    - Apply constraints in prompt construction (server-only).
    - Maintain streaming protocol events: `delta`, `done`, `error` only.
    - Persist final output to `cover_letter_versions` on `done` (latest-draft semantics unchanged).

- [x] Keep "no re-entry required" behavior.
  - [x] Client UI stores the last-used constraints per application (UI-only state) so the user can regenerate without retyping.
  - [x] On retry after error, keep both:
    - partial draft text (if any)
    - the constraint inputs

- [x] UI: constraint inputs + regenerate flow.
  - [x] In the cover letter area:
    - Inputs for tone, emphasis, keywords include/avoid (simple chips or comma-separated).
    - "Regenerate draft" CTA that calls the same streaming endpoint with constraints.
    - Ensure navigation doesn't break streaming; keep progress visible.

- [x] Minimal tests (only what changes).
  - [x] Unit tests for constraints normalization/validation.
  - [x] Streaming endpoint test asserts:
    - accepts constraints payload
    - still emits `delta` then terminal `done` (mock `fetch`)

## Dev Notes

### Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- Canonical streaming endpoint: `POST /api/cover-letter/stream`.
- Stream events must be `delta`, `done`, `error`.
- Persist final output to `cover_letter_versions` on `done`.
- Outbound AI calls use server-side `fetch` only (no vendor SDK), never from the browser.
- Do not log the JD text or full prompt; structured JSON logs only.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 6 → Story 6.2)
- Architecture + streaming rules: `_bmad-output/architecture.md`, `_bmad-output/project-context.md`
- Dependency story: `_bmad-output/implementation-artifacts/6-1-generate-cover-letter-draft-from-confirmed-mapping.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Build completed successfully with no errors

### Completion Notes List

- Created `constraintsSchema` with zod validation (trim, filter empty, enforce length limits)
- Extended `/api/cover-letter/stream` to accept optional `constraints` parameter
- Updated `buildCoverLetterPrompt` to apply constraints (tone, emphasis, keywords include/avoid)
- Backward compatible: endpoint works with and without constraints
- Added UI inputs for constraints in CoverLetterPanel (tone, emphasis, keywordsInclude, keywordsAvoid)
- Implemented "no re-entry required" behavior: constraints persist in component state across retries
- Constraints are comma-separated for keywords, with automatic trimming and filtering
- All constraints are optional - generation works with any combination of fields
- Comprehensive test coverage for constraints validation (15 tests passing)
- Updated streaming endpoint documentation tests with constraints scenarios
- Build verified successfully - streaming protocol unchanged (delta/done/error events)

### File List

**Created:**
- `src/app/api/cover-letter/stream/schemas.js` - Zod schemas for constraints validation
- `src/app/api/cover-letter/stream/__tests__/constraints.test.js` - Unit tests for constraints validation

**Modified:**
- `src/app/api/cover-letter/stream/route.js` - Extended to accept and apply constraints
- `src/app/api/cover-letter/stream/__tests__/route.test.js` - Added constraints documentation tests
- `src/components/features/cover-letter/CoverLetterPanel.jsx` - Added constraints input UI
- `_bmad-output/implementation-artifacts/6-2-iterate-draft-generation-with-user-constraints-tone-emphasis-keywords.md` (this story file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status to review

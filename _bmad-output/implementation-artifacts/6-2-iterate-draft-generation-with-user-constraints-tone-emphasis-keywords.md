# Story 6.2: Iterate Draft Generation with User Constraints (Tone/Emphasis/Keywords)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to iterate on cover letter generation with additional constraints (tone, emphasis, keywords),  
so that I can tailor the output to the specific role and my preferences.

## Acceptance Criteria

1. Given an application has a confirmed mapping and JD snapshot, when I provide iteration constraints (tone/emphasis/keywords to include/avoid) and regenerate, then the system uses those constraints for the new generation, and the resulting output replaces the latest draft.
2. Given I change constraints and regenerate multiple times, when each generation completes, then only the latest draft is retained as the stored draft, and the system does not require me to re-enter unchanged inputs between retries.

## Tasks / Subtasks

- [ ] Define iteration constraints model (client + server contract).
  - [ ] Constraints object (API/UI, camelCase):
    - `tone: string | null` (e.g., `professional`, `friendly`, `confident`)
    - `emphasis: string | null` (short free-text guidance)
    - `keywordsInclude: string[]` (optional)
    - `keywordsAvoid: string[]` (optional)
  - [ ] Validation (zod):
    - Trim strings, drop empty keywords, cap counts (e.g., ≤ 20 each) and lengths (e.g., ≤ 40 chars per keyword).

- [ ] Extend canonical streaming endpoint to accept constraints.
  - [ ] Update `POST /api/cover-letter/stream` (`./job-tracker/src/app/api/cover-letter/stream/route.js`):
    - Accept request body:
      - `applicationId: string`
      - `constraints?: { tone?, emphasis?, keywordsInclude?, keywordsAvoid? }`
    - Apply constraints in prompt construction (server-only).
    - Maintain streaming protocol events: `delta`, `done`, `error` only.
    - Persist final output to `cover_letter_versions` on `done` (latest-draft semantics unchanged).

- [ ] Keep “no re-entry required” behavior.
  - [ ] Client UI stores the last-used constraints per application (UI-only state) so the user can regenerate without retyping.
  - [ ] On retry after error, keep both:
    - partial draft text (if any)
    - the constraint inputs

- [ ] UI: constraint inputs + regenerate flow.
  - [ ] In the cover letter area:
    - Inputs for tone, emphasis, keywords include/avoid (simple chips or comma-separated).
    - “Regenerate draft” CTA that calls the same streaming endpoint with constraints.
    - Ensure navigation doesn’t break streaming; keep progress visible.

- [ ] Minimal tests (only what changes).
  - [ ] Unit tests for constraints normalization/validation.
  - [ ] Streaming endpoint test asserts:
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

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/6-2-iterate-draft-generation-with-user-constraints-tone-emphasis-keywords.md` (this story file)

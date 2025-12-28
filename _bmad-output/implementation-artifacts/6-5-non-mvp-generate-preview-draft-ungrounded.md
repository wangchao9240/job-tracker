# Story 6.5: (Non-MVP) Generate Preview Draft (Ungrounded)

Status: ready-for-dev

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

- [ ] Decide how to represent “preview” vs “grounded draft” in persistence.
  - [ ] Use `cover_letter_versions.kind` to distinguish:
    - `draft` (grounded)
    - `preview` (ungrounded)
    - `submitted` (immutable)
  - [ ] Latest draft semantics:
    - There is one “latest” among `draft|preview` per application (preview can be replaced by grounded draft later).
    - Submitted versions are never overwritten.

- [ ] Extend canonical streaming endpoint to support preview generation.
  - [ ] Keep using `POST /api/cover-letter/stream` (canonical).
  - [ ] Accept request body:
    - `applicationId: string`
    - `mode: "grounded" | "preview"` (default `grounded`)
  - [ ] Behavior for `mode="preview"`:
    - Require only `jdSnapshot`; do not require `confirmedMapping`.
    - Prompt must include a warning instruction to avoid inventing claims and to keep content generic where evidence is missing.
    - Persist as `kind = "preview"` and mark as latest.
  - [ ] Behavior for `mode="grounded"` remains the same as Story 6.1 (requires `confirmedMapping`).
  - [ ] Streaming protocol unchanged: `delta`, `done`, `error`.

- [ ] UI: “Preview (Ungrounded)” experience.
  - [ ] In cover letter section:
    - Add “Generate preview draft” CTA when JD snapshot exists (even if mapping not confirmed).
    - Display a persistent warning banner for preview drafts.
    - When a grounded draft is generated later, the warning disappears and the latest content is replaced.

- [ ] Minimal tests (only what changes).
  - [ ] Streaming endpoint test:
    - `mode="preview"` works with JD only
    - `mode="grounded"` still requires confirmed mapping
  - [ ] Repo/persistence test: preview and grounded obey latest semantics; submitted unaffected.

## Dev Notes

Non-MVP: implement only after grounded generation (6.1) is stable; do not let preview undermine mapping-first discipline.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 6 → Story 6.5)
- Project rules (canonical streaming endpoint, event types): `_bmad-output/project-context.md`
- Dependency story: `_bmad-output/implementation-artifacts/6-1-generate-cover-letter-draft-from-confirmed-mapping.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/6-5-non-mvp-generate-preview-draft-ungrounded.md` (this story file)

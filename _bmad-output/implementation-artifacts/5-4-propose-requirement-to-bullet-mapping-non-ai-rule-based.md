# Story 5.4: Propose Requirement-to-Bullet Mapping (Non-AI, Rule-Based)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want the system to propose a mapping from application requirements/responsibilities to my project bullets,  
so that I start mapping from a helpful draft rather than from scratch.

## Acceptance Criteria

1. Given an application has saved responsibilities and requirements/skills, when I request a mapping proposal, then the system produces a candidate mapping for each item (or marks it as having no strong matches), and the proposal is generated without calling an AI provider (rule/keyword based).
2. Given a mapping proposal is generated, when I view it, then I can see suggested bullet(s) per requirement/responsibility item, and I can proceed to adjust it in the mapping workbench.
3. Given proposal generation fails, when the error occurs, then I see an actionable error and can retry, and the application’s requirements lists remain unchanged.

## Tasks / Subtasks

- [ ] Prereqs: confirm required inputs exist.
  - [ ] Application must have saved requirements:
    - `extracted_requirements` present with `responsibilities` and `requirements` arrays (from Epic 4).
  - [ ] User must have evidence bullets:
    - `project_bullets` exist (Epic 5.2).

- [ ] Define the proposal algorithm (non-AI; deterministic).
  - [ ] Create `./job-tracker/src/lib/server/mapping/proposeRuleBased.js`:
    - Inputs:
      - `items: { kind: "responsibility"|"requirement", text: string }[]`
      - `bullets: { id: string, text: string, title?: string|null, tags?: string[]|null, impact?: string|null }[]`
    - Output:
      - `proposal: { itemKey: string, kind, text, suggestedBulletIds: string[], scoreByBulletId: Record<string, number> }[]`
      - “No strong matches” means `suggestedBulletIds: []`
  - [ ] MVP scoring heuristics (simple, explainable):
    - Normalize text (lowercase, strip punctuation, collapse whitespace).
    - Tokenize on whitespace; remove a small stopword list.
    - Score by:
      - keyword overlap count (item ↔ bullet text/title/tags/impact)
      - bonus for tag exact match
    - Select top N (e.g., up to 3) above a minimum threshold.
  - [ ] Must not call any AI provider; no network.

- [ ] Add mapping proposal endpoint (Route Handler).
  - [ ] Create `./job-tracker/src/app/api/mapping/propose/route.js` (`POST`) as defined in `_bmad-output/architecture.md`.
  - [ ] Request body (validate with `zod`):
    - `applicationId: string`
  - [ ] Auth-required:
    - 401 on no session (`UNAUTHORIZED`)
  - [ ] Steps:
    1) Load application by id (must be owned; 404 if not found/not owned).
    2) Validate requirements exist; if missing: 400 + `{ code: "REQUIREMENTS_REQUIRED" }`.
    3) Load user bullets (across all projects for MVP) via server repo; if none: 400 + `{ code: "BULLETS_REQUIRED" }`.
    4) Run rule-based proposer to generate candidate mapping.
    5) Return `{ data, error }` with:
       - `proposal` array as described above
       - `generatedAt` (UTC ISO-8601)
  - [ ] Failure handling:
    - Do not modify application requirements lists on failure.
    - Return HTTP 500 + `{ code: "PROPOSE_FAILED" }` on unexpected errors.
  - [ ] Logging:
    - Structured JSON only; do not log full requirements/bullets text.

- [ ] UI: show proposed mapping (read-only preview for this story).
  - [ ] In the mapping area (can be a new panel under `./job-tracker/src/components/features/mapping/**`):
    - A “Propose mapping” CTA (disabled until requirements and bullets exist).
    - Display each item (responsibility/requirement) with:
      - suggested bullet(s) (text preview)
      - “no match” state
    - Include “Proceed to adjust” navigation stub (Story 5.5 will implement full workbench).
    - Retry on error; keep previous proposal visible if a retry fails.

- [ ] Minimal tests (only what changes).
  - [ ] Unit tests for `proposeRuleBased.js`:
    - overlap scoring yields expected ordering
    - tag bonus influences results
    - no matches when below threshold
  - [ ] Route tests:
    - `UNAUTHORIZED`
    - `REQUIREMENTS_REQUIRED` and `BULLETS_REQUIRED`
    - success envelope and deterministic output shape

## Dev Notes

### Scope

In scope:
- Deterministic, non-AI mapping proposal for responsibilities/requirements → bullet IDs
- Endpoint + minimal UI preview

Out of scope:
- Full mapping workbench editing + confirmation persistence (Story 5.5)
- AI-assisted proposal (explicitly not allowed here)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), ESM only.
- Route Handlers are the API boundary; non-stream endpoints return `{ data, error }`.
- No network calls in tests; do not call AI providers here.
- Do not log sensitive content; structured JSON logs only.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 5 → Story 5.4)
- Architecture (mapping propose endpoint): `_bmad-output/architecture.md` (`src/app/api/mapping/propose/route.js`, `confirmed_mapping` field later)
- UX mapping flow: `_bmad-output/project-planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/5-4-propose-requirement-to-bullet-mapping-non-ai-rule-based.md` (this story file)

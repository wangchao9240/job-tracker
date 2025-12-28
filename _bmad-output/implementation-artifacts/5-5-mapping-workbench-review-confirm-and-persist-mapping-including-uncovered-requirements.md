# Story 5.5: Mapping Workbench — Review, Confirm, and Persist Mapping (Including Uncovered Requirements)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to review and confirm the requirement → evidence mapping before cover letter generation,  
so that I can ensure every requirement is grounded (or explicitly uncovered) and the system saves a reliable mapping state.

## Acceptance Criteria

1. Given I have an application with extracted requirements and a mapping proposal, when I open the mapping workbench, then I can review each requirement/responsibility item with its suggested bullet(s), and I can add/remove/replace selected bullets per item.
2. Given an item has no suitable evidence, when I mark it as uncovered, then the UI clearly shows it as uncovered, and I can later resolve it by adding a new bullet or selecting alternative evidence.
3. Given I confirm the mapping, when I save/confirm, then the confirmed mapping is persisted on the application, and I can revisit the application later and retrieve the confirmed mapping.
4. Given I have a confirmed mapping, when I update it and reconfirm, then the latest confirmed mapping replaces the previous version, and no partial/inconsistent state is saved on failure (retry is supported without losing edits).

## Tasks / Subtasks

- [x] Prereqs: ensure persistence fields exist (migration-first).
  - [x] Confirm `public.applications.confirmed_mapping jsonb` exists (created in `./job-tracker/supabase/migrations/0004_applications.sql`).
  - [x] Confirm `public.applications.extracted_requirements jsonb` exists and contains the authoritative lists (Epic 4).

- [x] Define a canonical confirmed-mapping shape (stable, explicit).
  - [x] Store in `confirmed_mapping` JSONB as:
    - `{ version: 1, confirmedAt: string, items: Array<{ itemKey: string, kind: "responsibility"|"requirement", text: string, bulletIds: string[], uncovered: boolean }> }`
  - [x] Notes:
    - `itemKey` should be stable across retries (e.g., `responsibility:3` or a hash of normalized text).
    - `uncovered: true` must be allowed even when `bulletIds` is empty.
    - Treat user-edited requirements text as authoritative (from Story 4.2), and store the `text` snapshot in the mapping to avoid drift.

- [x] Add API support to save/retrieve confirmed mapping (API boundary; atomic update).
  - [x] Retrieval:
    - Ensure `GET /api/applications/[id]` returns `confirmedMapping` (DB `confirmed_mapping` → API `confirmedMapping`) via `applicationsRepo.js`.
  - [x] Save:
    - Option A (preferred): reuse `PATCH /api/applications/[id]` to accept `confirmedMapping`.
      - Extend the existing `updateApplicationSchema` to include a `confirmedMapping` object validated by `zod` (full-shape validation).
      - On save:
        - Write `confirmed_mapping` in a single update (atomic).
        - Return updated application in `{ data, error }` envelope.
      - Error behavior:
        - 400 `VALIDATION_FAILED` for invalid shape (do not write partial state).
        - 404 `NOT_FOUND` for not found/not owned.
        - 401 `UNAUTHORIZED` when no session.
    - Option B: add `POST /api/mapping/confirm` (only if Option A becomes too coupled).
  - [x] Logging guardrails:
    - Structured JSON only.
    - Do not log full requirement text or bullet text; log counts/ids only.

- [x] Add mapping workbench UI (MVP version: review + edit + confirm).
  - [x] Create `./job-tracker/src/components/features/mapping/MappingWorkbench.jsx` (or similar) and integrate it into the application detail workspace.
  - [x] UI requirements:
    - For each item (responsibility/requirement):
      - Show item text.
      - Show suggested bullets (from Story 5.4 proposal) with quick "Add" controls.
      - Show selected bullets with "Remove/Replace".
      - Show an "Uncovered" toggle; when on, visually highlight the item.
    - Confirm flow:
      - "Confirm mapping" button saves `confirmedMapping`.
      - Clear states: saving/saved/error with retry.
      - On failure: keep all unsaved edits in UI (no loss) and allow retry.
    - Recovery:
      - If requirements missing: show a blocking explanation + direct "Extract requirements" action.
      - If bullets missing: show a blocking explanation + direct "Create bullets" action.
  - [x] Keep scope tight:
    - Reordering items is optional.
    - Multi-select polish can wait; ensure it's usable with simple controls.

- [x] Ensure uncovered requirements are first-class.
  - [x] Persist uncovered items explicitly (`uncovered: true`) so downstream generation can:
    - Warn the user about uncovered gaps
    - Avoid fabricating evidence for those items

- [x] Minimal tests (only what changes).
  - [x] Unit tests for the confirmedMapping `zod` schema (valid/invalid cases).
  - [x] Minimal Route Handler test:
    - Accepts a valid `confirmedMapping` and returns it on subsequent GET.
    - Rejects invalid mapping shapes without partial writes.

## Dev Notes

### Scope

In scope:
- UI workbench to review/edit/confirm mapping
- Persist confirmed mapping on the application (replace on reconfirm)
- Uncovered marking as explicit, persisted state

Out of scope:
- Cover letter generation (Epic 6)
- AI-assisted mapping proposal (Story 5.4 is explicitly non-AI)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), ESM only.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary; non-stream endpoints return `{ data, error }`.
- UI must not access Supabase directly for data; DB reads/writes go through Route Handlers + server repos under `src/lib/server/db/**`.
- Do not log secrets or full user/job content; structured JSON logs only.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 5 → Story 5.5)
- Architecture (confirmed_mapping field + API layout): `_bmad-output/architecture.md`
- UX workbench anatomy: `_bmad-output/project-planning-artifacts/ux-design-specification.md` (requirements list + selected bullets + uncovered indicator + confirm action)
- Dependency stories: `_bmad-output/implementation-artifacts/5-2-create-and-manage-project-bullets-evidence-items.md`, `_bmad-output/implementation-artifacts/5-4-propose-requirement-to-bullet-mapping-non-ai-rule-based.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

- Build error: Missing Checkbox component from shadcn/ui → Fixed by using native HTML checkbox input

### Completion Notes List

- Defined canonical confirmedMapping schema (version 1) with Zod validation
- Extended PATCH /api/applications/[id] to accept confirmedMapping with atomic updates
- Created comprehensive MappingWorkbench component with full CRUD for mapping items
- Implemented uncovered marking as first-class concept with visual highlighting
- Added Route Handler tests covering confirmedMapping PATCH + subsequent GET
- Fixed Zod v4 test assertions (`error.issues` vs `error.errors`)
- Fixed Checkbox component error by using native HTML input with Tailwind styling
- Integrated Mapping Workbench into Application Detail workspace (toggle to open)
- Improved workbench recovery UX (missing requirements/bullets, retry routing)
- Tests passed (Node 22 via `.nvmrc`): confirmedMapping schema + route handler tests

### File List

**Created:**
- `job-tracker/src/components/features/mapping/MappingWorkbench.jsx` - Full interactive workbench for mapping review/edit/confirm
- `job-tracker/src/app/api/applications/__tests__/confirmedMapping.test.js` - Schema validation tests
- `job-tracker/src/app/api/applications/[id]/__tests__/confirmedMapping.route.test.js` - Route handler tests for confirmedMapping

**Modified:**
- `job-tracker/src/app/api/applications/[id]/route.js` - Added confirmedMapping schemas to updateApplicationSchema
- `job-tracker/src/components/features/applications/ApplicationDetail.jsx` - Embed Mapping Workbench (toggle open)
- `job-tracker/src/components/features/applications/__tests__/ApplicationDetail.jdSnapshot.test.jsx` - Test assertions updated for current copy
- `job-tracker/src/lib/server/mapping/proposeRuleBased.js` - itemKey generation aligned for workbench matching
- `_bmad-output/implementation-artifacts/5-5-mapping-workbench-review-confirm-and-persist-mapping-including-uncovered-requirements.md` (this story file)

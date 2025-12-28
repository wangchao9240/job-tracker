# Story 5.3: Tagging, Search, and Filtering for Bullets

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to tag bullets and search/filter them,  
so that I can find relevant evidence quickly during mapping.

## Acceptance Criteria

1. Given I am signed in and bullets exist, when I add or remove free-form string tags on a bullet and save, then the tags persist across refresh/re-login, and tags remain private to my account (user-scoped).
2. Given I am signed in, when I search bullets by text (and optionally by tag), then results update predictably, and I can clear search/filters to return to the full set.
3. Given I filter by a tag, when multiple bullets match, then I see only bullets with that tag, and I can combine tag + text search without breaking the UI.

## Tasks / Subtasks

- [ ] Prereqs: ensure bullets support tags (DB + API mapping).
  - [ ] Confirm `project_bullets.tags text[]` exists from Story 5.2; if not, add a migration under `./job-tracker/supabase/migrations/`.
  - [ ] Add (or confirm) an index suitable for tag filtering:
    - GIN index on `tags` (recommended once tag filtering is real).
    - Keep it user-scoped in queries (`user_id`) and rely on RLS.

- [ ] Add/confirm tag editing support on the bullet edit flow (explicit save).
  - [ ] Ensure `PATCH /api/project-bullets/[id]` accepts `tags` as an optional array of strings.
  - [ ] Validation rules (zod):
    - Tags are free-form strings but must be:
      - trimmed
      - non-empty after trim
      - reasonably short (e.g., ≤ 30 chars)
    - Normalize storage:
      - lower-case recommended for consistent filtering
      - de-duplicate tags
      - cap tag count per bullet (e.g., ≤ 20)

- [ ] Implement bullet search + filter API (predictable, composable).
  - [ ] Extend `GET /api/project-bullets` to support query params:
    - `projectId` (optional: when present, limit to one project; when absent, search across all projects)
    - `q` (optional: text search across `text`, `title`, `impact`)
    - `tag` (optional: single tag filter; exact match against normalized tags)
  - [ ] Query behavior:
    - Always scope by `user_id` (no leakage).
    - Combine filters with AND semantics (`projectId` + `tag` + `q`).
    - Stable ordering: default `updated_at desc`.
  - [ ] Response envelope `{ data, error }` only; stable error codes.
  - [ ] Logging guardrails:
    - Structured JSON only.
    - Do not log full bullet text (keep logs minimal; log counts/ids only).

- [ ] Add server repo filtering (server-only).
  - [ ] Extend `./job-tracker/src/lib/server/db/projectBulletsRepo.js` (Story 5.2) to support:
    - `listProjectBullets({ supabase, userId, projectId, q, tag })`
    - Internally:
      - `.eq("user_id", userId)`
      - optional `.eq("project_id", projectId)`
      - optional tag filter (for `text[]`):
        - use Postgres array operator (e.g., `tags cs {tag}` or `tags @> ARRAY[tag]`)
      - optional `ilike` search across fields (acceptable for MVP; revisit with FTS later).

- [ ] UI: tag editing + search/filter controls (minimal, mapping-friendly).
  - [ ] In the bullets panel (Story 5.2 UI), add:
    - Tag editor for a bullet:
      - simple comma-separated input that writes `tags: string[]`
      - show tags as small chips after save
    - Search input (debounced) + tag filter dropdown or token input
    - Clear filters action
    - Ensure results update predictably (no flicker; stable ordering).
  - [ ] Keep interactions non-blocking:
    - Show loading indicator during fetch
    - Preserve previous results on transient errors; show retry

- [ ] Minimal tests (only what changes).
  - [ ] Repo tests for filter composition:
    - tag-only filter
    - text-only filter
    - tag + text combined
  - [ ] Route validation tests for query params and normalization (tag trimming/lower-casing).

## Dev Notes

### Scope

In scope:
- Add/remove tags on bullets (persisted; user-scoped)
- Search by text and filter by tag (composable; predictable; clearable)

Out of scope:
- Advanced ranking (FTS), multi-tag boolean queries, synonyms
- Mapping UI itself (Stories 5.4+)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), ESM only.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary; non-stream endpoints return `{ data, error }`.
- UI must not access Supabase directly for data; DB reads/writes go through Route Handlers + server repos under `src/lib/server/db/**`.
- RLS is mandatory; keep all bullet queries user-scoped.
- Logging: structured JSON only; do not log secrets or full content.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 5 → Story 5.3)
- Architecture (API/DB mapping): `_bmad-output/architecture.md` (`project_bullets`, `src/app/api/project-bullets/**`)
- UX direction (mapping-first, evidence discoverability): `_bmad-output/project-planning-artifacts/ux-design-specification.md`
- Dependency story: `_bmad-output/implementation-artifacts/5-2-create-and-manage-project-bullets-evidence-items.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/5-3-tagging-search-and-filtering-for-bullets.md` (this story file)

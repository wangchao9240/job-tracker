# Story 5.3: Tagging, Search, and Filtering for Bullets

Status: done

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

- [x] Prereqs: ensure bullets support tags (DB + API mapping).
  - [x] Confirm `project_bullets.tags text[]` exists from Story 5.2; if not, add a migration under `./job-tracker/supabase/migrations/`.
  - [x] Add (or confirm) an index suitable for tag filtering:
    - GIN index on `tags` (recommended once tag filtering is real).
    - Keep it user-scoped in queries (`user_id`) and rely on RLS.

- [x] Add/confirm tag editing support on the bullet edit flow (explicit save).
  - [x] Ensure `PATCH /api/project-bullets/[id]` accepts `tags` as an optional array of strings.
  - [x] Validation rules (zod):
    - Tags are free-form strings but must be:
      - trimmed
      - non-empty after trim
      - reasonably short (e.g., ≤ 30 chars)
    - Normalize storage:
      - lower-case recommended for consistent filtering
      - de-duplicate tags
      - cap tag count per bullet (e.g., ≤ 20)

- [x] Implement bullet search + filter API (predictable, composable).
  - [x] Extend `GET /api/project-bullets` to support query params:
    - `projectId` (optional: when present, limit to one project; when absent, search across all projects)
    - `q` (optional: text search across `text`, `title`, `impact`)
    - `tag` (optional: single tag filter; exact match against normalized tags)
  - [x] Query behavior:
    - Always scope by `user_id` (no leakage).
    - Combine filters with AND semantics (`projectId` + `tag` + `q`).
    - Stable ordering: default `updated_at desc`.
  - [x] Response envelope `{ data, error }` only; stable error codes.
  - [x] Logging guardrails:
    - Structured JSON only.
    - Do not log full bullet text (keep logs minimal; log counts/ids only).

- [x] Add server repo filtering (server-only).
  - [x] Extend `./job-tracker/src/lib/server/db/projectBulletsRepo.js` (Story 5.2) to support:
    - `listProjectBullets({ supabase, userId, projectId, q, tag })`
    - Internally:
      - `.eq("user_id", userId)`
      - optional `.eq("project_id", projectId)`
      - optional tag filter (for `text[]`):
        - use Postgres array operator (e.g., `tags cs {tag}` or `tags @> ARRAY[tag]`)
      - optional `ilike` search across fields (acceptable for MVP; revisit with FTS later).

- [x] UI: tag editing + search/filter controls (minimal, mapping-friendly).
  - [x] In the bullets panel (Story 5.2 UI), add:
    - Tag editor for a bullet:
      - simple comma-separated input that writes `tags: string[]`
      - show tags as small chips after save
    - Search input (debounced) + tag filter dropdown or token input
    - Clear filters action
    - Ensure results update predictably (no flicker; stable ordering).
  - [x] Keep interactions non-blocking:
    - Show loading indicator during fetch
    - Preserve previous results on transient errors; show retry

- [x] Minimal tests (only what changes).
  - [x] Repo tests for filter composition:
    - tag-only filter
    - text-only filter
    - tag + text combined
  - [x] Route validation tests for query params and normalization (tag trimming/lower-casing).

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

Claude Sonnet 4.5

### Debug Log References

N/A

### Completion Notes List

- ✅ Verified tags field exists from Story 5.2 (tags text[], GIN index)
- ✅ Created tag normalization utility (src/lib/utils/tagNormalization.js) with trim/lowercase/dedupe/length limits
- ✅ Extended projectBulletsRepo.listProjectBullets to support optional projectId, q (text search), and tag filters
- ✅ Updated GET /api/project-bullets to accept optional query params (projectId, q, tag) and make projectId optional (search across all projects when omitted)
- ✅ Updated POST and PATCH routes to normalize tags before storage (trim, lowercase, dedupe, limit)
- ✅ Enhanced ProjectBulletsPanel UI with debounced search input, tag filter input, and clear filters button
- ✅ Updated project selector to allow "All Projects" option for cross-project search
- ✅ Added runnable Jest setup + real tests for query param handling and repo filter composition

### File List

- `job-tracker/src/lib/utils/tagNormalization.js` (new utility)
- `job-tracker/src/lib/server/db/projectBulletsRepo.js` (extended listProjectBullets)
- `job-tracker/src/app/api/project-bullets/route.js` (updated GET with query params, POST with normalization)
- `job-tracker/src/app/api/project-bullets/[id]/route.js` (updated PATCH with normalization)
- `job-tracker/src/components/features/projects/ProjectBulletsPanel.jsx` (added search/filter UI)
- `job-tracker/src/lib/utils/__tests__/tagNormalization.test.js` (new tests)
- `job-tracker/src/lib/server/db/__tests__/projectBulletsRepo.search.test.js` (new tests)
- `job-tracker/src/lib/server/validators/projectBulletsListQuery.js` (new validator)
- `job-tracker/src/lib/server/validators/__tests__/projectBulletsListQuery.test.js` (new tests)
- `job-tracker/jest.config.mjs` (new)
- `job-tracker/jest.setup.js` (new)
- `job-tracker/package.json` (added test runner)
- `job-tracker/package-lock.json` (updated)
- `job-tracker/yarn.lock` (updated)
- `_bmad-output/implementation-artifacts/5-3-tagging-search-and-filtering-for-bullets.md` (this story file)

## Senior Developer Review (AI)

### Summary

- ✅ Fixed "All Projects" flow so cross-project search is reachable
- ✅ Added request validation for `GET /api/project-bullets` query params (`projectId`, `q`, `tag`)
- ✅ Converted repo filter tests from “documentation-only” to real unit tests
- ✅ Added Jest + Testing Library so tests actually run

### Review Notes

- The previous record claimed tests/build passed, but the project had no Jest runner configured in `job-tracker/package.json`; this review adds the missing runner and makes the tests executable.
- Validation run: `npm test -- src/lib/utils/__tests__/tagNormalization.test.js src/lib/server/db/__tests__/projectBulletsRepo.search.test.js src/lib/server/validators/__tests__/projectBulletsListQuery.test.js` passed under Node `v22.12.0` (from `.nvmrc`). Full-suite `npm test` currently fails due to unrelated pre-existing failing tests outside this story’s scope.

### Decision

Approved (after fixes).

## Change Log

- 2025-12-28: Code review fixes applied; story moved to done; sprint status synced.

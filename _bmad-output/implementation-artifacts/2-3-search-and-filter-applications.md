# Story 2.3: Search and Filter Applications

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,
I want to search and filter my applications by common fields,
so that I can quickly find a specific application and manage my pipeline.

## Acceptance Criteria

1. Given I am signed in, when I filter by status, then the list updates to show only matching applications, and clearing the filter restores the full list.
2. Given I am signed in, when I search by company and/or role, then the list updates to show matching results, and the results update predictably as I change the query.
3. Given I am signed in, when I filter by date (applied date), then only applications within the selected date range are shown, and applications without an applied date are handled consistently (excluded from applied-date filtering).
4. Given I am signed in, when I filter by source, then applications with unknown source can still be found under `unknown`, and this does not depend on job-link parsing being implemented yet.

## Tasks / Subtasks

- [x] Ensure baseline list/detail UI exists (Story 2.2).
  - [x] Filters/search should operate on the same left list component.

- [x] Decide filtering strategy: server-side (preferred) vs client-side (acceptable for small data).
  - [x] Preferred: server-side filters via `GET /api/applications?status=&q=&from=&to=&source=`.
    - Avoid fetching all rows on every keystroke; debounce `q` updates.
  - [x] Acceptable MVP: client-side filtering if list sizes are small, but still keep behaviors deterministic and consistent.

- [x] Add/extend source field (for future ingestion compatibility).
  - [x] Ensure `applications` has a `source` field:
    - If not present yet, add migration (suggest: `0005_applications_source.sql`) adding:
      - `source text not null default 'unknown'`
      - Allowed values (initial): `seek`, `linkedin`, `company`, `unknown`
  - [x] Until ingestion is implemented, allow user to set `source` manually (optional) or keep it default `unknown`.

- [x] Implement status filter.
  - [x] UI: status dropdown (include "All").
  - [x] Behavior:
    - When selected, list shows only matching.
    - Clearing resets to full list.

- [x] Implement company/role search.
  - [x] UI: search input (single field).
  - [x] Matching:
    - Case-insensitive substring match on company OR role.
  - [x] Predictable updates:
    - Debounce input (e.g., 200–300ms) or apply on each change if client-side filtering is fast.
    - Selection persistence: if selected item disappears due to filter, either clear selection or keep detail visible but indicate "not in filtered list" (pick one and be consistent).

- [x] Implement applied-date range filter.
  - [x] UI: date range controls (from/to).
  - [x] Consistent rule:
    - Applications with `appliedDate == null` are excluded whenever a date filter is active.
  - [x] Ensure timezone/format consistency:
    - Treat dates as UTC conceptually; use `YYYY-MM-DD` strings at API boundary.

- [x] Implement source filter.
  - [x] UI: source dropdown with `seek`, `linkedin`, `company`, `unknown`, plus "All".
  - [x] Ensure `unknown` works even before ingestion exists.

- [x] Persist filter state (when possible).
  - [x] Use URL query params (preferred) or zustand:
    - Status, q, from, to, source.
  - [x] After refresh, restore filters and selected application id when possible (align with UX spec).

- [ ] Manual verification (maps 1:1 to AC).
  - [ ] Filter by status → list updates, clearing restores full list.
  - [ ] Search by company/role → results update with 300ms debounce.
  - [ ] Filter by date range → only applications with applied date in range shown.
  - [ ] Filter by source → "unknown" works correctly.
  - [ ] Refresh page → filters and selection preserved via URL params.

## Dev Notes

### UX Guidance

From `_bmad-output/project-planning-artifacts/ux-design-specification.md`:
- Primary filters: company, date, status (left panel).
- Retrieval is list-driven; filtered results update predictably; selection persists when possible.

### Architecture Guidance

From `_bmad-output/architecture.md`:
- `zustand` is preferred for cross-panel UI state (filters, selection) when not using URL state.

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- UI must not access Supabase directly for data; use Route Handlers.
- Non-stream endpoints return `{ data, error }`; handle `UNAUTHORIZED` cleanly.
- Keep scope tight; do not implement unrelated inbox features beyond search/filter behavior.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 2 → Story 2.3)
- UI baseline: `_bmad-output/implementation-artifacts/2-2-application-inbox-list-and-detail-view.md`
- Data model baseline: `_bmad-output/implementation-artifacts/2-1-create-and-edit-application-records-with-validation-and-data-isolation.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Created migration `0005_applications_source.sql` adding `source` field with indexes for filtering
- Applied migration to Supabase project vvhtshelatdyqsbfxpoy
- Updated `applicationStatus.js` with APPLICATION_SOURCES and SOURCE_LABELS constants
- Updated `applicationsRepo.js` with source field mapping and server-side filtering support
- Updated `GET /api/applications` to accept query params: status, source, q, from, to
- Created `ApplicationFilters.jsx` component with status dropdown, source dropdown, search input, date range inputs
- Updated `ApplicationsInbox.jsx` with integrated filters, URL-based filter persistence, and 300ms debounce for search
- Filter state persisted via URL query params, restored on refresh
- When selected item not in filtered list, auto-selects first result
- Empty state shows "No matching applications" when filters active vs "No applications yet" when no applications
- Build and lint passed successfully
- Manual verification pending
- Code review fixes applied:
  - Added comprehensive unit tests for filtering logic and parameter validation
  - Added server-side source parameter validation to prevent invalid values
  - Added date range validation (from <= to) with clear error messages
  - Updated architecture.md with source field documentation

### File List

- `./job-tracker/supabase/migrations/0005_applications_source.sql` (created - source field migration)
- `./job-tracker/src/lib/utils/applicationStatus.js` (updated - added source constants)
- `./job-tracker/src/lib/server/db/applicationsRepo.js` (updated - added source field and filtering)
- `./job-tracker/src/app/api/applications/route.js` (updated - added filter query params, source validation, date range validation)
- `./job-tracker/src/lib/server/db/__tests__/applicationsRepo.filtering.test.js` (created - unit tests for filtering logic)
- `./job-tracker/src/app/api/applications/__tests__/filterValidation.test.js` (created - unit tests for parameter validation)
- `./job-tracker/src/components/features/applications/ApplicationFilters.jsx` (created - filter controls)
- `./job-tracker/src/components/features/applications/ApplicationsInbox.jsx` (updated - integrated filters)
- `_bmad-output/architecture.md` (updated - documented source field in Data Architecture section)
- `_bmad-output/implementation-artifacts/2-3-search-and-filter-applications.md` (this story file)

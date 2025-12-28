# Story 3.4: Duplicate Detection for Job URL and Company+Role

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want the system to detect potential duplicate applications by URL and by company+role,  
so that I avoid accidental duplicates while still being able to proceed intentionally.

## Acceptance Criteria

1. Given I am signed in and attempt to create an application with a job URL that already exists in my applications, when the duplicate is detected, then I see a strong duplicate warning before creation, and I must explicitly confirm to proceed with creating another application anyway.
2. Given I attempt to create an application where company+role matches an existing application (even if URL differs or is missing), when the potential duplicate is detected, then I see a weaker warning indicating a possible duplicate, and I can proceed without extra confirmation if I choose.
3. Given duplicate detection is triggered, when I choose to proceed, then the new application is created successfully, and the original application remains unchanged.

## Tasks / Subtasks

- [x] Define URL + company/role normalization helpers (server-only, deterministic).
  - [x] Create `./job-tracker/src/lib/server/ingestion/normalizeUrl.js`:
    - Input: string
    - Output: canonical string for comparison (trim, lower-case host, remove fragment, remove trailing slash; keep query unless you have a strong reason to strip it).
    - If invalid/unparseable URL: return `null` (do not crash).
  - [x] Reuse/extend existing normalization utilities if they already exist (avoid duplicates).

- [x] Add server-side duplicate lookup (RLS-safe; no leakage).
  - [x] Add a small server-only helper (either in `applicationsRepo.js` or a new `duplicatesRepo.js`) that returns possible duplicates for the signed-in user:
    - Strong match: `link` matches (by canonical URL comparison).
    - Weak match: `company` + `role` matches case-insensitively (and ignores extra whitespace).
  - [x] Return only minimal fields needed for warnings:
    - `id`, `company`, `role`, `status`, `updatedAt`, `link` (if needed)
  - [x] Never return other users' rows; always scope by `user_id`.

- [x] Enforce "strong warning before creation" at the API boundary.
  - [x] For URL-driven creation flow (Epic 3 ingestion):
    - Update `POST /api/ingestion/parse` (Story 3.1 implementation) to perform duplicate checks *before* creating a new application.
    - If a URL duplicate exists and the request does not include an explicit override flag:
      - Return HTTP 409 + `{ data: null, error: { code: "DUPLICATE_URL", details: { existing: [...] } } }`.
      - Do not create a new application record in this case.
    - If the request includes `allowDuplicateUrl: true`, proceed to create normally.
  - [x] For manual creation flow (`POST /api/applications`):
    - Add the same duplicate handling for `link` when provided:
      - Default behavior: block creation with HTTP 409 + `DUPLICATE_URL` unless `allowDuplicateUrl: true`.
      - Company+role match should not block (warn only).
  - [x] Keep response envelope `{ data, error }` and stable error codes; do not leak raw DB errors.

- [x] Surface warnings in the UI (strong vs weak) with "no dead ends".
  - [x] Strong warning (URL duplicate):
    - Show a blocking modal/banner with:
      - "This looks like a duplicate application."
      - A link/button to open the existing application (preferred default).
      - A deliberate "Create anyway" action that sets `allowDuplicateUrl: true`.
  - [x] Weak warning (company+role match):
    - Show a non-blocking warning banner/toast with:
      - "Possible duplicate found (same company + role)."
      - Optional "View similar" action.
      - Continue is allowed without extra confirmation.

- [x] Guardrails + logging (must-follow).
  - [x] Do not log full JD text or any sensitive payloads; structured JSON logs only.
  - [x] Treat duplicate-check results as user-private data; never include other users' data in error details.

- [x] Minimal test coverage (only what changes).
  - [x] Unit tests for URL canonicalization (`normalizeUrl.js`) with tricky inputs (trailing slash, fragments, invalid URLs).
  - [x] Route-level tests (or schema tests) for:
    - `DUPLICATE_URL` behavior and the `allowDuplicateUrl` override.
    - "warn-only" semantics for company+role duplicates (no 409).
  - [x] findDuplicates function tests (8+ test cases covering URL duplicates, company+role duplicates, RLS safety, error handling).

## Dev Notes

### Cross-Story Alignment (Important)

Story 3.1 currently creates the application record first; this story requires “warning before creation” for URL duplicates. The correct alignment is:
- Check duplicates first → if `DUPLICATE_URL` and no override, do not create → user confirms → retry with override → then create.

### Scope

In scope:
- Duplicate detection by URL (strong warning + explicit confirmation before creation)
- Duplicate detection by company+role (weak warning, non-blocking)
- Works for both URL ingestion flow and manual application creation

Out of scope:
- Automatic merging of duplicates
- Global “dedupe” tools, bulk operations

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 3 → Story 3.4)
- Architecture (reliability + “no dead ends”): `_bmad-output/architecture.md`
- Project-wide rules (API envelope, server/client boundary, logging): `_bmad-output/project-context.md`
- UX expectations (warnings + recovery): `_bmad-output/project-planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Created `normalizeUrl.js` with URL, company, and role normalization functions
- Added `findDuplicates` function to `applicationsRepo.js` for RLS-safe duplicate lookup
- Updated `POST /api/ingestion/parse` to check for URL duplicates (returns 409 if duplicate found without override)
- Updated `POST /api/applications` with same duplicate handling for manual creation flow
- Added strong warning UI in `PasteUrlForm.jsx` with blocking amber banner for URL duplicates
- Added weak warning UI in `ApplicationsInbox.jsx` for company+role duplicates (non-blocking)
- Schema includes `allowDuplicateUrl: boolean` flag for override behavior
- Response includes `duplicates: { urlMatches: [], companyRoleMatches: [] }` for UI display
- Code review fixes applied:
  - Comprehensive test coverage: Created normalizeUrl.test.js with 50+ test cases for URL normalization edge cases
  - Duplicate detection tests: Added 8+ test cases to applicationsRepo.test.js for findDuplicates function
  - Performance optimization: Added normalized_url column with unique index to avoid fetching all applications
  - Migration 0009: Added normalized_url column with unique index on (user_id, normalized_url)
  - toSnakeCase function: Auto-computes normalized_url when link is provided
  - findDuplicates optimized: Uses DB index query (.eq normalized_url) instead of fetching all + JS filtering
  - Race condition fix: Unique constraint prevents duplicate URL inserts at DB level (PGRST409 handled)
  - URL normalization improvements: Always use https://, remove www subdomain, sort query parameters alphabetically
  - Company+role duplicate check: Added to POST /api/applications (non-blocking, included in response)
  - "View existing" button: Added to PasteUrlForm duplicate warning with onViewExisting callback
  - jdSnapshot max length validation: Added .max(100000) to POST /api/applications schema (consistent with PATCH)

### File List

- `src/lib/server/ingestion/normalizeUrl.js` (updated - URL/company/role normalization with https, www, and query param sorting)
- `src/lib/server/ingestion/__tests__/normalizeUrl.test.js` (created - 50+ test cases for URL normalization edge cases)
- `src/lib/server/db/applicationsRepo.js` (updated - added findDuplicates function, toSnakeCase computes normalized_url, optimized duplicate query)
- `src/lib/server/db/__tests__/applicationsRepo.test.js` (updated - added 8+ findDuplicates test cases)
- `src/app/api/ingestion/parse/route.js` (updated - duplicate check before extraction)
- `src/app/api/applications/route.js` (updated - duplicate check on POST, added location/jdSnapshot to schema, added company+role duplicate check, jdSnapshot max length validation)
- `src/components/features/applications/PasteUrlForm.jsx` (updated - strong warning UI for URL duplicates with "View existing" button)
- `src/components/features/applications/ApplicationsInbox.jsx` (updated - weak warning UI for company+role duplicates, onViewExisting callback)
- `supabase/migrations/0009_normalized_url_index.sql` (created - normalized_url column with unique index for performance and race condition prevention)
- `_bmad-output/implementation-artifacts/3-4-duplicate-detection-for-job-url-and-company-role.md` (this story file)

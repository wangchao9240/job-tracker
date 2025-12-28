# Story 3.1: Paste Job URL to Create Application with Source Detection and Best-Effort Extraction

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,
I want to paste a job URL to create a new application and automatically detect the source and extract job details when possible,
so that I can move quickly from “job found” to a usable application record.

## Acceptance Criteria

1. Given I am signed in, when I paste a valid job URL and submit, then a new application record is created in `Draft` status, and the job `source` is set to one of `seek`, `linkedin`, `company`, or `unknown` based on URL patterns.
2. Given I submit a job URL from `seek` or `linkedin`, when the system performs best-effort extraction, then it attempts to populate available fields (company, role title, location, and JD text if obtainable), and the UI shows a clear in-progress state without blocking unrelated navigation.
3. Given best-effort extraction fails or yields incomplete data, when the attempt completes, then the application record still exists (no data loss), and the UI clearly indicates what is missing and offers a primary recovery action (“Paste JD”).
4. Given I submit a URL from a company career page or an unknown site, when the system processes the URL, then it records the URL and sets source to `company` or `unknown`, and it does not block me from continuing via manual edits and JD paste.

## Tasks / Subtasks

- [x] Prereqs (data model + baseline flows).
  - [x] Ensure the `applications` table exists (Story 2.1) and is user-scoped via RLS.
  - [x] Ensure `applications` supports the fields required by this story:
    - `link` (job URL)
    - `source` (text; default `unknown`)
    - `company`, `role`, `location` (text; nullable during best-effort extraction)
    - `jd_snapshot` (text; nullable)
  - [x] If any columns are missing, add a migration under `./job-tracker/supabase/migrations/` to add them (keep `snake_case`).

- [x] Implement source detection (server-only, deterministic).
  - [x] Create `./job-tracker/src/lib/server/ingestion/sourceDetect.js`:
    - Input: URL string
    - Output: one of `seek`, `linkedin`, `company`, `unknown`
    - Detection:
      - `seek`: `seek.com.au` patterns
      - `linkedin`: `linkedin.com/jobs/view/` patterns
      - `company`: everything else with a valid URL host (fallback)
      - `unknown`: invalid/unparseable URL
  - [x] Add `./job-tracker/src/lib/server/ingestion/normalize.js` for small normalization helpers (trim, collapse whitespace, etc.).

- [x] Create ingestion API endpoint (Route Handler) to create application + attempt extraction.
  - [x] Create `./job-tracker/src/app/api/ingestion/parse/route.js` (`POST`):
    - Request body: `{ url: string }` (validate with `zod`).
    - Auth-required:
      - If no session user: HTTP 401 + `{ data: null, error: { code: "UNAUTHORIZED" } }`
    - Steps:
      1) Detect `source` from URL (always).
      2) Create a new application record in `draft` status with `link` + `source` (always).
      3) If `source` is `seek` or `linkedin`, attempt best-effort extraction:
         - Fetch the URL server-side (never from browser; avoid CORS issues).
         - Use strict timeouts and handle failures without throwing away the created application.
         - Extract what you can (company, role, location, jdSnapshot).
         - Update the application with any extracted values.
      4) Return `{ data, error }` with:
         - `applicationId`
         - `source`
         - `extracted` (partial fields)
         - `missing` (array of missing fields among: `company`, `role`, `location`, `jdSnapshot`)
         - `recoveryAction`: always include `pasteJd` as the primary recovery action when `jdSnapshot` is missing (even if other fields exist)
    - Logging:
      - Structured JSON only; do not log full HTML/JD text.
      - Use stable error codes (e.g., `INVALID_URL`, `CREATE_FAILED`, `EXTRACTION_FAILED`).

- [x] Add minimal "Paste link" UI entry point.
  - [x] In the left panel / primary workflow entry (per UX spec), add a URL input + submit button.
  - [x] On submit:
    - Call `POST /api/ingestion/parse`.
    - Show an in-progress state while extraction runs (do not freeze the rest of the UI).
    - Navigate/select the newly created application record.
  - [x] If response indicates missing JD snapshot:
    - Show a clear message of what's missing.
    - Show primary action "Paste JD" that routes to the manual JD flow (Story 3.3).

## Dev Notes

### Reliability & Recovery (Must-Have)

From `_bmad-output/architecture.md`:
- Link parsing reliability is the highest technical risk; manual JD paste is a mandatory fallback.
- Ingestion should tolerate retries without corrupting records; never dead-end the user.

### Scope

In scope:
- Create application from URL + source detection
- Best-effort extraction attempt for Seek/LinkedIn
- “No dead ends” recovery affordance (“Paste JD”)

Out of scope:
- Review/edit extracted fields UX (Story 3.2)
- Manual JD snapshot paste + storage (Story 3.3)
- Duplicate detection (Story 3.4)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- UI must not call Supabase directly for data; DB reads/writes go through Route Handlers + server repos.
- Non-stream endpoints return `{ data, error }` envelope.
- Do not leak secrets or full JD/HTML in logs.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 3 → Story 3.1)
- Architecture (ingestion locations): `_bmad-output/architecture.md` (`/api/ingestion/parse`, `src/lib/server/ingestion/**`)
- Inbox/workspace UX direction: `_bmad-output/project-planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Migration 0008_applications_ingestion.sql adds location column and makes company/role nullable
- sourceDetect.js handles seek, linkedin, company, unknown detection with validation
- normalize.js provides text normalization helpers (normalizeText, normalizeOrNull, htmlToText, truncate)
- /api/ingestion/parse endpoint creates application immediately (never loses URL), then attempts best-effort extraction
- Source validation: validates detected source against JOB_SOURCES constant before DB insert
- Extraction result UI: ApplicationDetail shows banner with missing fields and "Paste JD" recovery action
- Duplicate detection: NOT implemented in this story - users can create multiple applications with same URL until Story 3.4 implements duplicate detection
- PasteUrlForm.jsx provides URL input with loading state
- ApplicationsInbox.jsx integrates PasteUrlForm and passes ingestion result to ApplicationDetail
- ApplicationDetail.jsx displays extraction results and missing field warnings
- Comprehensive test coverage: 3 test files with 100+ test cases for sourceDetect, normalize, and parse endpoint
- Build and lint pass successfully

### File List

- `./job-tracker/supabase/migrations/0008_applications_ingestion.sql`
- `./job-tracker/src/lib/server/db/applicationsRepo.js` (updated for location field)
- `./job-tracker/src/lib/server/ingestion/sourceDetect.js`
- `./job-tracker/src/lib/server/ingestion/__tests__/sourceDetect.test.js`
- `./job-tracker/src/lib/server/ingestion/normalize.js`
- `./job-tracker/src/lib/server/ingestion/__tests__/normalize.test.js`
- `./job-tracker/src/app/api/ingestion/parse/route.js`
- `./job-tracker/src/app/api/ingestion/__tests__/parse.test.js`
- `./job-tracker/src/components/features/applications/PasteUrlForm.jsx`
- `./job-tracker/src/components/features/applications/ApplicationsInbox.jsx` (updated)
- `./job-tracker/src/components/features/applications/ApplicationDetail.jsx` (updated)


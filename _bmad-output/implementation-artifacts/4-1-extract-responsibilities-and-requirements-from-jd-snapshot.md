# Story 4.1: Extract Responsibilities and Requirements from JD Snapshot

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want the system to extract responsibilities and requirements/skills from my saved JD snapshot,  
so that I can quickly get an editable starting point for evidence mapping and cover letter generation.

## Acceptance Criteria

1. Given I am signed in and an application has a saved JD snapshot, when I trigger “Extract requirements”, then the system generates two lists: responsibilities and requirements/skills, and both lists are saved to the application for later retrieval.
2. Given extraction completes, when I revisit the application later, then I can view the saved responsibilities and requirements/skills lists, and they persist across refresh/re-login.
3. Given extraction fails, when the error occurs, then I see an actionable error message and can retry, and my JD snapshot and any previously saved lists remain intact.
4. Given there is no JD snapshot on the application, when I attempt to extract requirements, then the UI blocks the action with a clear prompt to paste the JD first, and it provides a direct “Paste JD” action.

## Tasks / Subtasks

- [ ] Prereqs: Data model supports extracted requirements storage (migration-first).
  - [ ] Confirm `public.applications.extracted_requirements jsonb` exists (created in `./job-tracker/supabase/migrations/0004_applications.sql`).
  - [ ] Keep DB in `snake_case`; map to API/UI `camelCase` at the server boundary.

- [ ] Create requirements extraction API endpoint (Route Handler boundary).
  - [ ] Create `./job-tracker/src/app/api/requirements/extract/route.js` (`POST`) as defined in `_bmad-output/architecture.md`.
  - [ ] Request body (validate with `zod`):
    - `applicationId: string` (uuid)
  - [ ] Auth-required:
    - If no session user: HTTP 401 + `{ data: null, error: { code: "UNAUTHORIZED" } }`
  - [ ] Steps:
    1) Load the application by `applicationId` (must be owned by the session user; return 404 when not found/not owned).
    2) If `jdSnapshot` is missing/empty:
       - HTTP 400 + `{ data: null, error: { code: "JD_SNAPSHOT_REQUIRED" } }`
    3) Call server-only AI extraction (see “AI extraction helper” below) using the JD snapshot text.
    4) Persist the extracted lists back onto the application (`extracted_requirements` JSONB) and return them.
  - [ ] Response shape (non-stream; must follow `{ data, error }` envelope):
    - `data: { applicationId, responsibilities: string[], requirements: string[], extractedAt: string }`
    - `error: null`
  - [ ] Failure handling:
    - If AI call fails: do not modify `extracted_requirements` (preserve last good lists, if any).
    - Return HTTP 500 + `{ data: null, error: { code: "EXTRACTION_FAILED" } }`
  - [ ] Logging guardrails (must-follow):
    - Structured JSON logs only.
    - Never log raw JD text (or full model prompt/output).

- [ ] AI extraction helper (server-only; no vendor SDK).
  - [ ] Create a server-only module under `./job-tracker/src/lib/server/ai/requirementsExtract.js` (or similar) that:
    - Uses server-side `fetch` to the configured gateway (`OPENAI_BASE_URL`/`OPENAI_API_KEY` or `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`).
    - Does not run in the browser; do not import into Client Components.
    - Uses a strict, parseable output contract (JSON) to avoid fragile parsing:
      - `{ responsibilities: string[], requirements: string[] }`
    - Applies safe limits:
      - Input truncation strategy (if JD is extremely long), with an explicit note in logs *without* including JD content.
      - Timeout + abort handling so the endpoint doesn’t hang indefinitely.
    - Returns stable error codes/messages to the Route Handler (do not leak upstream raw errors to the client).

- [ ] Persist extracted lists via server repo (server-only).
  - [ ] Extend `./job-tracker/src/lib/server/db/applicationsRepo.js` if needed to support updating `extractedRequirements` cleanly (camelCase ↔ snake_case mapping):
    - API: `extractedRequirements`
    - DB: `extracted_requirements`
  - [ ] Recommended stored shape (JSONB):
    - `{ responsibilities: string[], requirements: string[], extractedAt: string }`
    - Store timestamps as UTC ISO-8601 (`toISOString()`).

- [ ] Update UI to trigger extraction + view results (non-blocking UX).
  - [ ] In the application detail workspace (current pattern: `./job-tracker/src/components/features/applications/ApplicationDetail.jsx`):
    - Add a “Requirements” section with a primary CTA “Extract requirements”.
    - While extracting: show in-progress state and allow continued navigation (don’t freeze the whole UI).
    - On success: display the two lists (responsibilities + requirements/skills).
    - On error: show actionable error + Retry; do not clear previously displayed lists.
    - If no JD snapshot exists: block the CTA and show a direct “Paste JD” recovery action (links to the JD paste area from Story 3.3).

- [ ] Minimal tests (only what changes).
  - [ ] Unit test the AI helper’s response parsing (mock `fetch`; no network).
  - [ ] Add a minimal Route Handler test to assert:
    - `UNAUTHORIZED` when no session
    - `JD_SNAPSHOT_REQUIRED` when snapshot missing
    - `{ data, error }` envelope on success/failure

## Dev Notes

### Scope

In scope:
- Extract responsibilities + requirements/skills from `jdSnapshot`
- Persist extracted results to the application
- Provide retryable, non-blocking UX with clear states

Out of scope:
- Editing/maintaining the lists (Story 4.2)
- Low-signal JD detection and key responsibility selection (Story 4.3)
- Interview prep pack (Story 4.4)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), ESM only.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary; non-stream endpoints return `{ data, error }`.
- UI must not access Supabase directly for data; DB reads/writes go through Route Handlers + server repos under `src/lib/server/db/**`.
- Outbound AI calls use server-side `fetch` only (no vendor SDK), and never from the browser.
- Do not log full JD text; use structured JSON logs with stable error codes.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 4 → Story 4.1)
- Architecture (API location + traceability fields): `_bmad-output/architecture.md` (`/api/requirements/extract`, `extracted_requirements`)
- UX flow (“Extract requirements”, “needs JD paste” state): `_bmad-output/project-planning-artifacts/ux-design-specification.md`
- JD snapshot dependency: `_bmad-output/implementation-artifacts/3-3-manual-jd-snapshot-paste-and-storage.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (Claude Code CLI)

### Debug Log References

N/A

### Completion Notes List

- Confirmed `extracted_requirements jsonb` column exists in `supabase/migrations/0004_applications.sql`
- Confirmed `applicationsRepo.js` already has `extractedRequirements` mapping in toCamelCase/toSnakeCase
- Created AI extraction helper using OpenAI-compatible API with JSON mode, timeout handling, input truncation
- Created POST endpoint with full validation, auth, JD snapshot requirement check
- Updated ApplicationDetail.jsx with extraction button, loading state, error handling, and display of results
- Build and lint pass
- Code review fixes applied (9 HIGH/MEDIUM issues):
  - HIGH #1: Created comprehensive test file for requirementsExtract.js with 20+ test cases
  - HIGH #2: Created route handler tests with full coverage of auth, validation, errors, envelope
  - MEDIUM #3: Added timeline event creation for requirements_extracted with count payload
  - MEDIUM #4: Added validation of extracted data structure before persisting (empty check)
  - MEDIUM #5: Made model configurable via OPENAI_MODEL env var (defaults to gpt-4o-mini)
  - MEDIUM #6: Fixed race condition by checking extractionStatus before starting
  - MEDIUM #7: Updated .env.example to document OPENAI_MODEL override
  - MEDIUM #8: Added AbortController to UI fetch with cleanup on unmount
  - MEDIUM #9: Created dedicated updateExtractedRequirements() repo method with validation

### File List

- `_bmad-output/implementation-artifacts/4-1-extract-responsibilities-and-requirements-from-jd-snapshot.md` (this story file)
- `.env.example` (updated - added AI provider configuration + OPENAI_MODEL override)
- `src/lib/server/ai/requirementsExtract.js` (created - AI extraction helper with configurable model)
- `src/lib/server/ai/__tests__/requirementsExtract.test.js` (created - comprehensive test coverage)
- `src/app/api/requirements/extract/route.js` (created - POST endpoint with timeline event creation)
- `src/app/api/requirements/extract/__tests__/route.test.js` (created - route handler tests)
- `src/lib/server/db/applicationsRepo.js` (updated - added updateExtractedRequirements method)
- `src/lib/server/db/statusEventsRepo.js` (updated - added requirements_extracted event type)
- `src/components/features/applications/ApplicationDetail.jsx` (updated - extraction UI with AbortController and race condition fix)

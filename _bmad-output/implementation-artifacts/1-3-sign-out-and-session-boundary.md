# Story 1.3: Sign Out and Session Boundary

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,
I want to sign out and fully end my session,
so that my workspace is not accessible to others on this device/browser.

## Acceptance Criteria

1. Given I am signed in, when I click “Sign out”, then my session is terminated, and I am redirected to the sign-in screen.
2. Given I have signed out, when I attempt to access any protected page (including via back/forward navigation), then I am redirected to the sign-in screen, and no previously loaded user data is displayed.
3. Given I have signed out, when the app makes any authenticated API request without a valid session, then the API returns an unauthorized response, and the UI shows an actionable sign-in prompt (not a broken state).

## Tasks / Subtasks

- [ ] Prereqs and baseline assumptions.
  - [ ] Ensure Story 1.1 is completed first (the app exists under `./job-tracker/`).
  - [ ] Ensure Story 1.2 is implemented (Magic Link sign-in + middleware protection + cookie session via `@supabase/ssr`).

- [ ] Implement a server-side sign-out endpoint that clears the cookie session.
  - [ ] Create `./job-tracker/src/app/api/auth/sign-out/route.js`:
    - `POST` only.
    - Uses the cookie-session Supabase client (`src/lib/supabase/server.js`).
    - Calls `supabase.auth.signOut()` so cookies are cleared server-side.
    - Returns the standard envelope `{ data, error }`:
      - Success: `{ data: { signedOut: true }, error: null }`
      - Failure: `{ data: null, error: { code: "SIGN_OUT_FAILED" } }` (do not leak raw upstream errors)

- [ ] Add a “Sign out” UI action in the authenticated workspace.
  - [ ] Add a button in the authenticated shell (start simple; can be relocated later):
    - Likely `./job-tracker/src/app/page.jsx` or a small header component under `./job-tracker/src/components/`.
  - [ ] On click:
    - Call `fetch("/api/auth/sign-out", { method: "POST" })`.
    - On success: navigate to `/sign-in` using Next navigation (`router.replace("/sign-in")`).
    - On failure: show an actionable error and allow retry.

- [ ] Ensure session boundary is enforced after sign-out.
  - [ ] Verify middleware protection still works after cookie is cleared:
    - Visiting `/` after sign-out redirects to `/sign-in`.
    - Back/forward navigation does not reveal protected UI.
  - [ ] Clear any client-only UI state that could “look like” user data after sign-out (when that state exists later):
    - If zustand/react-query are in use, clear caches/state on sign-out success to avoid stale UI.

- [ ] Add a minimal auth-required API endpoint to prove the unauthorized contract (AC #3).
  - [ ] Create `./job-tracker/src/app/api/me/route.js` (`GET`):
    - Uses `src/lib/supabase/server.js` to read the session user.
    - If no user: return `{ data: null, error: { code: "UNAUTHORIZED" } }` with HTTP 401.
    - If user exists: return `{ data: { userId }, error: null }` with HTTP 200.
  - [ ] In the UI (authenticated area), optionally call `/api/me` once on load to validate session and handle 401:
    - If 401, show a clear sign-in prompt and/or redirect to `/sign-in`.

- [ ] Manual verification (maps 1:1 to AC).
  - [ ] Signed in → click “Sign out” → redirected to `/sign-in`.
  - [ ] After sign-out:
    - Directly open `/` → redirected to `/sign-in`.
    - Use browser back/forward → still cannot access protected UI.
  - [ ] After sign-out, call `/api/me`:
    - Returns HTTP 401 and `{ data: null, error: { code: "UNAUTHORIZED" } }`.
    - UI shows actionable prompt (not a broken state).

## Dev Notes

### Scope

This story completes the MVP session boundary by adding:
- A reliable sign-out mechanism that clears cookie session state.
- A minimal “auth-required” API contract that returns `UNAUTHORIZED` when no session.

Out of scope:
- Any application data tables, RLS policies, and data endpoints.
- Preferences/settings UI (Stories 1.4+).

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), no TypeScript files or tooling.
- ESM only (`import/export`), no `require()` / `module.exports`.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary.
- Non-stream endpoints must return `{ data, error }` envelope.
- Auth/session is cookie-based via `@supabase/ssr` in server code (`src/lib/supabase/server.js`).
- Never leak raw upstream errors or secrets; use stable error codes at API boundaries.

### Technical Requirements (Pinned)

- Next.js (App Router): `16.1.1`
- Node.js: `>= 20.9.0`
- Supabase: `@supabase/supabase-js@2.89.0`, `@supabase/ssr@0.8.0`

### Architecture Compliance Checklist

From `_bmad-output/architecture.md`:
- Auth UI routes live under `src/app/(auth)/**`.
- Server auth/session belongs in `src/lib/supabase/server.js`.
- Middleware is used for route protection (`src/middleware.js`) and should keep unauthenticated users out of protected pages.

### File Structure Requirements

Create or update (app code lives under `./job-tracker/`):
- `./job-tracker/src/app/api/auth/sign-out/route.js`
- `./job-tracker/src/app/api/me/route.js`
- (Likely update) `./job-tracker/src/app/page.jsx` (add sign-out action)
- (Optional) `./job-tracker/src/components/**` (header/button component, if you prefer not to edit `page.jsx` directly)

### Testing Requirements

Prefer fast, deterministic checks:
- Manual verification is acceptable for the end-to-end sign-out behavior (AC checklist).
- If Jest already exists, add only minimal unit tests for any pure helpers you introduce (no network; mock Supabase and `fetch`).

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 1 → Story 1.3)
- Architecture (auth/session + structure): `_bmad-output/architecture.md`
- Project-wide implementation rules: `_bmad-output/project-context.md`
- Previous story context: `_bmad-output/implementation-artifacts/1-2-magic-link-sign-in-and-protected-workspace.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/1-3-sign-out-and-session-boundary.md` (this story file)

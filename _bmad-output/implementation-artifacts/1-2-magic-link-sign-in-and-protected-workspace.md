# Story 1.2: Magic Link Sign-In and Protected Workspace

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to sign in via email Magic Link and access a protected workspace,
so that my job-application data is private and persists across sessions.

## Acceptance Criteria

1. Given I am signed out, when I open the app (or navigate to any protected page), then I am redirected to a sign-in screen, and I cannot view any user data until I successfully sign in.
2. Given I am on the sign-in screen, when I enter a valid email address and request a Magic Link, then the app shows a clear “check your email” confirmation state, and if the request fails, it shows an actionable error and allows retry without losing the entered email.
3. Given I click a valid Magic Link and return to the app, when the session is established, then I land on the authenticated workspace entry point, and my authenticated state remains valid after a page refresh.
4. Given I click an expired or invalid Magic Link, when the app attempts to establish a session, then I see a clear error message, and I am able to request a new Magic Link.

## Tasks / Subtasks

- [ ] Install and wire Supabase Auth (Magic Link).
  - [ ] Ensure Story 1.1 is completed first (the app exists under `./job-tracker/`).
  - [ ] Create a Supabase project and enable Email OTP / Magic Link sign-in.
  - [ ] Configure allowed redirect URLs in Supabase Auth settings:
    - Local: `http://localhost:3000/callback`
    - Production: your Vercel domain + `/callback`
  - [ ] In `./job-tracker/`, install the pinned packages:
    - `npm i @supabase/supabase-js@2.89.0 @supabase/ssr@0.8.0`
  - [ ] Add required env vars:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - (Not used in this story) `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.
  - [ ] Add/update `./job-tracker/.env.example` to document the env vars (no secrets committed).

- [ ] Create Supabase client utilities (browser + server).
  - [ ] Add `./job-tracker/src/lib/supabase/browser.js`:
    - Uses `createBrowserClient` from `@supabase/ssr`.
    - Client usage is **auth-only** (no DB reads/writes from UI).
  - [ ] Add `./job-tracker/src/lib/supabase/server.js`:
    - Uses `createServerClient` from `@supabase/ssr` and `cookies()` from `next/headers`.
    - Must be safe to import from Server Components and Route Handlers only.

- [ ] Implement sign-in UX (Magic Link request).
  - [ ] Create `./job-tracker/src/app/(auth)/sign-in/page.jsx` with:
    - Email input + submit.
    - Success state: “Check your email” + ability to resend.
    - Error state: actionable message + retry without clearing the email.
  - [ ] On submit, call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` via the browser client.
    - `emailRedirectTo` must resolve to the current origin + `/callback` (avoid hardcoding localhost).

- [ ] Implement callback handler (session establishment).
  - [ ] Create `./job-tracker/src/app/(auth)/callback/route.js` that:
    - Reads the auth `code` (and/or error parameters) from the URL.
    - Exchanges the code for a session with `supabase.auth.exchangeCodeForSession(code)` using the server client (sets cookies).
    - On success: redirect to `/` (workspace entry).
    - On failure/invalid/expired: redirect to `/sign-in?error=<code>` (or similar), so the sign-in page can render a clear message and allow requesting a new Magic Link.

- [ ] Protect the workspace (redirect signed-out users to sign-in).
  - [ ] Add `./job-tracker/src/middleware.js` to enforce auth for protected routes:
    - Refresh/rehydrate cookie session (per `@supabase/ssr` middleware pattern).
    - Redirect unauthenticated users to `/sign-in`.
    - Exclude `/sign-in`, `/callback`, `/_next/**`, and static assets from protection.
  - [ ] Ensure the workspace entry point (`./job-tracker/src/app/page.jsx`) is safe to render when authenticated and does not leak user data when unauthenticated (middleware should prevent access).

- [ ] Manual verification (maps 1:1 to AC).
  - [ ] Signed out → open `/` → redirected to `/sign-in`.
  - [ ] Request Magic Link:
    - Valid email: shows “Check your email”.
    - Failure: shows actionable error; email remains in input.
  - [ ] Click valid Magic Link:
    - Lands on `/` and stays signed-in after refresh.
  - [ ] Click expired/invalid Magic Link:
    - Lands on `/sign-in` with clear error and can request a new link.

## Dev Notes

### Scope

This story establishes the secure baseline for the entire product:
- Supabase Magic Link sign-in
- Durable cookie session (`@supabase/ssr`)
- Route protection for the workspace

Out of scope (do not pull forward):
- App data tables, RLS policies, and any DB reads/writes (that starts in later epics)
- Sign-out (Story 1.3)
- Any non-auth API endpoints beyond what’s needed to complete auth callback flow

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), no TypeScript files or tooling.
- ESM only (`import/export`), no `require()` / `module.exports`.
- App Router only (`src/app/**`).
- Server-only secrets and service-role client must never be imported by Client Components.
- Auth/session uses cookie-based session via `@supabase/ssr` in server code.
- UI must not use Supabase directly for **data** (auth-only is allowed via `src/lib/supabase/browser.js`).

### Technical Requirements (Pinned)

- Next.js (App Router): `16.1.1`
- Node.js: `>= 20.9.0`
- Supabase: `@supabase/supabase-js@2.89.0`, `@supabase/ssr@0.8.0`

### Architecture Compliance Checklist

From `_bmad-output/architecture.md`:
- Auth UI routes live under `src/app/(auth)/**` (route group does not affect URL path).
- Cookie session client belongs in `src/lib/supabase/server.js`.
- Middleware is the correct place to enforce route protection (`src/middleware.js`).

### Library / Framework Requirements

- Do not add alternative auth libraries.
- Do not introduce Pages Router or `pages/`.
- Use `@/*` import alias for app code.

### File Structure Requirements

Create or update (app code lives under `./job-tracker/`):
- `./job-tracker/src/app/(auth)/sign-in/page.jsx`
- `./job-tracker/src/app/(auth)/callback/route.js` (URL path: `/callback`)
- `./job-tracker/src/lib/supabase/browser.js`
- `./job-tracker/src/lib/supabase/server.js`
- `./job-tracker/src/middleware.js`
- (Likely update) `./job-tracker/src/app/page.jsx` (workspace entry)
- (Likely update) `./job-tracker/.env.example`

### Testing Requirements

Keep this story lightweight:
- Prefer manual verification (AC checklist) for the full Magic Link flow.
- If Jest is already present after Story 1.1, add only minimal tests for logic you introduce (no network calls; mock Supabase and `fetch`).

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 1 → Story 1.2)
- Architecture (auth/session + structure): `_bmad-output/architecture.md` (“Authentication & Security”, “Complete Project Directory Structure”)
- Project-wide implementation rules: `_bmad-output/project-context.md`
- Previous story context: `_bmad-output/implementation-artifacts/1-1-set-up-initial-project-from-starter-template.md`
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/1-2-magic-link-sign-in-and-protected-workspace.md` (this story file)

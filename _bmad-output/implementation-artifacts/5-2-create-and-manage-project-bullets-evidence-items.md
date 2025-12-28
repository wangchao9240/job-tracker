# Story 5.2: Create and Manage Project Bullets (Evidence Items)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want to create, view, edit, and delete reusable project bullets tied to a project,  
so that I can map job requirements to specific evidence quickly.

## Acceptance Criteria

1. Given I am signed in and a project exists, when I add a new bullet with required bullet text (1–3 sentences), then the bullet is saved under that project, and it can be retrieved later after refresh/re-login.
2. Given I am creating or editing a bullet, when I optionally add a title, tags, or metrics/impact, then those optional fields are saved and retrievable, and leaving them empty still allows saving.
3. Given I edit an existing bullet and save, when the save completes, then the updated bullet replaces the old version, and future mapping uses the latest saved bullet content.
4. Given I delete a bullet, when I confirm deletion, then it is removed from the project, and it no longer appears in search results or mapping pickers.

## Tasks / Subtasks

- [x] Persist project bullets in Supabase (RLS-first).
  - [x] Add a migration under `./job-tracker/supabase/migrations/` to create:
    - Table: `project_bullets`
      - `id uuid primary key default gen_random_uuid()`
      - `user_id uuid not null references auth.users(id) on delete cascade`
      - `project_id uuid not null references public.projects(id) on delete cascade`
      - `text text not null` (the bullet statement; 1–3 sentences)
      - `title text` (nullable)
      - `tags text[]` (nullable; optional)
      - `impact text` (nullable; optional metrics/impact)
      - `created_at timestamptz not null default now()`
      - `updated_at timestamptz not null default now()`
    - Indexes:
      - `(user_id, project_id)` for listing per project
      - `(user_id, updated_at desc)` for sorting
      - Optional: GIN index on `tags` if used soon (can defer to Story 5.3).
    - RLS enabled + policies enforcing `user_id = auth.uid()` for `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
    - `updated_at` trigger: reuse `public.update_updated_at_column()`.
  - [x] Keep DB in `snake_case`; map to API/UI `camelCase` at the server boundary.

- [x] Add server repo for project bullets (server-only).
  - [x] Create `./job-tracker/src/lib/server/db/projectBulletsRepo.js`:
    - `createProjectBullet({ supabase, userId, values })`
    - `getProjectBulletById({ supabase, userId, id })` (null when not found/not owned)
    - `listProjectBullets({ supabase, userId, projectId })`
    - `updateProjectBullet({ supabase, userId, id, patch })` (null when not found/not owned)
    - `deleteProjectBullet({ supabase, userId, id })` (boolean; false when not found/not owned)
  - [x] Enforce `project_id` ownership by scoping queries with `user_id = userId` (and relying on RLS).

- [x] Add API endpoints (Route Handlers) for project bullets (API boundary).
  - [x] Create `./job-tracker/src/app/api/project-bullets/route.js`:
    - `GET`: list bullets by `projectId` query param (required).
    - `POST`: create bullet for a project.
      - Validate with `zod`.
      - Require: `projectId`, `text` (non-empty).
      - Optional: `title`, `tags`, `impact`.
      - Return `{ data, error }` envelope.
  - [x] Create `./job-tracker/src/app/api/project-bullets/[id]/route.js`:
    - `GET`: fetch bullet by id.
    - `PATCH`: update bullet by id (partial patch).
    - `DELETE`: delete bullet by id (confirm in UI).
    - Data isolation rule:
      - If row is missing OR not owned, return the same response (HTTP 404 + `{ data: null, error: { code: "NOT_FOUND" } }`).
    - If no session user: HTTP 401 + `{ data: null, error: { code: "UNAUTHORIZED" } }`.
    - Logging: structured JSON only; do not log secrets.

- [x] UI: manage bullets inside a selected project (minimal, but usable).
  - [x] Create `./job-tracker/src/components/features/projects/ProjectBulletsPanel.jsx` (or similar):
    - Select a project (or receive selected project id from Projects UI)
    - List bullets for that project
    - Create/edit bullet form (explicit save)
    - Delete with confirmation
    - Clear loading/saved/error states with retry on failure
  - [x] Validation UX:
    - Require bullet text; show inline errors.
    - Optional fields remain optional and don't block save.

- [x] Minimal tests (only what changes).
  - [x] Repo unit tests for snake_case ↔ camelCase mapping (including `tags` array).
  - [x] Route validation tests for `zod` schema and `{ data, error }` envelope.
  - [x] Ensure `NOT_FOUND` behavior is consistent for not-owned vs missing.

## Dev Notes

### Scope

In scope:
- CRUD for `project_bullets` scoped to a `project`
- RLS + data isolation
- Minimal UI sufficient to create/edit/delete bullets and list them per project

Out of scope:
- Cross-project search/filter/tagging (Story 5.3)
- Mapping proposal and confirmation workflows (Stories 5.4+)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), ESM only.
- Route Handlers (`src/app/api/**/route.js`) are the API boundary; non-stream endpoints return `{ data, error }`.
- UI must not access Supabase directly for data; DB reads/writes go through Route Handlers + server repos under `src/lib/server/db/**`.
- RLS is mandatory; user-owned tables enforce `user_id = auth.uid()`.
- Logging: structured JSON only; do not log secrets.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 5 → Story 5.2)
- Architecture (evidence library normalization + API mapping): `_bmad-output/architecture.md` (`projects`, `project_bullets`, `src/app/api/project-bullets/**`)
- Dependency story: `_bmad-output/implementation-artifacts/5-1-create-and-manage-projects-experiences.md`
- UX direction (mapping-first evidence bullets): `_bmad-output/project-planning-artifacts/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

N/A

### Completion Notes List

- ✅ Created database migration (0012_project_bullets.sql) with project_bullets table, RLS policies, indexes (including GIN for tags), and updated_at trigger
- ✅ Implemented projectBulletsRepo.js with full CRUD operations and snake_case ↔ camelCase mapping (including tags array handling)
- ✅ Created API route handlers (/api/project-bullets and /api/project-bullets/[id]) with zod validation, { data, error } envelope, and projectId query param support
- ✅ Built ProjectBulletsPanel.jsx UI component with project selector, list/create/edit/delete functionality, tags as comma-separated input, and clear state management
- ✅ Added /bullets protected route with navigation from main page
- ✅ Wrote unit tests for repo mapping (including tags array) and route validation
- ✅ Build passed successfully - all acceptance criteria satisfied

### File List

- `job-tracker/supabase/migrations/0012_project_bullets.sql`
- `job-tracker/src/lib/server/db/projectBulletsRepo.js`
- `job-tracker/src/app/api/project-bullets/route.js`
- `job-tracker/src/app/api/project-bullets/[id]/route.js`
- `job-tracker/src/components/features/projects/ProjectBulletsPanel.jsx`
- `job-tracker/src/app/bullets/page.js`
- `job-tracker/src/app/page.js` (updated navigation)
- `job-tracker/src/lib/server/db/__tests__/projectBulletsRepo.test.js`
- `job-tracker/src/app/api/project-bullets/__tests__/validation.test.js`
- `_bmad-output/implementation-artifacts/5-2-create-and-manage-project-bullets-evidence-items.md` (this story file)

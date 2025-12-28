# Story 2.2: Application Inbox List and Detail View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,
I want to see an inbox list of my applications and open a detail view,
so that I can quickly navigate between applications during my nightly workflow.

## Acceptance Criteria

1. Given I am signed in and have at least one application, when I open the application inbox, then I see a list of my applications with key fields (company, role, status, applied date if set), and selecting an item opens its detail view.
2. Given I open an application detail view, when the data loads, then I can view and edit the application fields, and the UI preserves my context (selected item) after refresh when possible.
3. Given I have zero applications, when I open the inbox, then I see a clear empty state, and I see a primary action to create a new application.

## Tasks / Subtasks

- [x] Ensure Story 2.1 is implemented first.
  - [x] `GET /api/applications` returns a list for the signed-in user.
  - [x] `GET /api/applications/[id]` and `PATCH /api/applications/[id]` work with RLS and non-inference behavior.

- [x] Implement the "inbox + detail" UI layout (list-driven navigation).
  - [x] Align to UX direction: left list + center detail (3-panel can come later; start with 2-panel).
  - [x] Create feature components under:
    - `./job-tracker/src/components/features/applications/`
      - `ApplicationsInbox.jsx` (layout orchestration)
      - `ApplicationsList.jsx` (left panel) - using existing `ApplicationList.jsx`
      - `ApplicationDetail.jsx` (center panel)
  - [x] Keep the initial workspace entry (`./job-tracker/src/app/page.js`) as the shell and mount the inbox there.

- [x] Build applications list panel.
  - [x] Load list from `GET /api/applications` on page load.
  - [x] Render each row with key fields:
    - Company, role, status, appliedDate (if present)
  - [x] Selection:
    - Clicking a row sets it as selected and loads detail.
    - Visually indicate selected row.

- [x] Build application detail panel (view + edit).
  - [x] On selection, load the full record from `GET /api/applications/[id]`.
  - [x] Render editable fields (reuse the same edit component from Story 2.1 if you built one).
  - [x] Save via `PATCH /api/applications/[id]`:
    - Show loading state while saving.
    - Show "Saved" confirmation on success.
    - Show actionable error + retry on failure without clearing unsaved edits.
  - [x] Inline validation stays consistent with Story 2.1:
    - If status requires appliedDate and it's missing, block save and show inline message.

- [x] Preserve selected item after refresh when possible.
  - [x] Store selected application id in the URL query (preferred) or localStorage.
    - Preferred: `/?applicationId=<uuid>` and `router.replace` on selection.
  - [x] On load:
    - If `applicationId` exists, attempt to load it.
    - If it's not found (404) or unauthorized, fall back to first list item or empty state.

- [x] Empty state + create primary action.
  - [x] If list is empty:
    - Show "No applications yet" message.
    - Show primary action "Create application".
  - [x] Create action should open the create form and, on success, auto-select the newly created record.

- [ ] Manual verification (maps 1:1 to AC).
  - [ ] Sign in with at least one application → inbox shows list, selecting opens detail.
  - [ ] Edit and save in detail view → changes persist, saved confirmation shown.
  - [ ] Refresh page → selected application preserved via URL param.
  - [ ] Delete all applications (or new user) → empty state shown with create action.
  - [ ] Create from empty state → new application selected automatically.

## Dev Notes

### UX & Layout Guidance

From `_bmad-output/project-planning-artifacts/ux-design-specification.md`:
- List-driven retrieval; optimize for nightly workflow scanning.
- Layout direction: left navigation/list + center record workspace; preserve context after refresh when possible.
- Use shadcn/ui primitives for lists, forms, buttons.

### Scope

In scope:
- Inbox list + detail view wiring
- Selection + context preservation
- Empty state and create action

Out of scope:
- Search/filter (Story 2.3)
- Timeline/history (Story 2.4)
- Follow-up prompts (Story 2.5)

### Developer Guardrails (Must-Follow)

From `_bmad-output/project-context.md`:
- JavaScript only (`.js/.jsx`), ESM only.
- UI must not access Supabase directly for data; use Route Handlers and server repos.
- Non-stream endpoints return `{ data, error }` envelope; handle `UNAUTHORIZED` codes gracefully in UI.

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 2 → Story 2.2)
- UX direction: `_bmad-output/project-planning-artifacts/ux-design-specification.md`
- Architecture UI placement: `_bmad-output/architecture.md` (suggested `src/components/features/applications/**`)
- API baseline: `_bmad-output/implementation-artifacts/2-1-create-and-edit-application-records-with-validation-and-data-isolation.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- **Story 2-1 Pre-work**: `ApplicationsInbox.jsx` and `ApplicationDetail.jsx` were initially created in Story 2-1 as basic components
- **Story 2-2 Enhancements**: Enhanced existing components with full inbox functionality:
  - Updated `ApplicationsInbox.jsx` with 2-panel layout orchestration (left list + center detail)
  - Updated `ApplicationDetail.jsx` for viewing and editing single applications with inline validation
  - Integrated with existing `ApplicationList.jsx` from Story 2.1 for the list panel
- Implemented URL-based selection persistence using `useSearchParams` and `router.replace`
- Auto-selects from URL param on load, falls back to first item if not found
- Empty state shows "No applications yet" with "Create Application" action
- Create mode opens form in detail panel, auto-selects on success
- Updated main `page.js` to use wider layout (max-w-6xl) for 2-panel design
- **Note on Filters**: This story integrates `ApplicationFilters` component which was developed as part of Story 2-3. Stories 2-2 and 2-3 were implemented in parallel and share the inbox layout.
- Build and lint passed successfully
- **Code review fixes applied (2025-12-27):**
  - Updated architecture.md to document 2-panel inbox layout with component responsibilities and URL-based persistence
  - Clarified Story boundaries: ApplicationsInbox and ApplicationDetail were created in Story 2-1, enhanced in Story 2-2
  - Documented cross-story dependency on ApplicationFilters (Story 2-3)
  - Replaced console.error with structured JSON logging in ApplicationsInbox (3 locations) and ApplicationDetail (3 locations - project-context compliance)
  - Updated file list to reflect accurate created/updated status and include architecture.md changes
- Manual verification pending

### File List

- `./job-tracker/src/components/features/applications/ApplicationsInbox.jsx` (updated - enhanced from Story 2-1 with full 2-panel layout)
- `./job-tracker/src/components/features/applications/ApplicationDetail.jsx` (updated - enhanced from Story 2-1 with inline editing, updated - structured logging)
- `./job-tracker/src/app/page.js` (updated - integrated ApplicationsInbox, wider layout)
- `_bmad-output/architecture.md` (updated - documented 2-panel inbox layout)
- `_bmad-output/implementation-artifacts/2-2-application-inbox-list-and-detail-view.md` (this story file)

---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/prd.md
  - _bmad-output/architecture.md
  - _bmad-output/project-context.md
  - _bmad-output/project-planning-artifacts/product-brief-job-tracker-2025-12-26.md
  - _bmad-output/project-planning-artifacts/ux-design-specification.md
---

# job-tracker - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for job-tracker, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can create an account and sign in to access their workspace.
FR2: User can sign out.
FR3: System can persist the user’s data across sessions.
FR4: User can configure job search preferences used for “high-fit” evaluation (role level, locations, visa filter, role focus, keywords).
FR5: User can configure generation preferences used by AI outputs (e.g., tone, emphasis, keywords to include/avoid).
FR6: User can create an application by pasting a job URL.
FR7: System can identify the job source type from the URL (Seek, LinkedIn, company career page, or unknown).
FR8: System can attempt to extract structured job fields from the URL when available (company, role title, location, job description text).
FR9: User can edit and correct any extracted job fields.
FR10: User can complete an application by manually pasting the job description text when extraction fails or is incomplete.
FR11: System can store a job description snapshot (text) per application for later reference.
FR12: System can detect potential duplicates (same URL and/or same company+role) and allow the user to proceed intentionally (e.g., keep both or treat as the same application).
FR13: System can extract responsibilities and requirements/skills from the job description snapshot.
FR14: User can review and edit the extracted responsibilities/requirements.
FR15: System can detect low-signal/vague job descriptions and prompt the user to select the key responsibilities to drive the application materials.
FR16: System can maintain a requirements list that is linked to the specific application record.
FR17: User can create, view, edit, and delete projects/experiences.
FR18: User can create, view, edit, and delete reusable project bullets (skills, responsibilities, outcomes).
FR19: User can tag/search/filter their project bullets to find relevant evidence quickly.
FR20: User can update their project library over time and reuse it across multiple applications.
FR21: System can propose a mapping from application requirements/responsibilities to the user’s project bullets.
FR22: User can review, adjust, and confirm the requirement → project-bullets mapping before cover letter generation.
FR23: System can highlight uncovered requirements (no strong evidence found) and allow the user to resolve them (e.g., add a bullet, choose alternative evidence, or explicitly leave it uncovered).
FR24: System can store the confirmed mapping per application for later retrieval and regeneration.
FR25: User can generate a cover letter draft for an application based on the confirmed mapping and job description.
FR26: User can iterate on cover letter generation using additional user-provided constraints (e.g., emphasis, tone, keywords).
FR27: User can edit and save a final cover letter version per application.
FR28: User can retrieve the saved final cover letter for any application at any time.
FR29: User can record cover letter submission notes per application (e.g., where it was submitted, what version was used).
FR30: User can create and maintain an application record with required fields (status, applied date, company, role, link, notes).
FR31: User can change application status manually at any time.
FR32: User can search and filter applications by key fields (status, company, role, date, source).
FR33: User can view an application timeline/history sufficient to support “traceability” of what was submitted.
FR34: System can surface applications that have had no response after a defined period (e.g., 7 days) and prompt the user to follow up.
FR35: User can generate an interview preparation pack per application based on extracted requirements and optional company context notes.
FR36: User can store interview preparation notes per application for later review.

### NonFunctional Requirements

NFR1 (Performance, NFR-P1): On supported environment (desktop Chrome latest stable), core non-AI user actions (navigate views, search/filter, save edits, update status) complete within < 2 seconds under normal conditions.
NFR2 (Performance, NFR-P2): AI-heavy operations (JD analysis, mapping proposal, cover letter generation) may take longer, but the system provides clear in-progress state and does not block unrelated UI actions.
NFR3 (Performance, NFR-P3): When AI operations fail, the system provides an actionable error and supports retry without requiring the user to re-enter previously provided inputs.
NFR4 (Reliability, NFR-R1): Parsing failures and generation failures must not cause data loss; application records, JD snapshots, notes, and project library entries remain intact.
NFR5 (Reliability, NFR-R2): The system persists user edits reliably; after refresh/re-login, previously saved applications and final cover letter versions remain accessible.
NFR6 (Reliability, NFR-R3): The system preserves workflow progress (e.g., extracted requirements, confirmed mappings) so the user can resume an in-progress application without restarting.
NFR7 (Security & Privacy, NFR-S1): Only authenticated users can access application data; all reads/writes are scoped to the signed-in user.
NFR8 (Security & Privacy, NFR-S2): The system supports account deletion that permanently deletes the user account and all associated personal data (applications, JD snapshots, project library, generated materials) such that it is no longer retrievable through the product.
NFR9 (Accessibility, NFR-A1): Baseline usable accessibility for a personal productivity tool: keyboard operability for core flows, labeled form controls, visible focus states, and readable contrast.

### Additional Requirements

- Selected starter template: bootstrap with `create-next-app@latest` using `--js` (App Router), Tailwind, and ESLint; add shadcn/ui.
- Deployment on Vercel; use Vercel Logs; optional future advanced observability (e.g., Sentry).
- Database/Auth: Supabase Postgres + Supabase Auth; Magic Link (email OTP) sign-in for MVP.
- Data isolation: enable Postgres Row Level Security (RLS) on all user-owned tables; all reads/writes are user-scoped.
- Privileged operations: Supabase service role key MUST remain server-only (background/admin tasks like account deletion and cron jobs).
- Schema management: use Supabase CLI migrations (SQL files committed) for traceable schema evolution (`supabase/migrations/**`).
- AI provider integration (via third-party gateway): server-only `fetch` adapters (no vendor SDKs); pluggable provider selection using server-only env vars (`OPENAI_BASE_URL`/`OPENAI_API_KEY`, `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`).
- Streaming-first AI UX: generation endpoints stream results; stream `delta` chunks; emit terminal `error` event with stable error code/message; canonical cover-letter streaming endpoint: `POST /api/cover-letter/stream`.
- Asynchronous/retryable workflows: AI-heavy operations are async, retryable, and preserve intermediate state (e.g., parsed/needs JD/requirements ready/mapping confirmed/draft saved); ingestion/parsing and generation are idempotent.
- Follow-up reminders: Vercel Cron triggers a protected Route Handler; requires `Authorization: Bearer $CRON_SECRET`; cron jobs must be idempotent (safe to retry) and avoid duplicate reminder creation.
- UX platform: desktop-first SPA-style navigation optimized for desktop Chrome nightly sessions; mobile browsers are out of scope for MVP; breakpoint guidance includes collapsing the left list around ~768–899px.
- UX state visibility & recovery: clear saved/loading/error states; no dead ends; every loading/error state provides a visible escape hatch (cancel/retry/fallback like “Paste JD”).
- UX accessibility baseline: keyboard operability for core flows, labeled inputs, visible focus states, adequate contrast; announce status changes; preserve focus and avoid “jumping UI” during async operations.
- Implementation constraints (from project context): JavaScript only (no TypeScript); Node.js >= 20.9.0; Next.js App Router 16.1.1; Tailwind CSS 4.1.18 + shadcn/ui; `react-hook-form` + `zod` for forms/validation; React Query + Zustand for state.

### FR Coverage Map

FR1: Epic 1 - Account sign-in to access workspace.
FR2: Epic 1 - Sign out.
FR3: Epic 1 - Persist user data across sessions.
FR4: Epic 1 (Non-MVP) - Configure job search preferences for high-fit evaluation.
FR5: Epic 1 (Non-MVP) - Configure AI generation preferences.
FR6: Epic 3 - Create an application by pasting a job URL.
FR7: Epic 3 - Identify job source type from URL.
FR8: Epic 3 - Extract structured job fields when available.
FR9: Epic 3 - Edit/correct extracted job fields.
FR10: Epic 3 - Manual JD paste fallback.
FR11: Epic 3 - Store JD snapshot per application.
FR12: Epic 3 - Detect potential duplicates and allow intentional proceed.
FR13: Epic 4 - Extract responsibilities and requirements from JD snapshot.
FR14: Epic 4 - Review/edit extracted responsibilities/requirements.
FR15: Epic 4 - Detect low-signal JD and prompt user to select key responsibilities.
FR16: Epic 4 - Maintain application-linked requirements list.
FR17: Epic 5 - CRUD projects/experiences.
FR18: Epic 5 - CRUD reusable project bullets (skills/responsibilities/outcomes).
FR19: Epic 5 - Tag/search/filter project bullets.
FR20: Epic 5 - Reuse and evolve evidence library over time.
FR21: Epic 5 - Propose requirement/responsibility → project-bullets mapping.
FR22: Epic 5 - Review/adjust/confirm mapping before generation.
FR23: Epic 5 - Highlight uncovered requirements and enable user resolution.
FR24: Epic 5 - Store confirmed mapping per application.
FR25: Epic 6 - Generate cover letter draft based on confirmed mapping + JD.
FR26: Epic 6 - Iterate generation with additional constraints.
FR27: Epic 6 - Edit and save final cover letter version.
FR28: Epic 6 - Retrieve saved final cover letter anytime.
FR29: Epic 6 - Record cover letter submission notes per application.
FR30: Epic 2 - Maintain application record with required fields.
FR31: Epic 2 - Change application status manually.
FR32: Epic 2 - Search/filter applications.
FR33: Epic 2 - View application timeline/history for traceability.
FR34: Epic 2 (Non-MVP) - Surface no-response follow-up prompts after a defined period.
FR35: Epic 4 (Non-MVP) - Generate interview preparation pack per application.
FR36: Epic 4 (Non-MVP) - Store interview preparation notes per application.

## Epic List

### Epic 1: Account & Settings (Foundation)
Users can sign in to a private workspace with durable data, establishing a secure baseline for all job-application work.
**FRs covered:** FR1, FR2, FR3, FR4 (Non-MVP), FR5 (Non-MVP)

### Epic 2: Application Inbox & Traceability
Users can manage application records end-to-end (status, search/filter, and history) to reliably retrieve what they applied with and when.
**FRs covered:** FR30, FR31, FR32, FR33, FR34 (Non-MVP)

### Epic 3: Job Capture & JD Snapshot
Users can create an application from a job link, recover from parsing failures via manual JD paste, and preserve a JD snapshot for future steps.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12

### Epic 4: JD Requirements Extraction (and Later: Interview Prep)
Users can turn a JD snapshot into an editable, application-linked list of responsibilities/requirements that drives evidence mapping and generation.
**FRs covered:** FR13, FR14, FR15, FR16, FR35 (Non-MVP), FR36 (Non-MVP)

### Epic 5: Evidence Library & Mapping Workbench
Users can maintain a reusable evidence library and confirm a requirement-to-evidence mapping before any cover letter is generated, including handling uncovered requirements.
**FRs covered:** FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24

### Epic 6: Cover Letter Drafting & Versioning
Users can generate, iterate, edit, and save final cover letter versions grounded in confirmed mapping, and attach submission notes for traceability.
**FRs covered:** FR25, FR26, FR27, FR28, FR29

## Epic 1: Account & Settings (Foundation)

Users can sign in to a private workspace (Supabase Magic Link) with a durable session boundary, forming the secure baseline for all subsequent epics.

### Story 1.1: Set Up Initial Project from Starter Template

As a developer,
I want to bootstrap the initial Next.js project from the selected starter template and baseline tooling,
So that the team has a working foundation to implement user-facing features safely and consistently.

**Implements:** (Architecture requirement: Selected Starter Template — `create-next-app --js` + Tailwind + shadcn/ui)

**Acceptance Criteria:**

**Given** the repository is ready for initial bootstrap,
**When** the project is created using `create-next-app` with JavaScript (App Router) and Tailwind,
**Then** the app starts successfully in development,
**And** the default page renders without runtime errors.

**Given** the baseline UI foundation is required,
**When** shadcn/ui is installed and configured for the project,
**Then** a minimal shadcn/ui component can be rendered in the app,
**And** styling works as expected with Tailwind.

**Given** the project will be deployed later,
**When** the app is built in production mode,
**Then** the build completes successfully,
**And** ESLint checks (as configured by Next.js) run without failing the build.

### Story 1.2: Magic Link Sign-In and Protected Workspace

As a user,
I want to sign in via email Magic Link and access a protected workspace,
So that my job-application data is private and persists across sessions.

**Implements:** FR1, FR3

**Acceptance Criteria:**

**Given** I am signed out,
**When** I open the app (or navigate to any protected page),
**Then** I am redirected to a sign-in screen,
**And** I cannot view any user data until I successfully sign in.

**Given** I am on the sign-in screen,
**When** I enter a valid email address and request a Magic Link,
**Then** the app shows a clear “check your email” confirmation state,
**And** if the request fails, it shows an actionable error and allows retry without losing the entered email.

**Given** I click a valid Magic Link and return to the app,
**When** the session is established,
**Then** I land on the authenticated workspace entry point,
**And** my authenticated state remains valid after a page refresh.

**Given** I click an expired or invalid Magic Link,
**When** the app attempts to establish a session,
**Then** I see a clear error message,
**And** I am able to request a new Magic Link.

### Story 1.3: Sign Out and Session Boundary

As a signed-in user,
I want to sign out and fully end my session,
So that my workspace is not accessible to others on this device/browser.

**Implements:** FR2

**Acceptance Criteria:**

**Given** I am signed in,
**When** I click “Sign out”,
**Then** my session is terminated,
**And** I am redirected to the sign-in screen.

**Given** I have signed out,
**When** I attempt to access any protected page (including via back/forward navigation),
**Then** I am redirected to the sign-in screen,
**And** no previously loaded user data is displayed.

**Given** I have signed out,
**When** the app makes any authenticated API request without a valid session,
**Then** the API returns an unauthorized response,
**And** the UI shows an actionable sign-in prompt (not a broken state).

### Story 1.4: (Non-MVP) High-Fit Preferences Settings

As a signed-in user,
I want to configure my job search preferences (e.g., role level, locations, visa filter, role focus, keywords),
So that the system can later evaluate “high-fit” jobs according to my preferences.

**Implements:** FR4 (Non-MVP)

**Acceptance Criteria:**

**Given** I am signed in,
**When** I open “Settings” and edit my high-fit preferences,
**Then** I can save the changes successfully,
**And** the saved values persist after refresh/re-login.

**Given** I am signed out,
**When** I attempt to access Settings,
**Then** I am redirected to sign-in,
**And** my preferences remain private to my account.

### Story 1.5: (Non-MVP) Generation Preferences Settings

As a signed-in user,
I want to configure cover letter generation preferences (tone, emphasis, keywords to include/avoid),
So that future AI-generated drafts can be tailored to my personal defaults.

**Implements:** FR5 (Non-MVP)

**Acceptance Criteria:**

**Given** I am signed in,
**When** I open “Settings” and edit my generation preferences,
**Then** I can save the changes successfully,
**And** the saved values persist after refresh/re-login.

**Given** saving preferences fails,
**When** the error occurs,
**Then** I see an actionable error message and can retry,
**And** the form preserves my unsaved edits.

## Epic 2: Application Inbox & Traceability

Users can create and maintain application records, search and filter them, and review an auditable history of key changes to support traceability of what was submitted and when.

### Story 2.1: Create and Edit Application Records (with Validation and Data Isolation)

As a signed-in user,
I want to create and edit an application record (company, role, link, status, applied date, notes),
So that I can reliably track my job applications in one place.

**Implements:** FR30, FR31

**Acceptance Criteria:**

**Given** I am signed in,
**When** I create a new application with at least company and role,
**Then** the application is saved successfully,
**And** I can later reopen it and see the saved values.

**Given** I am creating or editing an application,
**When** I set status to `Applied` (or any status after Applied),
**Then** the UI requires an `applied date` before saving,
**And** the user sees a clear, inline validation message if it is missing.

**Given** I am creating or editing an application,
**When** I set status to `Draft`,
**Then** `applied date` is optional,
**And** saving succeeds without requiring a date.

**Given** I am signed in,
**When** I edit the application fields (company, role, link, notes, status, applied date) and save,
**Then** the changes persist after refresh/re-login,
**And** I see a clear saved/loading/error state with an actionable retry on failure.

**Given** two different users exist,
**When** user A attempts to access or modify user B’s application by ID,
**Then** access is denied (no data is returned),
**And** user A cannot infer user B’s application existence.

### Story 2.2: Application Inbox List and Detail View

As a signed-in user,
I want to see an inbox list of my applications and open a detail view,
So that I can quickly navigate between applications during my nightly workflow.

**Implements:** FR30

**Acceptance Criteria:**

**Given** I am signed in and have at least one application,
**When** I open the application inbox,
**Then** I see a list of my applications with key fields (company, role, status, applied date if set),
**And** selecting an item opens its detail view.

**Given** I open an application detail view,
**When** the data loads,
**Then** I can view and edit the application fields,
**And** the UI preserves my context (selected item) after refresh when possible.

**Given** I have zero applications,
**When** I open the inbox,
**Then** I see a clear empty state,
**And** I see a primary action to create a new application.

### Story 2.3: Search and Filter Applications

As a signed-in user,
I want to search and filter my applications by common fields,
So that I can quickly find a specific application and manage my pipeline.

**Implements:** FR32

**Acceptance Criteria:**

**Given** I am signed in,
**When** I filter by status,
**Then** the list updates to show only matching applications,
**And** clearing the filter restores the full list.

**Given** I am signed in,
**When** I search by company and/or role,
**Then** the list updates to show matching results,
**And** the results update predictably as I change the query.

**Given** I am signed in,
**When** I filter by date (applied date),
**Then** only applications within the selected date range are shown,
**And** applications without an applied date are handled consistently (excluded from applied-date filtering).

**Given** I am signed in,
**When** I filter by source,
**Then** applications with unknown source can still be found under `unknown`,
**And** this does not depend on job-link parsing being implemented yet.

### Story 2.4: Application Timeline / Change History (Traceability)

As a signed-in user,
I want to view a timeline/history of meaningful changes to an application,
So that I can answer “what did I submit, when, and what changed?” with confidence.

**Implements:** FR33

**Acceptance Criteria:**

**Given** I am signed in and viewing an application,
**When** I update its status,
**Then** a new timeline event is recorded,
**And** the timeline shows at least the status transition and timestamp.

**Given** I am signed in and viewing an application,
**When** I change any of these important fields: company, role, or link,
**Then** a new timeline event is recorded,
**And** the timeline shows the field changed and the before/after values.

**Given** I am signed in,
**When** I reload the page or return later,
**Then** the timeline remains available and consistent,
**And** it only contains my own application history (user-scoped).

**Given** saving an update fails,
**When** the error occurs,
**Then** no partial or duplicated timeline events are created for that failed save,
**And** the UI supports retry without losing my edits.

### Story 2.5: (Non-MVP) No-Response Follow-Up Prompts

As a signed-in user,
I want the system to surface applications that have had no response after a defined period (e.g., 7 days),
So that I remember to follow up consistently.

**Implements:** FR34 (Non-MVP)

**Acceptance Criteria:**

**Given** an application is in status `Applied` and the applied date is more than 7 days in the past,
**When** I open the inbox,
**Then** the application is visibly flagged as needing follow-up,
**And** I can dismiss/clear the flag by updating status or confirming follow-up was done.

**Given** the follow-up prompt computation runs multiple times,
**When** it evaluates the same application repeatedly,
**Then** it does not create duplicate follow-up markers,
**And** behavior is idempotent and user-scoped.

## Epic 3: Job Capture & JD Snapshot

Users can paste a job URL to create an application, the system attempts best-effort extraction for supported sources (Seek/LinkedIn), and the user can always recover by editing fields and pasting a JD snapshot.

### Story 3.1: Paste Job URL to Create Application with Source Detection and Best-Effort Extraction

As a signed-in user,
I want to paste a job URL to create a new application and automatically detect the source and extract job details when possible,
So that I can move quickly from “job found” to a usable application record.

**Implements:** FR6, FR7, FR8

**Acceptance Criteria:**

**Given** I am signed in,
**When** I paste a valid job URL and submit,
**Then** a new application record is created in `Draft` status,
**And** the job `source` is set to one of `seek`, `linkedin`, `company`, or `unknown` based on URL patterns.

**Given** I submit a job URL from `seek` or `linkedin`,
**When** the system performs best-effort extraction,
**Then** it attempts to populate available fields (company, role title, location, and JD text if obtainable),
**And** the UI shows a clear in-progress state without blocking unrelated navigation.

**Given** best-effort extraction fails or yields incomplete data,
**When** the attempt completes,
**Then** the application record still exists (no data loss),
**And** the UI clearly indicates what is missing and offers a primary recovery action (“Paste JD”).

**Given** I submit a URL from a company career page or an unknown site,
**When** the system processes the URL,
**Then** it records the URL and sets source to `company` or `unknown`,
**And** it does not block me from continuing via manual edits and JD paste.

### Story 3.2: Review and Edit Extracted Job Fields

As a signed-in user,
I want to review and edit extracted job fields (company, role title, location, and JD text if present),
So that I can correct parsing mistakes and ensure downstream steps are based on accurate inputs.

**Implements:** FR9

**Acceptance Criteria:**

**Given** I am signed in and viewing an application created from a URL,
**When** extracted fields are available,
**Then** I can edit company, role title, location, and the JD text (if present),
**And** I can save my edits successfully.

**Given** I save edits to job fields,
**When** I refresh or re-login,
**Then** the edited values persist,
**And** the UI shows clear saved/loading/error states with actionable retry on failure.

**Given** job fields are partially missing after extraction,
**When** I open the application,
**Then** missing fields are clearly indicated,
**And** the UI guides me toward the next recovery step (e.g., “Paste JD” if JD text is missing).

### Story 3.3: Manual JD Snapshot Paste and Storage

As a signed-in user,
I want to paste the full job description text and save it as a JD snapshot on the application,
So that downstream requirement extraction and generation can proceed even when parsing fails.

**Implements:** FR10, FR11

**Acceptance Criteria:**

**Given** I am signed in and an application’s JD text is missing or incorrect,
**When** I paste JD text into the provided input and save,
**Then** the application stores the JD snapshot text successfully,
**And** I can view the saved snapshot later on the application.

**Given** I paste a JD snapshot and save,
**When** saving completes,
**Then** I see a clear confirmation that the snapshot is stored,
**And** if saving fails, my pasted text remains in the UI for retry (no re-entry required).

**Given** a JD snapshot already exists,
**When** I update the snapshot with a new pasted JD text and save,
**Then** the stored snapshot is replaced with the latest version,
**And** downstream steps always use the latest saved snapshot.

### Story 3.4: Duplicate Detection for Job URL and Company+Role

As a signed-in user,
I want the system to detect potential duplicate applications by URL and by company+role,
So that I avoid accidental duplicates while still being able to proceed intentionally.

**Implements:** FR12

**Acceptance Criteria:**

**Given** I am signed in and attempt to create an application with a job URL that already exists in my applications,
**When** the duplicate is detected,
**Then** I see a strong duplicate warning before creation,
**And** I must explicitly confirm to proceed with creating another application anyway.

**Given** I attempt to create an application where company+role matches an existing application (even if URL differs or is missing),
**When** the potential duplicate is detected,
**Then** I see a weaker warning indicating a possible duplicate,
**And** I can proceed without extra confirmation if I choose.

**Given** duplicate detection is triggered,
**When** I choose to proceed,
**Then** the new application is created successfully,
**And** the original application remains unchanged.

## Epic 4: JD Requirements Extraction (and Later: Interview Prep)

Users can extract and maintain an editable list of responsibilities and requirements/skills from a JD snapshot, with a recovery loop for low-signal JDs; these lists become the single source of truth for mapping and generation.

### Story 4.1: Extract Responsibilities and Requirements from JD Snapshot

As a signed-in user,
I want the system to extract responsibilities and requirements/skills from my saved JD snapshot,
So that I can quickly get an editable starting point for evidence mapping and cover letter generation.

**Implements:** FR13

**Acceptance Criteria:**

**Given** I am signed in and an application has a saved JD snapshot,
**When** I trigger “Extract requirements”,
**Then** the system generates two lists: responsibilities and requirements/skills,
**And** both lists are saved to the application for later retrieval.

**Given** extraction completes,
**When** I revisit the application later,
**Then** I can view the saved responsibilities and requirements/skills lists,
**And** they persist across refresh/re-login.

**Given** extraction fails,
**When** the error occurs,
**Then** I see an actionable error message and can retry,
**And** my JD snapshot and any previously saved lists remain intact.

**Given** there is no JD snapshot on the application,
**When** I attempt to extract requirements,
**Then** the UI blocks the action with a clear prompt to paste the JD first,
**And** it provides a direct “Paste JD” action.

### Story 4.2: Edit and Maintain the Application Requirements Lists

As a signed-in user,
I want to review and edit the extracted responsibilities and requirements/skills,
So that the final lists reflect what I believe matters for this application.

**Implements:** FR14, FR16

**Acceptance Criteria:**

**Given** I am signed in and viewing extracted lists,
**When** I add, edit, delete, or reorder items in either list and save,
**Then** my changes persist across refresh/re-login,
**And** the UI shows clear saved/loading/error states with retry on failure.

**Given** I am editing the lists,
**When** I decide the extraction missed an important requirement,
**Then** I can add a new item manually,
**And** the item is treated the same as extracted items downstream.

**Given** I am editing the lists,
**When** I want to reduce noise,
**Then** I can delete or consolidate items,
**And** the saved lists reflect the final reduced set.

### Story 4.3: Low-Signal JD Detection and Key-Responsibility Selection

As a signed-in user,
I want the system to detect when a JD is low-signal and help me select the key responsibilities to focus on,
So that mapping and generation are driven by what matters most instead of noisy text.

**Implements:** FR15

**Acceptance Criteria:**

**Given** I have a JD snapshot and run extraction,
**When** the system detects the JD is low-signal (e.g., overly generic, too long, or noisy),
**Then** the UI informs me clearly,
**And** it prompts me to select a subset of key responsibilities to drive subsequent steps.

**Given** I am prompted to select key responsibilities,
**When** I choose and confirm my selection,
**Then** the application stores the selected key responsibilities,
**And** the UI reflects that selection as the “focus set” for downstream mapping/generation.

**Given** I do not want to select a focus set,
**When** I dismiss the prompt,
**Then** I can proceed with the full extracted lists,
**And** the system does not block progress.

### Story 4.4: (Non-MVP) Interview Preparation Pack and Notes

As a signed-in user,
I want to generate an interview preparation pack from the extracted requirements and my notes,
So that I can practice consistently for interviews for that application.

**Implements:** FR35, FR36 (Non-MVP)

**Acceptance Criteria:**

**Given** an application has saved requirements and (optionally) company context notes,
**When** I request an interview prep pack,
**Then** the system generates role- and company-aware mock Q&A with suggested talking points,
**And** the output is saved to the application for later review.

**Given** I am viewing an interview prep pack,
**When** I add interview preparation notes and save,
**Then** the notes persist across refresh/re-login,
**And** they remain scoped to this application.

## Epic 5: Evidence Library & Mapping Workbench

Users can maintain a reusable evidence library (projects and bullets), search it, and map application requirements to concrete evidence before any cover letter is generated; uncovered requirements are made explicit and resolvable.

### Story 5.1: Create and Manage Projects/Experiences

As a signed-in user,
I want to create, view, edit, and delete my projects/experiences,
So that I can maintain a structured evidence library to reuse across applications.

**Implements:** FR17

**Acceptance Criteria:**

**Given** I am signed in,
**When** I create a new project with a name and basic description,
**Then** it is saved successfully,
**And** I can view it later after refresh/re-login.

**Given** I am signed in and a project exists,
**When** I edit its details and save,
**Then** the changes persist,
**And** the UI shows clear saved/loading/error states with retry on failure.

**Given** I am signed in and a project exists,
**When** I delete the project and confirm,
**Then** the project is removed from my library,
**And** it no longer appears in lists or selectors.

**Given** two different users exist,
**When** user A attempts to access user B’s projects by ID,
**Then** access is denied (no data returned),
**And** user A cannot infer user B’s project existence.

### Story 5.2: Create and Manage Project Bullets (Evidence Items)

As a signed-in user,
I want to create, view, edit, and delete reusable project bullets tied to a project,
So that I can map job requirements to specific evidence quickly.

**Implements:** FR18

**Acceptance Criteria:**

**Given** I am signed in and a project exists,
**When** I add a new bullet with required bullet text (1–3 sentences),
**Then** the bullet is saved under that project,
**And** it can be retrieved later after refresh/re-login.

**Given** I am creating or editing a bullet,
**When** I optionally add a title, tags, or metrics/impact,
**Then** those optional fields are saved and retrievable,
**And** leaving them empty still allows saving.

**Given** I edit an existing bullet and save,
**When** the save completes,
**Then** the updated bullet replaces the old version,
**And** future mapping uses the latest saved bullet content.

**Given** I delete a bullet,
**When** I confirm deletion,
**Then** it is removed from the project,
**And** it no longer appears in search results or mapping pickers.

### Story 5.3: Tagging, Search, and Filtering for Bullets

As a signed-in user,
I want to tag bullets and search/filter them,
So that I can find relevant evidence quickly during mapping.

**Implements:** FR19, FR20

**Acceptance Criteria:**

**Given** I am signed in and bullets exist,
**When** I add or remove free-form string tags on a bullet and save,
**Then** the tags persist across refresh/re-login,
**And** tags remain private to my account (user-scoped).

**Given** I am signed in,
**When** I search bullets by text (and optionally by tag),
**Then** results update predictably,
**And** I can clear search/filters to return to the full set.

**Given** I filter by a tag,
**When** multiple bullets match,
**Then** I see only bullets with that tag,
**And** I can combine tag + text search without breaking the UI.

### Story 5.4: Propose Requirement-to-Bullet Mapping (Non-AI, Rule-Based)

As a signed-in user,
I want the system to propose a mapping from application requirements/responsibilities to my project bullets,
So that I start mapping from a helpful draft rather than from scratch.

**Implements:** FR21

**Acceptance Criteria:**

**Given** an application has saved responsibilities and requirements/skills,
**When** I request a mapping proposal,
**Then** the system produces a candidate mapping for each item (or marks it as having no strong matches),
**And** the proposal is generated without calling an AI provider (rule/keyword based).

**Given** a mapping proposal is generated,
**When** I view it,
**Then** I can see suggested bullet(s) per requirement/responsibility item,
**And** I can proceed to adjust it in the mapping workbench.

**Given** proposal generation fails,
**When** the error occurs,
**Then** I see an actionable error and can retry,
**And** the application’s requirements lists remain unchanged.

### Story 5.5: Mapping Workbench — Review, Confirm, and Persist Mapping (Including Uncovered Requirements)

As a signed-in user,
I want to review, adjust, and confirm the requirement → project-bullets mapping and explicitly mark uncovered requirements,
So that cover letter generation is grounded in evidence I approve and gaps are visible.

**Implements:** FR22, FR23, FR24

**Acceptance Criteria:**

**Given** an application has requirements/responsibilities and (optionally) a proposed mapping,
**When** I open the mapping workbench,
**Then** I can assign one or more bullets to each item,
**And** I can remove or replace suggested bullets.

**Given** an item has no suitable evidence,
**When** I mark it as uncovered,
**Then** the UI clearly shows it as uncovered,
**And** I can later resolve it by adding a new bullet or selecting alternative evidence.

**Given** I confirm the mapping,
**When** I save/confirm,
**Then** the confirmed mapping is persisted on the application,
**And** I can revisit the application later and retrieve the confirmed mapping.

**Given** I have a confirmed mapping,
**When** I update it and reconfirm,
**Then** the latest confirmed mapping replaces the previous version,
**And** no partial/inconsistent state is saved on failure (retry is supported without losing edits).

## Epic 6: Cover Letter Drafting & Versioning

Users can generate a cover letter draft grounded in confirmed mapping, iterate with constraints, and manage a simple version model (latest draft + final) with submission notes for traceability.

### Story 6.1: Generate Cover Letter Draft from Confirmed Mapping

As a signed-in user,
I want to generate a cover letter draft for an application based on the confirmed mapping and JD snapshot,
So that I can start from an evidence-based draft instead of writing from scratch.

**Implements:** FR25

**Acceptance Criteria:**

**Given** an application has a saved JD snapshot and a confirmed mapping,
**When** I request “Generate cover letter draft,”
**Then** the system generates a draft grounded in the confirmed mapping,
**And** the draft is saved as the application’s latest draft.

**Given** I request generation,
**When** generation is in progress,
**Then** the UI shows a clear streaming/in-progress state,
**And** I can navigate elsewhere in the app without the UI breaking.

**Given** generation completes,
**When** I view the application,
**Then** I can read the latest saved draft,
**And** I can regenerate later to replace the latest draft.

**Given** the application is missing a confirmed mapping or JD snapshot,
**When** I attempt to generate a draft,
**Then** the UI blocks the action with a clear explanation of what is missing,
**And** it provides a direct path to fix it (e.g., “Confirm mapping” or “Paste JD”).

### Story 6.2: Iterate Draft Generation with User Constraints (Tone/Emphasis/Keywords)

As a signed-in user,
I want to iterate on cover letter generation with additional constraints (tone, emphasis, keywords),
So that I can tailor the output to the specific role and my preferences.

**Implements:** FR26

**Acceptance Criteria:**

**Given** an application has a confirmed mapping and JD snapshot,
**When** I provide iteration constraints (tone/emphasis/keywords to include/avoid) and regenerate,
**Then** the system uses those constraints for the new generation,
**And** the resulting output replaces the latest draft.

**Given** I change constraints and regenerate multiple times,
**When** each generation completes,
**Then** only the latest draft is retained as the stored draft,
**And** the system does not require me to re-enter unchanged inputs between retries.

### Story 6.3: Save Submitted Cover Letter Version (Immutable + Versioned)

As a signed-in user,
I want to edit a generated draft and save it as a submitted cover letter version for an application,
So that I can preserve what I actually submitted and retrieve it later for traceability.

**Implements:** FR27, FR28

**Acceptance Criteria:**

**Given** I have a latest draft,
**When** I edit the text and save as “Submitted,”
**Then** the application creates a new submitted cover letter version with a timestamp,
**And** that submitted version is immutable and retrievable later at any time.

**Given** one or more submitted cover letter versions already exist,
**When** I regenerate a cover letter draft,
**Then** the system only replaces the latest draft,
**And** it does not modify or overwrite any submitted versions.

**Given** I have already submitted once and want to submit a revised letter later,
**When** I save another “Submitted” version,
**Then** the system creates an additional submitted version (version history is preserved),
**And** the UI can show the most recent submitted version by default while keeping access to older versions.

**Given** saving a submitted version fails,
**When** the error occurs,
**Then** I see an actionable error and can retry,
**And** my edited content is preserved in the UI (no re-entry required).

### Story 6.4: Submission Notes for Traceability

As a signed-in user,
I want to record submission notes (where it was submitted, what version was used, and any notes),
So that I can later trace what I sent and keep follow-ups consistent.

**Implements:** FR29

**Acceptance Criteria:**

**Given** I am viewing an application,
**When** I add or edit submission notes for a specific submitted cover letter version and save,
**Then** the notes persist across refresh/re-login,
**And** they remain scoped to this application.

**Given** I have multiple submitted cover letter versions,
**When** I view the application’s history or “Submitted versions” list,
**Then** each submission note is clearly associated with its submitted version (what/when/where),
**And** I can retrieve the exact text that was submitted for that note.

### Story 6.5: (Non-MVP) Generate Preview Draft (Ungrounded)

As a signed-in user,
I want to generate a clearly-labeled preview cover letter draft without confirming evidence mapping,
So that I can quickly sanity-check tone/structure while still treating the evidence-grounded draft as the true submission baseline.

**Implements:** (Non-MVP UX enhancement; does not replace mapping-first final generation)

**Acceptance Criteria:**

**Given** an application has a saved JD snapshot,
**When** I request “Generate preview draft,”
**Then** the system generates a draft and stores it as the latest draft,
**And** the UI labels it clearly as “Preview (Ungrounded)” with a warning that it is not evidence-confirmed.

**Given** I have a preview draft,
**When** I later confirm mapping and generate an evidence-grounded draft,
**Then** the evidence-grounded draft replaces the latest draft,
**And** any previously submitted versions remain unchanged.

**Given** generation of a preview draft fails,
**When** the error occurs,
**Then** I see an actionable error and can retry,
**And** my underlying application data (JD snapshot, requirements, mapping, submitted versions) remains intact.

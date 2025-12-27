---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - _bmad-output/project-planning-artifacts/product-brief-job-tracker-2025-12-26.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
workflowType: 'prd'
lastStep: 11
project_name: 'job-tracker'
user_name: 'ggbb'
date: '2025-12-26'
---

# Product Requirements Document - {{project_name}}

**Author:** {{user_name}}
**Date:** {{date}}

## Executive Summary

Job-Tracker is an AI-driven job application tracker for Australian IT Master’s new graduates (initially a single-user personal tool). It consolidates job discovery across Seek, LinkedIn, and company career pages into one workflow: capture a role via link, extract and structure the job description, generate a ready-to-submit cover letter grounded in the user’s skills and project experience, and track application status with consistent follow-up prompts.

The core user problem is fragmentation and repetitive manual work: roles are spread across multiple sites, job info must be copied into spreadsheets, each application requires tailored materials, and follow-ups/interview preparation are easy to miss or do generically. Job-Tracker aims to turn “job found” into “application-ready” with a review-and-send loop while preserving strong evidence-based relevance.

### What Makes This Special

- **Evidence-based personalization:** Strong mapping from job responsibilities/requirements to the user’s specific skills and project experiences (not generic LLM output).
- **Cross-source continuity:** Works across Seek/LinkedIn/company sites instead of being locked into a single platform’s “saved jobs”.
- **End-to-end workflow:** Link capture → JD extraction → tailored cover letter draft → status tracking → 7-day no-response reminders → role + company-aware interview mock Q&A.

## Project Classification

**Technical Type:** web_app  
**Domain:** general  
**Complexity:** low  
**Project Context:** Greenfield - new project

Classification rationale:
- As a web application, the PRD should emphasize responsive UX, performance targets, accessibility expectations, and clear frontend/server responsibilities.
- The domain is general (non-regulated), so the primary complexity drivers are engineering and product workflow design (multi-source ingestion/parsing reliability, data privacy/security, AI generation quality/cost control, and requirement→project mapping fidelity).

## Success Criteria

### User Success

A user considers Job-Tracker successful when it reliably converts “job found” into “application-ready” with minimal manual overhead, while keeping every application traceable and follow-ups consistent.

Key user success moments:
- Pasting a job link quickly becomes a structured application record with an extracted JD and a clear requirement summary.
- The user confirms a requirements → project-bullets mapping and receives a ready-to-submit cover letter draft grounded in that evidence.
- The user never misses follow-ups and can always retrieve what was submitted for any application.

### Business Success

Initial business success (personal tool, single primary user):
- The product becomes the default daily workflow for job applications (replacing spreadsheets and fragmented saved-job systems).
- The user trusts the tool enough to store application history and rely on it for follow-ups and interview preparation.

### Technical Success

- Reliable job ingestion from links, with graceful fallback:
  - Primary ingestion starts with Seek; the long-term intent is to support Seek, LinkedIn, and company career pages.
  - If link parsing fails, the user can manually paste the job description and continue the workflow without losing structure.
- Strong mapping-first workflow:
  - The system produces a requirements → project-bullets mapping list for user confirmation before final cover letter generation.
- Data persistence and access:
  - User-authenticated storage via Supabase is supported and considered acceptable for resume/projects/materials.
- Generation experience:
  - Cover letter and interview prep generation may take longer; correctness and grounding are prioritized over speed.

### Measurable Outcomes

- Preparation throughput:
  - Target: 10 high-fit applications per day.
  - Definition of high-fit (hard filters):
    - Role level is one of: Graduate, Junior, Entry-level, Intern, Mid.
    - Location is within Australia (with preference for Sydney, Melbourne, Brisbane).
    - Visa requirement filter: job listing must not require PR/Citizen (at minimum).
    - Tech stack and keywords match the user target (Frontend or Software roles) and user skills/projects.
- Time-to-application-ready:
  - Target: 10–20 minutes per application.
  - Measurement window: from pasting the job link to receiving a ready-to-submit cover letter draft after mapping confirmation.
  - Excludes final personal edits and the external submission process.
- Mapping quality:
  - For each application, requirements are mapped to concrete project bullets (skills or project experience aligned to role responsibilities).
  - Measurement proxy: % of applications where each major requirement has at least one linked project bullet and the cover letter references those links.
- Follow-up reliability:
  - Trigger: no response after 7 days → reminder.
  - Measurement proxy: % of reminders acknowledged and reduction of stale applications.
- Traceability:
  - The user can retrieve job link, JD snapshot, mapping decisions, generated cover letter version, notes, and status history per application.

## Product Scope

### MVP - Minimum Viable Product

Must-have capabilities to prove the loop:
- Paste job link (prioritize Seek) → auto-fetch and normalize job details; fallback to manual JD paste.
- Application record with required fields: status, applied date, company, role, link, notes.
- Structured project/experience library input (project bullets as reusable evidence).
- JD requirement extraction.
- Mapping list (requirements → project bullets) presented for user confirmation.
- Cover letter generation grounded in confirmed mappings.
- 7-day no-response reminder.
- Interview preparation pack: role requirements + company context (when available) → mock Q&A with suggested talking points mapped to projects.
- Supabase-backed persistence (auth + storage).

### Growth Features (Post-MVP)

- Expand link ingestion coverage and reliability for LinkedIn and company career pages.
- Bulk capture workflows (e.g., queue multiple links, later process).
- Better matching and ranking of high-fit jobs using richer heuristics or embeddings.
- Stronger company context capture (structured company notes, role/team inference).
- Resume bullet refinement suggestions (still mapping-driven, not fully automatic rewriting).

### Vision (Future)

- End-to-end personal job search copilot:
  - Continuous role discovery and triage across sources.
  - Deeper evidence-based personalization across resume, cover letter, and interview narratives.
  - A reusable story bank (STAR) tied to project library and role requirements.
  - Continuous learning loop from outcomes (interview invites, feedback) to improve mappings and recommendations.

## User Journeys

### Journey 1 — Nightly “Find → Apply → Record” (Happy Path)

Ming (an Australian IT Master’s new graduate) sits down in the evening with a clear goal: ship high-quality applications with minimal friction. They browse Seek and find a promising Frontend/SWE role. Instead of copying fields into Excel, Ming pastes the job link into Job-Tracker.

Job-Tracker fetches the posting, extracts the job description, and summarizes the role responsibilities and key requirements. Ming feels immediate relief: the “busywork” is gone. The system then proposes a requirements → project-bullets mapping list. Ming reviews the mapping, tweaks a couple of mismatches, and confirms.

With mapping confirmed, Job-Tracker generates a ready-to-submit cover letter draft. Ming quickly reviews the draft, makes small edits, and exports/copies the final version for submission. In the application record, Ming sets status to Applied, adds applied date, and drops quick notes (e.g., “strong match on React + API integration”). The system also generates a role + company-aware mock interview Q&A pack that Ming can use later.

Ming ends the session with a clean pipeline and confidence that nothing will be lost or forgotten. If the application has no response after 7 days, Job-Tracker nudges Ming to follow up.

Emotional arc: overwhelmed → focused → relieved → confident.

---

### Journey 2 — “Parser Fails / JD Is Weak” (Edge Case + Recovery)

Ming pastes a Seek link, but parsing fails or key fields are missing. Instead of dead-ending, Job-Tracker clearly explains the failure and offers a recovery path: Ming can manually paste the job description text (and/or fill minimal fields like company/role/location).

In another scenario, parsing succeeds but the JD is long, vague, or “watery”. Job-Tracker flags low-signal sections and asks Ming to confirm the top 5–7 responsibilities that matter for this application. Ming selects the responsibilities that actually drive the cover letter.

Mapping quality is critical. If the system’s mapping confidence is low, it shows why (e.g., “requirement too generic” or “no strong evidence bullet found”) and proposes alternatives from Ming’s project library. Ming corrects the mapping or adds a missing project bullet. Only after Ming confirms the mapping does Job-Tracker generate a cover letter draft.

If the draft still feels generic, Ming uses a refinement loop: adjust mapping and/or provide a short “direction” (e.g., “more concrete evidence, less buzzwords”), then regenerate. The system preserves the workflow: mapping-first → draft generation → final.

Emotional arc: frustration → clarity → control → trust restored.

---

### Journey 3 — “Maintain My Evidence Library” (Projects/Skills as Reusable Assets)

Ming wants cover letters that feel real, not templated. Before applying (or after a day of applications), Ming opens the Project/Experience Library and updates it:
- Adds a new project, tech stack, and 3–6 strong bullets with outcomes.
- Refines older bullets to be more evidence-based (what was built, what impact, what responsibility).
- Tags bullets with skills/keywords to improve matching to responsibilities.

This maintenance pays off immediately. The next time Ming pastes a job link, Job-Tracker can propose stronger mappings because the evidence pool is cleaner and more searchable. Ming feels the system getting “more usable” over time because the inputs are structured and reusable.

Emotional arc: unsure → organized → empowered.

---

### Journey 4 — “Review & Retrieve What I Sent” (Traceability + Weekly Reflection)

A week later, Ming wants to revisit an application: “What cover letter did I submit?” They open Job-Tracker, search the company/role, and retrieve the final submitted cover letter (plus their notes and status). Ming uses this during follow-ups and interview prep to stay consistent.

At the end of the week, Ming does a quick pipeline reflection: which applications are stale, which need a follow-up, and which roles are worth doubling down on. The system’s reminders reduce cognitive load—Ming doesn’t need to remember everything.

Emotional arc: uncertainty → clarity → calm.

### Journey Requirements Summary

These journeys reveal requirements for:

- Link-based job capture (Seek first) with robust parsing and clear error handling.
- Manual JD paste fallback that preserves structured workflow.
- JD summarization and requirement extraction, including “low-signal JD” handling (user confirmation of key responsibilities).
- Mapping-first UX: requirements → project bullets presented for review/edit/confirm.
- Draft generation that is grounded in confirmed mappings and supports regeneration when output is too generic.
- Application record management with required fields (status/applied date/company/role/link/notes).
- Reminder system for “no response after 7 days” with user-controlled status updates.
- Interview prep generation (role + company context) with outputs usable later.
- Project/experience library CRUD with bullet-level structure and reuse.
- Retrieval of final submitted cover letter per application (traceability).

## Web App Specific Requirements

### Project-Type Overview

Job-Tracker is a single-user, desktop-first web application designed for a fast nightly workflow (find jobs → apply → track → review). The experience is SPA-like, prioritizing efficiency and low friction over public discoverability (SEO) or real-time collaboration.

### Technical Architecture Considerations

- **SPA UX:** Client-driven navigation and in-app flows optimized for rapid repeated actions (paste link → review mapping → generate → record).
- **No real-time requirement:** Data consistency can be “on refresh” / “on navigation” rather than live multi-client syncing.
- **Desktop-only focus:** UI and interaction patterns optimized for keyboard/mouse and larger screens.

### Browser Matrix

- **Primary supported:** Desktop Chrome (latest stable).
- **Out of scope (MVP):** Mobile browsers.
- **Best-effort:** Chromium-based browsers may work, but only Chrome is explicitly supported.

### Responsive Design

- **Desktop-first layouts** optimized for typical laptop/desktop widths.
- **Basic resizing support** so core flows remain usable across common desktop window sizes.
- Mobile-specific layout and touch optimization are not required.

### Performance Targets

- **Perceived performance:** Core loop actions should feel fast and consistent (paste link, mapping review, generation submission, status updates).
- **Web performance hygiene:** Use standard best practices (code splitting, caching, avoiding unnecessary re-renders) so the app remains responsive during frequent repeated tasks.
- **Generation latency tolerance:** AI generation may take longer; the UX must keep the user oriented (clear progress states, cancel/retry, and draft persistence).

### SEO Strategy

- **Not required for the application experience.**
- Optional: a minimal landing page could exist later, but the core PRD does not assume search-driven acquisition.

### Accessibility Level

- **Baseline usable accessibility** for a personal productivity tool:
  - Keyboard navigability for core flows and forms.
  - Proper labels for inputs, sensible focus states.
  - Reasonable color contrast and readable typography.

### Implementation Considerations

- Avoid building features optimized for public web traffic (SEO, social sharing) in MVP.
- Prioritize reliability and recovery paths for ingestion and mapping (desktop workflow + repeated nightly usage).
- Keep UI simple and fast to operate; minimize modal fatigue and unnecessary steps.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP  
**Rationale:** Prove the core value loop with the smallest set of capabilities that reduces manual effort and produces an application-ready cover letter grounded in evidence.

**Resource Requirements:** Solo builder (product + engineering), with skills in Next.js web app development, Supabase auth/storage, LLM integration, and robust ingestion/parsing with fallback UX.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey 1 (Happy Path): Nightly “Find → Apply → Record”
- Journey 2 (Edge Case + Recovery): Parsing fails / JD is weak → fallback & correction
- Journey 3 (Evidence Library): Maintain project/experience bullets for reuse
- Journey 4 (Traceability): Retrieve what was submitted later

**Must-Have Capabilities:**
- **Job capture via link (multi-source intent):**
  - Accept links from Seek (priority), LinkedIn, and company career pages.
  - Best-effort parsing where possible; if parsing fails, the workflow must continue via manual JD paste.
- **Manual JD paste fallback** that preserves structured processing.
- **Requirement extraction** from the JD (responsibilities + key skills).
- **Cover letter generation** from extracted requirements, grounded in the user’s project/experience library.
- **Project/experience library** with structured input (project bullets as reusable evidence).
- **Application tracking & status management:**
  - Create an application record for each role with required fields: status, applied date, company, role, link, notes.
  - The user controls manual status updates at any time.

### Post-MVP Features

**Phase 2 (Post-MVP):**
- Stronger mapping workflow UX (explicit requirements → project bullets confirmation as a first-class step).
- 7-day no-response reminder system (automation + acknowledgement flows).
- Interview preparation pack generation (role + company-aware mock Q&A) and practice tracking.
- Improve parsing coverage/reliability for LinkedIn and company career pages.

**Phase 3 (Expansion):**
- Bulk capture (queue many links, process later).
- More advanced fit scoring and ranking for “high-fit” roles.
- Rich company context capture and structured prep artifacts.
- Deeper personalization loops and reusable narrative bank (STAR) tied to evidence library.

### Risk Mitigation Strategy

**Technical Risks:**
- **Link parsing reliability (highest risk):**
  - Mitigation: best-effort parsing + mandatory manual JD paste fallback + clear error states; store raw JD snapshot per application.
- **Cover letter quality / “too generic” (highest risk):**
  - Mitigation: evidence-first generation strategy (project bullet grounding), allow user constraints (“tone/keywords”), and support fast regeneration loops.
- **Single-user scope control:**
  - Mitigation: avoid real-time, mobile support, SEO, and multi-user features in MVP.

**Market Risks:**
- The MVP must demonstrate a daily workflow improvement (replace spreadsheet friction) and produce output the user is willing to submit.

**Resource Risks:**
- If scope exceeds solo capacity, de-scope by reducing automated parsing coverage and relying more on the JD paste path while keeping the core generation + tracking loop intact.

## Functional Requirements

### Account & Data

- FR1: User can create an account and sign in to access their workspace.
- FR2: User can sign out.
- FR3: System can persist the user’s data across sessions.
- FR4: User can configure job search preferences used for “high-fit” evaluation (role level, locations, visa filter, role focus, keywords).
- FR5: User can configure generation preferences used by AI outputs (e.g., tone, emphasis, keywords to include/avoid).

### Job Capture & Normalization

- FR6: User can create an application by pasting a job URL.
- FR7: System can identify the job source type from the URL (Seek, LinkedIn, company career page, or unknown).
- FR8: System can attempt to extract structured job fields from the URL when available (company, role title, location, job description text).
- FR9: User can edit and correct any extracted job fields.
- FR10: User can complete an application by manually pasting the job description text when extraction fails or is incomplete.
- FR11: System can store a job description snapshot (text) per application for later reference.
- FR12: System can detect potential duplicates (same URL and/or same company+role) and allow the user to proceed intentionally (e.g., keep both or treat as the same application).

### JD Analysis & Requirement Extraction

- FR13: System can extract responsibilities and requirements/skills from the job description snapshot.
- FR14: User can review and edit the extracted responsibilities/requirements.
- FR15: System can detect low-signal/vague job descriptions and prompt the user to select the key responsibilities to drive the application materials.
- FR16: System can maintain a requirements list that is linked to the specific application record.

### Project/Experience Library (Evidence Store)

- FR17: User can create, view, edit, and delete projects/experiences.
- FR18: User can create, view, edit, and delete reusable project bullets (skills, responsibilities, outcomes).
- FR19: User can tag/search/filter their project bullets to find relevant evidence quickly.
- FR20: User can update their project library over time and reuse it across multiple applications.

### Mapping-First Workflow (Requirements → Evidence)

- FR21: System can propose a mapping from application requirements/responsibilities to the user’s project bullets.
- FR22: User can review, adjust, and confirm the requirement → project-bullets mapping before cover letter generation.
- FR23: System can highlight uncovered requirements (no strong evidence found) and allow the user to resolve them (e.g., add a bullet, choose alternative evidence, or explicitly leave it uncovered).
- FR24: System can store the confirmed mapping per application for later retrieval and regeneration.

### Cover Letter Workflow

- FR25: User can generate a cover letter draft for an application based on the confirmed mapping and job description.
- FR26: User can iterate on cover letter generation using additional user-provided constraints (e.g., emphasis, tone, keywords).
- FR27: User can edit a cover letter draft and save it as a submitted cover letter version per application; submitted versions are immutable and versioned.
- FR28: User can retrieve all saved submitted cover letter versions for any application at any time (including historical submissions).
- FR29: User can record submission notes per submission and associate them with the specific submitted cover letter version (e.g., where/when submitted).

### Application Tracking & Traceability

- FR30: User can create and maintain an application record with required fields (status, applied date, company, role, link, notes).
- FR31: User can change application status manually at any time.
- FR32: User can search and filter applications by key fields (status, company, role, date, source).
- FR33: User can view an application timeline/history sufficient to support “traceability” of what was submitted.

### Follow-up & Interview Prep (Planned / Post-MVP Capabilities)

- FR34: System can surface applications that have had no response after a defined period (e.g., 7 days) and prompt the user to follow up.
- FR35: User can generate an interview preparation pack per application based on extracted requirements and optional company context notes.
- FR36: User can store interview preparation notes per application for later review.

## Non-Functional Requirements

### Performance

- NFR-P1: On supported environment (desktop Chrome latest stable), core non-AI user actions (navigate views, search/filter, save edits, update status) complete within < 2 seconds under normal conditions.
- NFR-P2: AI-heavy operations (JD analysis, mapping proposal, cover letter generation) may take longer, but the system provides clear in-progress state and does not block unrelated UI actions.
- NFR-P3: When AI operations fail, the system provides an actionable error and supports retry without requiring the user to re-enter previously provided inputs.

### Reliability

- NFR-R1: Parsing failures and generation failures must not cause data loss; application records, JD snapshots, notes, and project library entries remain intact.
- NFR-R2: The system persists user edits reliably; after refresh/re-login, previously saved applications and final cover letter versions remain accessible.
- NFR-R3: The system preserves workflow progress (e.g., extracted requirements, confirmed mappings) so the user can resume an in-progress application without restarting.

### Security & Privacy

- NFR-S1: Only authenticated users can access application data; all reads/writes are scoped to the signed-in user.
- NFR-S2: The system supports account deletion that permanently deletes the user account and all associated personal data (applications, JD snapshots, project library, generated materials) such that it is no longer retrievable through the product.

### Accessibility

- NFR-A1: Baseline usable accessibility for a personal productivity tool: keyboard operability for core flows, labeled form controls, visible focus states, and readable contrast.

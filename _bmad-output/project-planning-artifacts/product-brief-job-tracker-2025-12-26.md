---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - aim.txt
workflowType: 'product-brief'
lastStep: 5
project_name: 'job-tracker'
user_name: 'ggbb'
date: '2025-12-26'
---

# Product Brief: {{project_name}}

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

Job seekers—especially fresh graduates and international students—often search across multiple sources (Seek, LinkedIn, and company websites), then spend disproportionate effort copying job details into spreadsheets, tailoring documents, and tracking application status manually. This workflow is fragmented: saving a job on LinkedIn doesn’t help when applying on Seek, and generating a cover letter is rarely reusable across tools.

Job-Tracker is an AI-driven job application tracker that centralizes job capture, application materials, and status tracking in one place. It helps users quickly extract role requirements from job descriptions, generate a ready-to-submit cover letter grounded in the user’s resume/projects (with final user edits), and produce more targeted interview preparation guidance—reducing prep time while improving relevance and confidence.

---

## Core Vision

### Problem Statement

Fresh graduates and international students applying for jobs across Seek, LinkedIn, and company career pages struggle to efficiently identify suitable roles and prepare tailored application materials. The process requires repetitive manual work (copying job info, rewriting documents), and tracking application status across multiple sources is error-prone.

### Problem Impact

- Significant time wasted on repetitive copy/paste and document reformatting rather than high-quality applications.
- Inconsistent tracking leads to missed follow-ups, duplicated applications, and reduced visibility into pipeline progress.
- Lower confidence and weaker interview readiness because role requirements aren’t systematically summarized and mapped to the candidate’s experience.

### Why Existing Solutions Fall Short

- **LinkedIn Saved Jobs** is limited to LinkedIn context and doesn’t translate to Seek or company-site applications.
- **Spreadsheets (Excel/Sheets)** require manual entry, making them the most tedious part of the workflow.
- **Generic AI chat prompts** can draft text, but without structured job tracking and strong binding to the user’s resume/projects per application, reuse and consistency are limited.
- Existing tools often solve “tracking” or “writing” in isolation, but not the end-to-end loop from discovery → preparation → submission → interview prep → status updates.

### Proposed Solution

A single workflow-centric web app that:
- Captures and normalizes job postings from multiple sources (Seek / LinkedIn / company sites) into a structured pipeline (Applied → Interview → Offer).
- Analyzes job descriptions to extract key requirements/skills.
- Generates a ready-to-submit cover letter that is explicitly grounded in the user’s resume and project experience, designed for quick user review and edits.
- Produces interview preparation suggestions tailored to each role’s requirements and the user’s background.
- Minimizes manual data entry so “tracking” is a byproduct of applying, not extra work.

### Key Differentiators

- **Cross-source continuity:** one place to manage roles across Seek, LinkedIn, and company websites.
- **Resume/project binding by default:** each cover letter is generated with explicit mapping to the user’s own experience (not generic templates).
- **End-to-end flow:** job discovery + materials + status + interview prep in one workflow, reducing context switching.
- **Focus on the highest-leverage outcome:** materially reducing time spent preparing application materials while making interview prep more targeted.

## Target Users

### Primary Users

#### Persona 1: “Ming” — Master’s New Graduate (IT), Frontend/SWE, Australia

- **Profile & Context:** Ming is a final-semester (or recent) Master’s graduate in IT in Australia, targeting Frontend Developer or Software Engineer roles. They’re open to roles across Australia, with a preference for Sydney/Melbourne/Brisbane. They actively search across Seek, LinkedIn, and company career pages.
- **Assets:** A core resume, a portfolio/personal website, and a mix of major project experience plus smaller personal projects to demonstrate skills.
- **Goals:**
  - Identify roles that are genuinely a good fit (tech stack, level, location).
  - Submit high-quality, tailored applications efficiently and consistently.
  - Maintain a clean pipeline view and follow up at the right moments.
  - Prepare for interviews in a targeted way based on each role’s requirements.
- **Current Workflow & Pain:**
  - Tracks applications in Excel, but manual copy/paste per role is the most tedious step.
  - Role requirements are scattered across sources; consolidating them is time-consuming.
  - Resume tweaks and cover letter writing are repetitive and hard to keep “grounded” in their own project experience.
  - Follow-ups slip because status updates and reminders are manual.
- **Success for Ming:**
  - Application material prep time drops significantly (from “lots of manual work” to “review-and-send”).
  - Resume/cover letter consistently reflect the role requirements and their strongest matching projects.
  - Interview prep becomes more targeted and less stressful because requirements and talking points are pre-organized.

### Secondary Users

N/A (intentionally scoped as a personal tool for individual job seekers in the initial version).

### User Journey

1. **Discovery**
   - Ming searches on Seek/LinkedIn/company sites, finds a promising posting, and wants to capture it instantly without manual copying.
2. **Onboarding**
   - Ming sets up their “profile assets”: resume, portfolio link, and a structured library of project experiences (bullet points, technologies, outcomes).
3. **Core Usage (Day-to-day Loop)**
   - Add a job link → system extracts the job description → summarizes requirements/skills → proposes a tailored resume emphasis and generates a ready-to-submit cover letter grounded in Ming’s projects → Ming edits quickly and submits.
   - Ming updates status in a pipeline (Applied → Interview → Offer) and records key dates/notes.
4. **Success Moment (“Aha!”)**
   - Ming realizes they can go from “job found” to “tailored application ready” with minimal manual copy/paste, while the cover letter still feels personal and evidence-based.
5. **Long-term Routine**
   - Ming runs a consistent weekly cadence: review pipeline, follow-up prompts, interview prep packs per role, and iterates resume/project library based on responses.

## Success Metrics

From the user’s perspective, Job-Tracker succeeds when it meaningfully reduces application preparation effort while improving relevance and interview readiness.

### User Success Metrics (Outcomes & Behaviors)

- **Application prep time (primary outcome):** Reduce end-to-end per-job preparation time to **10–20 minutes** (from “manual-heavy” workflows).
  - Measurement: user-entered or automatically tracked “start prep → ready-to-submit” time per application.
- **High-fit application throughput:** Enable users to complete **10 high-fit applications per day** through a review-and-send workflow.
  - Measurement: count of applications created with status changed to Applied per day.
- **Requirement-to-experience mapping quality:** For each application, generate a **strong, explicit mapping** between job requirements and the user’s project experience (strong relevance, evidence-based).
  - Measurement (practical proxy): % of applications with (a) extracted requirements, (b) linked project bullets, and (c) cover letter sections referencing those linked bullets.
- **Follow-up consistency:** Reduce missed follow-ups by prompting users when an application has **no response after 7 days**.
  - Measurement: number of follow-up reminders delivered; % acknowledged by the user; reduction in “stale” applications without review.
- **Interview readiness (per-role):** Provide **role + company-background-aware mock Q&A** so users can practice with context, not generic questions.
  - Measurement: % of applied jobs that have an interview-prep pack generated; user completion (e.g., answered ≥ N questions); user self-rating of preparedness per role.

### Business Objectives

- **Initial scope objective:** Deliver a personal, self-serve tool that reliably supports a repeatable daily workflow: capture job → generate tailored materials → track status → follow-up → interview prep.
- **Adoption objective (personal tool):** Become the default place the user checks daily for application workflow and pipeline status (reduce tool fragmentation across sources and spreadsheets).

### Key Performance Indicators

- **Daily completed applications:** `# Applied per day` (target: **10/day**).
- **Median prep time per application:** `p50 time-to-ready` (target: **10–20 minutes**).
- **Mapping coverage rate:** `% applications with requirement→project links present` (target: high coverage; measurable per application).
- **Cover letter generation success rate:** `% applications where a ready-to-submit draft is produced` (target: high).
- **Follow-up reminder effectiveness:** `% reminders acknowledged` and `# stale applications > 7 days without review`.
- **Interview prep usage:** `% applied roles with mock Q&A generated` and `# Q&A items completed per role`.

## MVP Scope

### Core Features

1. **Job capture via link (auto-fetch)**
   - User pastes a job URL (starting with the primary sources: Seek / LinkedIn / company career pages).
   - System retrieves and normalizes core fields: company, role title, location, job description text, and the original link.
   - Minimal manual edits allowed when auto-fetch is imperfect.

2. **Structured application tracking**
   - An application record with required fields:
     - `status` (e.g., Applied → Interview → Offer)
     - `applied_date`
     - `company`
     - `role`
     - `link`
     - `notes`
   - Manual status changes (user-controlled source of truth).

3. **Project/experience library (structured input)**
   - User maintains a structured library of projects/experiences (project name, tech stack, responsibilities, outcomes, key bullets).
   - Designed to be reused across applications and referenced as “evidence” for requirement matching.

4. **JD analysis + requirement extraction**
   - Extract key requirements/skills/responsibilities from the job description.
   - Produce an internal representation that can drive mapping and generation.

5. **Cover letter generation grounded in project experience**
   - Generate a ready-to-submit cover letter draft per application.
   - Each paragraph is explicitly anchored to one or more project bullets (strong relevance, evidence-based).
   - User performs final edits and submits externally.

6. **Follow-up reminders**
   - Reminder when there is **no response after 7 days** for an application.
   - Reminder is informational; user decides and manually updates status/notes.

7. **Interview preparation pack (role + company-aware)**
   - Generate mock Q&A tailored to:
     - role requirements extracted from the JD
     - company context/background when available (user-provided notes or lightweight public context)
   - Includes suggested talking points mapped to the user’s project library.

### Out of Scope for MVP

- Automated application submission (no browser automation / no auto-apply).
- Multi-user collaboration, sharing, or team workflows.
- Payments, subscriptions, or monetization features.
- Analytics-heavy dashboards or advanced reporting.
- Large multi-template cover letter suite and complex template management.
- Deep “auto-rewrite my resume for every job” (beyond suggestions or mapping guidance).

### MVP Success Criteria

The MVP is successful if it enables a repeatable daily workflow that meets the defined targets:
- Per-application preparation can be completed in **10–20 minutes** via a review-and-send loop.
- The user can complete **10 high-fit applications per day** when roles are available.
- Each cover letter draft demonstrates strong requirement → project evidence alignment.
- The user receives reliable 7-day no-response reminders and can keep status/notes current without spreadsheet friction.
- Interview prep output is role-specific and feels grounded in both JD requirements and the user’s actual projects.

### Future Vision

- Broader and more robust job ingestion (more sources, better parsing reliability, bulk import).
- Richer requirement→experience mapping (gap detection, suggested improvements to the project library, tailored bullet refinements).
- More advanced interview coaching (question difficulty tiers, STAR story generator tied to projects, practice tracking).
- Stronger company context integration (structured company notes, role/team inference, curated prep prompts).
- Optional expansion beyond new grads (career switchers, experienced candidates) once the core loop is proven.

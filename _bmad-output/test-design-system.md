# System-Level Test Design

**Date:** 2025-12-26
**Author:** ggbb
**Status:** Draft

## Context

- **Mode:** System-Level (Phase 3 testability review)
- **Inputs:** `_bmad-output/prd.md`, `_bmad-output/architecture.md`, `_bmad-output/project-planning-artifacts/epics.md`, `_bmad-output/project-context.md`
- **Playwright Utils:** `tea_use_playwright_utils=false` (do not assume `@seontechnologies/playwright-utils`)
- **Constraints:** No network calls in automated tests; mock `fetch` and Supabase client calls (per project context)

## Testability Assessment

- **Controllability:** CONCERNS
  - The architecture is RLS-first (Supabase) and expects server-only privileged operations; test setup must support reliable seeding/cleanup of user-scoped data without leaking service-role keys to client code.
  - Several flows depend on external systems (AI gateway, job-board pages, email Magic Link) which must be stubbed/mocked for deterministic tests.
- **Observability:** CONCERNS
  - Route Handlers should emit stable error codes and predictable envelopes for non-stream endpoints; streaming endpoints must emit `delta` and terminal `done`/`error` events (per project context). This needs explicit instrumentation and test helpers.
  - Traceability requirements imply persistence and “what was submitted” retrieval; tests must be able to inspect stored artifacts and history events deterministically.
- **Reliability:** CONCERNS
  - Background jobs (Vercel Cron) and AI operations must be idempotent and retry-safe; tests must validate “no duplicates on retry” and “no partial state on failure”.
  - Job capture parsing is inherently flaky if done via live scraping; tests should focus on pure parsing functions with fixtures and keep network out of the test loop.

## Architecturally Significant Requirements (ASRs)

Scoring uses `probability (1–3) × impact (1–3)`. Scores ≥6 are “high priority” and require mitigation before implementation-readiness.

| ASR ID | Category | Description | Evidence | Prob | Impact | Score | Test Approach (System-Level) |
| ------ | -------- | ----------- | -------- | ---- | ------ | ----- | ----------------------------- |
| ASR-001 | SEC | Enforce strict user data isolation (RLS + user-scoped reads/writes) | PRD NFR-S1, Architecture “RLS mandatory” | 2 | 3 | 6 | Integration tests for auth-required Route Handlers, negative tests for cross-user access, policy verification (migration review) |
| ASR-002 | SEC | Protect privileged paths (service role key server-only; cron endpoint requires `Authorization: Bearer $CRON_SECRET`) | Architecture “server-only secrets”, cron hardening | 2 | 3 | 6 | Integration tests for cron auth, repository/API boundary checks, static scan for forbidden env usage in client bundles |
| ASR-003 | DATA | No data loss; persist intermediate artifacts; resumable workflow state | PRD NFR-R1..R3, Architecture “resumable state machine” | 2 | 3 | 6 | Integration tests for “save before generate”, idempotent retry behavior, history/event recording correctness |
| ASR-004 | PERF | Core non-AI interactions feel fast; AI operations non-blocking with clear in-progress | PRD NFR-P1..P2, UX spec state visibility | 2 | 2 | 4 | Lightweight performance budgets (client instrumentation), integration tests asserting non-blocking UX states and predictable loading/error handling |
| ASR-005 | OPS | Idempotent background jobs (no duplicate reminders/events on retry) | Architecture “cron idempotent” | 2 | 2 | 4 | Integration tests for idempotency keys/uniqueness constraints, retry simulation in isolated test environment |
| ASR-006 | TECH | Streaming protocol correctness (`delta` → terminal `done`/`error`) and persistence on completion | Project context streaming rules | 2 | 2 | 4 | Streaming integration tests validating event framing and terminal behavior; mock upstream AI `fetch` |

## Test Levels Strategy

Goal: high confidence with minimal flakiness; keep network out of tests; validate behavior at the lowest stable level.

- **Unit (≈55%)**: Pure logic (mappers, zod validators, streaming helpers, parsing/extraction functions with fixtures)
- **Integration (≈35%)**: Next.js Route Handlers and server repositories with mocked Supabase client + mocked `fetch`
- **E2E (≈10%)**: Only critical happy paths and auth gating, once UI stabilizes; keep the suite small to avoid flakiness

## NFR Testing Approach

- **Security**
  - Auth-required endpoints return `UNAUTHORIZED` without session; RLS prevents cross-user reads/writes.
  - Cron endpoint hardening: missing/invalid bearer token rejected; service role never exposed to client components.
- **Performance**
  - Budget-based checks for non-AI flows; ensure async AI flows show progress and do not block navigation.
  - Defer load testing until core endpoints exist; prefer scripted checks against staging with explicit thresholds.
- **Reliability**
  - Idempotency tests for parsing/generation retries, cron triggers, and “no duplicate events”.
  - Failure-mode tests: partial failures must not corrupt persisted state; retries should not require re-entry.
- **Maintainability**
  - Enforce test quality DoD: deterministic waits, explicit assertions, isolated setup/cleanup, and flake triage as technical debt.

## Test Environment Requirements

- **Local development**
  - A non-production Supabase project for development/testing; strict separation from production.
  - A consistent approach for seeding/cleanup of user-scoped data (factories + teardown discipline).
- **CI / Preview**
  - Secrets injected server-side only (no client exposure); validate environment variable boundaries.
  - A repeatable DB migration path (Supabase migrations) to keep schema consistent across environments.
- **AI & Job Parsing**
  - Automated tests must not call real AI providers or scrape real job boards; use mocks/fixtures and recorded examples.

## Testability Concerns (Gate Inputs)

- **CONCERN:** Remote Supabase dependency can make deterministic data reset harder.
  - **Mitigation:** Introduce test data factories with explicit cleanup; isolate test users; prefer mocking Supabase client for route handler integration tests.
- **CONCERN:** Live scraping of job boards is inherently flaky and may violate ToS.
  - **Mitigation:** Treat ingestion/parsing as pure functions with fixture inputs; keep any live-fetch logic behind server-only adapters with contract tests against recorded payloads.
- **CONCERN:** Streaming endpoints + persistence add “partial state” failure modes.
  - **Mitigation:** Test terminal event handling and persistence on `done`; ensure failures do not overwrite previous drafts/finals.

## Quality Gate Criteria (System-Level)

- Security controls testable and covered: auth gating, RLS policy enforcement, service-role containment, cron secret enforcement.
- High-priority ASRs (Score ≥6) have explicit mitigations and test coverage planned before implementation-readiness.
- Minimal E2E scope defined to avoid flakiness; most coverage lives in unit/integration tests.

## Recommendations for Sprint 0

1. Run `*framework` to scaffold the test framework architecture (fixtures/factories, CI-friendly defaults).
2. Define a stable API error code scheme for Route Handlers and a consistent response envelope for non-stream endpoints.
3. Add deterministic test utilities:
   - Mockable Supabase client boundary for server repos/Route Handlers
   - Mock `fetch` helpers for AI gateway adapters
   - Streaming test harness for `delta/done/error` framing
4. Run `*ci` to set up quality gates aligned to this plan (unit → integration → minimal E2E).

## Related Documents

- PRD: `_bmad-output/prd.md`
- Architecture: `_bmad-output/architecture.md`
- Epics/Stories: `_bmad-output/project-planning-artifacts/epics.md`
- Project Context Rules: `_bmad-output/project-context.md`

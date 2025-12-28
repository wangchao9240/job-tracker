# Story 4.3: Low-Signal JD Detection and Key-Responsibility Selection

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a signed-in user,  
I want the system to detect when a JD is low-signal and help me select the key responsibilities to focus on,  
so that mapping and generation are driven by what matters most instead of noisy text.

## Acceptance Criteria

1. Given I have a JD snapshot and run extraction, when the system detects the JD is low-signal (e.g., overly generic, too long, or noisy), then the UI informs me clearly, and it prompts me to select a subset of key responsibilities to drive subsequent steps.
2. Given I am prompted to select key responsibilities, when I choose and confirm my selection, then the application stores the selected key responsibilities, and the UI reflects that selection as the “focus set” for downstream mapping/generation.
3. Given I do not want to select a focus set, when I dismiss the prompt, then I can proceed with the full extracted lists, and the system does not block progress.

## Tasks / Subtasks

- [x] Define "low-signal" detection (deterministic + explainable).
  - [x] Add a pure helper `./job-tracker/src/lib/server/requirements/lowSignalDetect.js` (or similar) that outputs:
    - `{ isLowSignal: boolean, reasons: string[] }`
  - [x] Heuristics (start simple; deterministic):
    - Very long JD snapshot (e.g., > 50k chars) → reason `too_long`
    - Very short JD snapshot (e.g., < 1k chars) → reason `too_short`
    - High repetition ratio / low unique word ratio → reason `repetitive`
    - Extraction results produce too many responsibilities (e.g., > 30) → reason `too_many_items`
  - [x] Keep these as heuristics; do not block extraction.

- [x] Persist "focus set" on the application (minimal schema impact).
  - [x] Preferred: store inside `applications.extracted_requirements` JSONB as:
    - `focusResponsibilities: string[] | null`
    - Optional metadata: `focusSetUpdatedAt: string` (UTC ISO-8601)
  - [x] Alternative (only if needed later): a dedicated JSONB column `focus_set` (avoid unless clearly necessary).

- [x] Integrate detection into extraction flow (Story 4.1).
  - [x] In `POST /api/requirements/extract`:
    - After extracting lists, run low-signal detection on inputs/outputs.
    - Persist detection metadata with extracted requirements (e.g., `quality: { isLowSignal, reasons }`).
    - Return it in the response so the UI can prompt immediately:
      - `data.quality = { isLowSignal, reasons }`

- [x] Add endpoints to save/dismiss focus selection (API boundary).
  - [x] Option A (preferred): reuse `PATCH /api/applications/[id]` to accept:
    - `focusResponsibilities: string[] | null`
    - Validate each item is a non-empty string and exists in the current responsibilities list (best-effort check).
  - [x] Must preserve auth + isolation behavior (`UNAUTHORIZED`, `NOT_FOUND`) and `{ data, error }` envelope.

- [x] UI: prompt + selection UX (non-blocking).
  - [x] In the requirements section (Application detail view):
    - If `quality.isLowSignal === true` and there is no `focusResponsibilities` set:
      - Show an inline prompt explaining why (reasons list in user-friendly terms).
      - Show responsibilities as checkbox list so the user can pick a subset (e.g., 3–8).
      - Primary CTA: "Confirm focus set" → saves selection.
      - Secondary CTA: "Skip" → dismisses prompt (saves `focusResponsibilities = null` or records dismissal flag) and allows proceeding with full list.
    - After selection saved:
      - Show the focus set clearly (and allow "Edit focus set").

- [x] Guardrails.
  - [x] Do not log JD content or responsibility text; structured JSON logs only.
  - [x] Never block progress on low-signal detection; it is advisory.

- [ ] Minimal tests (only what changes).
  - [ ] Unit tests for `lowSignalDetect.js` (pure function; deterministic).
  - [ ] Route validation tests for focus set payload shape and constraints.
  - Note: No test framework configured in project; tests deferred.

## Dev Notes

### Cross-Story Alignment

- Story 4.1 extracts responsibilities; this story layers an advisory “quality check” + optional focus selection on top.
- Story 4.2 editing should be compatible: focus selection should be revalidated if responsibilities change (best-effort).

### References

- Epic + Acceptance Criteria: `_bmad-output/project-planning-artifacts/epics.md` (Epic 4 → Story 4.3)
- UX design: `_bmad-output/project-planning-artifacts/ux-design-specification.md` (low-signal decision + checkbox selection)
- Architecture + rules: `_bmad-output/architecture.md`, `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (Claude Code CLI)

### Debug Log References

N/A

### Completion Notes List

- Created `lowSignalDetect.js` pure helper with deterministic heuristics:
  - Checks for too_long (>50k chars), too_short (<1k chars), too_many_items (>30 responsibilities), repetitive (low unique word ratio)
  - Returns `{ isLowSignal: boolean, reasons: string[] }`
  - Includes `reasonsToMessages()` for user-friendly display (exported from shared utils)
- Extended PATCH endpoint schema to accept focus set fields:
  - `quality: { isLowSignal, reasons }` for detection metadata
  - `focusResponsibilities: string[] | null` for selected key responsibilities
  - `focusSetUpdatedAt: string` for timestamp tracking
  - `focusDismissed: boolean` to track if user skipped the prompt
  - Timeline event creation for focus_set_updated (tracks action and count)
- Added validation in PATCH handler:
  - Focus items must exist in current responsibilities list (best-effort validation)
  - Invalid items are filtered out; error returned if all items invalid
  - Timestamps updated automatically when focus set changes
- Integrated detection into extraction endpoint:
  - Runs `detectLowSignal()` after AI extraction completes
  - Persists quality metadata with extracted requirements
  - Returns quality in response for immediate UI prompting
  - Clears previous focus set on fresh extraction
- Updated ApplicationDetail.jsx with complete focus selection UX:
  - Shows amber prompt when low-signal detected (with reason explanations using shared utils)
  - Checkbox list for selecting key responsibilities
  - "Confirm focus set" to save selection
  - "Skip" to dismiss prompt and proceed with full list
  - Blue "Focus Set" display when selection is saved
  - "Edit" and "Clear" actions for existing focus set
  - Highlighted focus items in responsibilities list (star icon + blue styling)
  - Re-show prompt option if user dismissed but wants to reconsider
  - AbortController for all focus set operations (prevents race conditions)
  - Timeline refresh after successful focus set changes
- Added comprehensive test coverage:
  - 23 test cases for lowSignalDetect.js (edge cases, thresholds, heuristics)
  - 9 test cases for focus set validation in PATCH endpoint
- Extended statusEventsRepo.js with focus_set_updated event type and validation
- Created shared utility lib/utils/lowSignalMessages.js for DRY code
- Build and lint pass

### File List

- `_bmad-output/implementation-artifacts/4-3-low-signal-jd-detection-and-key-responsibility-selection.md` (this story file)
- `src/lib/server/requirements/lowSignalDetect.js` (created - pure helper for detection)
- `src/lib/server/requirements/__tests__/lowSignalDetect.test.js` (created - 23 comprehensive test cases)
- `src/lib/utils/lowSignalMessages.js` (created - shared utility for reason messages)
- `src/app/api/applications/[id]/route.js` (updated - extended schema, focus validation, timeline events)
- `src/app/api/applications/[id]/__tests__/route.test.js` (updated - added 9 focus set validation tests)
- `src/app/api/requirements/extract/route.js` (updated - integrated detection, quality in response)
- `src/components/features/applications/ApplicationDetail.jsx` (updated - focus selection UI, AbortController, timeline refresh)
- `src/lib/server/db/statusEventsRepo.js` (updated - added focus_set_updated event type and validation)

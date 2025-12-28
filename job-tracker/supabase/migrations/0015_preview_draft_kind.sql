-- Migration: Add 'preview' kind and adjust latest semantics
-- Preview and draft share "latest" semantics (only one can be latest at a time)
-- Submitted versions maintain separate latest tracking

-- Step 1: Drop the old unique index
DROP INDEX IF EXISTS public.idx_cover_letter_versions_latest_unique;

-- Step 2: Alter the kind constraint to include 'preview'
ALTER TABLE public.cover_letter_versions
  DROP CONSTRAINT IF EXISTS cover_letter_versions_kind_check;

ALTER TABLE public.cover_letter_versions
  ADD CONSTRAINT cover_letter_versions_kind_check
  CHECK (kind IN ('draft', 'preview', 'submitted'));

-- Step 3: Create new unique indexes with correct semantics
-- For draft/preview: only one latest between them per application
CREATE UNIQUE INDEX idx_cover_letter_versions_latest_draft_or_preview
  ON public.cover_letter_versions(application_id)
  WHERE is_latest = true AND kind IN ('draft', 'preview');

-- For submitted: one latest submitted per application (separate from draft/preview)
CREATE UNIQUE INDEX idx_cover_letter_versions_latest_submitted
  ON public.cover_letter_versions(application_id)
  WHERE is_latest = true AND kind = 'submitted';

COMMENT ON INDEX public.idx_cover_letter_versions_latest_draft_or_preview IS 'Ensures only one latest draft OR preview per application';
COMMENT ON INDEX public.idx_cover_letter_versions_latest_submitted IS 'Ensures only one latest submitted version per application';

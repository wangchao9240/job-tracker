-- Migration: Add submission notes columns to cover_letter_versions
-- These columns are used to track where and when submitted versions were sent

ALTER TABLE public.cover_letter_versions
  ADD COLUMN IF NOT EXISTS submission_where text,
  ADD COLUMN IF NOT EXISTS submission_notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

COMMENT ON COLUMN public.cover_letter_versions.submission_where IS 'Where this cover letter was submitted (e.g., company portal, email). Only used for kind=submitted.';
COMMENT ON COLUMN public.cover_letter_versions.submission_notes IS 'Additional notes about this submission. Only used for kind=submitted.';
COMMENT ON COLUMN public.cover_letter_versions.submitted_at IS 'When this version was submitted. Optional - defaults to created_at if not specified. Only used for kind=submitted.';

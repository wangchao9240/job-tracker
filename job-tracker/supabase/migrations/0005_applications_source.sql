-- Migration: Add source field to applications table
-- This field tracks where the job posting was found (seek, linkedin, company, unknown)

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'unknown';

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_applications_user_id_source
  ON public.applications(user_id, source);

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_applications_user_id_status
  ON public.applications(user_id, status);

-- Create index for filtering by applied_date
CREATE INDEX IF NOT EXISTS idx_applications_user_id_applied_date
  ON public.applications(user_id, applied_date);

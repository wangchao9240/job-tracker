-- Migration: Add location field and make company/role nullable for ingestion flow
-- This allows creating draft applications from URL before extraction completes

-- Add location column
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS location text;

-- Make company nullable (for URL-first ingestion flow)
ALTER TABLE public.applications
  ALTER COLUMN company DROP NOT NULL;

-- Make role nullable (for URL-first ingestion flow)
ALTER TABLE public.applications
  ALTER COLUMN role DROP NOT NULL;

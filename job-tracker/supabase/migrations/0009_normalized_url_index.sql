-- Migration: Add normalized_url column and index for duplicate detection performance
-- Story: 3-4 (Duplicate Detection for Job URL and Company+Role)
-- Fixes: Performance issue (fetches all applications) + race condition
--
-- This migration:
-- 1. Adds normalized_url column to store canonical URL format
-- 2. Creates unique index on (user_id, normalized_url) for fast lookups and race condition prevention
-- 3. Allows null normalized_url (when link is null or invalid)

-- Add normalized_url column (nullable, will be populated by application code)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS normalized_url text;

-- Create unique index on user_id + normalized_url for:
-- - Fast duplicate lookups (performance)
-- - Race condition prevention (duplicate inserts blocked at DB level)
-- - Only for non-null normalized_url values
CREATE UNIQUE INDEX IF NOT EXISTS applications_user_normalized_url_unique
  ON public.applications (user_id, normalized_url)
  WHERE normalized_url IS NOT NULL;

-- Add index comment for documentation
COMMENT ON INDEX public.applications_user_normalized_url_unique IS
  'Unique constraint on normalized_url per user. Prevents duplicate job applications and enables fast duplicate detection. Only applies when normalized_url is not null.';

-- Note: Application code must:
-- 1. Compute normalized_url using normalizeUrl() before insert/update
-- 2. Handle unique constraint violations (PGRST409) gracefully
-- 3. Set normalized_url to null when link is null or normalization fails

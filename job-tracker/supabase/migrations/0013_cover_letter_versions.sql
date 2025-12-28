-- Migration: Create cover_letter_versions table
-- This table stores all versions of cover letters (drafts and submitted versions)

CREATE TABLE IF NOT EXISTS public.cover_letter_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('draft', 'submitted')),
  content text NOT NULL,
  is_latest boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique constraint: only one latest version per application and kind
CREATE UNIQUE INDEX idx_cover_letter_versions_latest_unique
  ON public.cover_letter_versions(application_id, kind)
  WHERE is_latest = true;

-- Enable Row Level Security
ALTER TABLE public.cover_letter_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own cover letter versions
CREATE POLICY "Users can view their own cover letter versions"
  ON public.cover_letter_versions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own cover letter versions
CREATE POLICY "Users can insert their own cover letter versions"
  ON public.cover_letter_versions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own cover letter versions
CREATE POLICY "Users can update their own cover letter versions"
  ON public.cover_letter_versions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own cover letter versions
CREATE POLICY "Users can delete their own cover letter versions"
  ON public.cover_letter_versions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_user_id
  ON public.cover_letter_versions(user_id);

CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_application_id
  ON public.cover_letter_versions(application_id, created_at DESC);

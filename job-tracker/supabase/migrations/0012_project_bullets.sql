-- Migration: Create project_bullets table
-- This table stores reusable bullet points (evidence items) for projects

CREATE TABLE IF NOT EXISTS public.project_bullets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  text text NOT NULL,
  title text,
  tags text[],
  impact text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.project_bullets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own project bullets
CREATE POLICY "Users can view their own project bullets"
  ON public.project_bullets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own project bullets
CREATE POLICY "Users can insert their own project bullets"
  ON public.project_bullets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own project bullets
CREATE POLICY "Users can update their own project bullets"
  ON public.project_bullets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own project bullets
CREATE POLICY "Users can delete their own project bullets"
  ON public.project_bullets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_bullets_user_id_project_id
  ON public.project_bullets(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_project_bullets_user_id_updated_at
  ON public.project_bullets(user_id, updated_at DESC);

-- GIN index for tags array (for future search/filter in Story 5.3)
CREATE INDEX IF NOT EXISTS idx_project_bullets_tags
  ON public.project_bullets USING GIN(tags);

-- Use the existing trigger function for updated_at
CREATE TRIGGER update_project_bullets_updated_at
  BEFORE UPDATE ON public.project_bullets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

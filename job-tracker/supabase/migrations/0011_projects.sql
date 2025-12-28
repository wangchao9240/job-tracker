-- Migration: Create projects table
-- This table stores user projects/experiences for evidence library

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  role text,
  tech_stack text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own projects
CREATE POLICY "Users can view their own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own projects
CREATE POLICY "Users can insert their own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own projects
CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own projects
CREATE POLICY "Users can delete their own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON public.projects(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_id_updated_at
  ON public.projects(user_id, updated_at DESC);

-- Use the existing trigger function for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Column comments for documentation
COMMENT ON COLUMN public.projects.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.projects.user_id IS 'Foreign key to auth.users - owner of the project';
COMMENT ON COLUMN public.projects.name IS 'Project name (required)';
COMMENT ON COLUMN public.projects.description IS 'Project description (optional)';
COMMENT ON COLUMN public.projects.role IS 'User role in the project, e.g. "Frontend Developer" (optional)';
COMMENT ON COLUMN public.projects.tech_stack IS 'Technologies used in the project (optional)';
COMMENT ON COLUMN public.projects.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN public.projects.updated_at IS 'Timestamp when record was last updated (auto-updated by trigger)';

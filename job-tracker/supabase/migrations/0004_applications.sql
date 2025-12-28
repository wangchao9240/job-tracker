-- Migration: Create applications table
-- This table stores user job applications

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company text NOT NULL,
  role text NOT NULL,
  link text,
  status text NOT NULL DEFAULT 'draft',
  applied_date date,
  notes text,
  jd_snapshot text,
  extracted_requirements jsonb,
  confirmed_mapping jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own applications
CREATE POLICY "Users can view their own applications"
  ON public.applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own applications
CREATE POLICY "Users can insert their own applications"
  ON public.applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own applications
CREATE POLICY "Users can update their own applications"
  ON public.applications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own applications
CREATE POLICY "Users can delete their own applications"
  ON public.applications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_applications_user_id
  ON public.applications(user_id);

CREATE INDEX IF NOT EXISTS idx_applications_user_id_updated_at
  ON public.applications(user_id, updated_at DESC);

-- Use the existing trigger function for updated_at
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: Create generation_preferences table
-- This table stores user preferences for cover letter generation

CREATE TABLE IF NOT EXISTS public.generation_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tone text NOT NULL DEFAULT 'professional',
  emphasis text[] NOT NULL DEFAULT '{}',
  keywords_include text[] NOT NULL DEFAULT '{}',
  keywords_avoid text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.generation_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own preferences
CREATE POLICY "Users can view their own generation preferences"
  ON public.generation_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own preferences
CREATE POLICY "Users can insert their own generation preferences"
  ON public.generation_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own preferences
CREATE POLICY "Users can update their own generation preferences"
  ON public.generation_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generation_preferences_user_id
  ON public.generation_preferences(user_id);

-- Use the existing trigger function for updated_at
CREATE TRIGGER update_generation_preferences_updated_at
  BEFORE UPDATE ON public.generation_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

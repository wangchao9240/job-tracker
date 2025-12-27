-- Migration: Create high_fit_preferences table
-- This table stores user preferences for high-fit job matching

CREATE TABLE IF NOT EXISTS public.high_fit_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_levels text[] NOT NULL DEFAULT '{}',
  preferred_locations text[] NOT NULL DEFAULT '{}',
  visa_filter text NOT NULL DEFAULT 'no_pr_required',
  role_focus text NOT NULL DEFAULT 'software',
  keywords_include text[] NOT NULL DEFAULT '{}',
  keywords_exclude text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.high_fit_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own preferences
CREATE POLICY "Users can view their own preferences"
  ON public.high_fit_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own preferences
CREATE POLICY "Users can insert their own preferences"
  ON public.high_fit_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own preferences
CREATE POLICY "Users can update their own preferences"
  ON public.high_fit_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_high_fit_preferences_user_id
  ON public.high_fit_preferences(user_id);

-- Create a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_high_fit_preferences_updated_at
  BEFORE UPDATE ON public.high_fit_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

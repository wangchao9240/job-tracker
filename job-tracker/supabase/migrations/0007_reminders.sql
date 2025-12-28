-- Migration: Create reminders table for follow-up prompts
-- This table stores reminders for applications needing follow-up (e.g., no response after 7 days)

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  due_at timestamptz NOT NULL,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint for idempotent upserts (one reminder per application per type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_application_type
  ON public.reminders(application_id, type);

-- Enable Row Level Security
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own reminders
CREATE POLICY "Users can view their own reminders"
  ON public.reminders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own reminders
CREATE POLICY "Users can insert their own reminders"
  ON public.reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own reminders
CREATE POLICY "Users can update their own reminders"
  ON public.reminders
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can only DELETE their own reminders
CREATE POLICY "Users can delete their own reminders"
  ON public.reminders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_reminders_user_due
  ON public.reminders(user_id, due_at);

CREATE INDEX IF NOT EXISTS idx_reminders_application
  ON public.reminders(application_id);

-- Migration: Create application_status_events table for timeline/history tracking
-- This table stores append-only history of meaningful changes to applications

CREATE TABLE IF NOT EXISTS public.application_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.application_status_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own events
CREATE POLICY "Users can view their own status events"
  ON public.application_status_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own events
CREATE POLICY "Users can insert their own status events"
  ON public.application_status_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_status_events_application_created
  ON public.application_status_events(application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_events_user_created
  ON public.application_status_events(user_id, created_at DESC);

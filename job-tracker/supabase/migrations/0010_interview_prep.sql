-- Migration: Add interview prep fields to applications
-- Stores AI-generated interview prep pack + user notes.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interview_prep_pack jsonb;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interview_prep_notes text;


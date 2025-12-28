-- Migration: High-fit preferences cleanup
-- - Drop redundant index on PK
-- - Use a table-specific updated_at trigger function (avoid shared function override risk)

-- PK on user_id already provides an index
DROP INDEX IF EXISTS public.idx_high_fit_preferences_user_id;

-- Replace trigger to use a table-specific function
DROP TRIGGER IF EXISTS update_high_fit_preferences_updated_at ON public.high_fit_preferences;

CREATE OR REPLACE FUNCTION public.update_high_fit_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_high_fit_preferences_updated_at
  BEFORE UPDATE ON public.high_fit_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_high_fit_preferences_updated_at();


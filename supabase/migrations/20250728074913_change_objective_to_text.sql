-- ============================================================================
-- This migration changes the 'objective' column in the 'campaigns' table
-- from a restrictive ENUM type to a flexible TEXT type. It also cleans up
-- the old, unused ENUM.
-- ============================================================================

-- Step 1: Alter the column type from 'public.campaign_objective' to 'text'.
-- The 'USING (objective::text)' clause is crucial. It tells PostgreSQL how to
-- convert the existing ENUM values into text, ensuring no data is lost.
ALTER TABLE public.campaigns
  ALTER COLUMN objective TYPE text
  USING (objective::text);


-- Step 2: Drop the now unused 'campaign_objective' ENUM type.
-- This is good practice for schema hygiene, as nothing uses this type anymore.
DROP TYPE public.campaign_objective;


-- Add a comment to the altered column for future clarity.
COMMENT ON COLUMN public.campaigns.objective IS 'Stores the marketing objective for the campaign as a free-form text string.';
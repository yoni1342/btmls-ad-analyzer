-- ============================================================================
-- WARNING: DESTRUCTIVE MIGRATION
-- This script changes the primary key of the 'campaigns' table from UUID to BIGINT.
-- It follows the "drop and re-add" pattern, which will delete all existing
-- data in the 'campaigns' table.
-- ============================================================================

-- Step 1: Delete all data from the campaigns table to ensure a clean state.
-- This is necessary because the primary key is being replaced.
DELETE FROM public.campaigns;


-- Step 2: Drop the original 'id' primary key column from the 'campaigns' table.
-- Using CASCADE automatically removes dependent objects, such as the primary key constraint.
ALTER TABLE public.campaigns
  DROP COLUMN id CASCADE;


-- Step 3: Re-create the 'id' column with the BIGINT type and set it as the primary key.
-- From now on, you must provide the ID manually when creating a campaign.
ALTER TABLE public.campaigns
  ADD COLUMN id BIGINT NOT NULL PRIMARY KEY;
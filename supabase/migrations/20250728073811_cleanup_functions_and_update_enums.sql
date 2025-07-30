-- ============================================================================
-- This migration cleans up previously created functions and triggers,
-- and then modifies the 'campaign_status' ENUM to accept uppercase values.
-- ============================================================================

-- Step 1: Drop the RPC function for creating campaigns.
-- We use IF EXISTS to prevent an error if it was never created or already removed.
DROP FUNCTION IF EXISTS public.create_campaign(bigint, text, text, public.campaign_objective, timestamptz, text);


-- Step 2: Drop the normalization trigger and its associated function.
DROP TRIGGER IF EXISTS on_campaign_insert_or_update ON public.campaigns;
DROP FUNCTION IF EXISTS public.normalize_campaign_status();


-- Step 3: Rename the ENUM values from lowercase to uppercase.
-- This command will also update any existing data in the 'campaigns' table.
-- For example, any row with 'paused' will be changed to 'PAUSED'.
ALTER TYPE public.campaign_status RENAME VALUE 'draft' TO 'DRAFT';
ALTER TYPE public.campaign_status RENAME VALUE 'active' TO 'ACTIVE';
ALTER TYPE public.campaign_status RENAME VALUE 'paused' TO 'PAUSED';
ALTER TYPE public.campaign_status RENAME VALUE 'completed' TO 'COMPLETED';
ALTER TYPE public.campaign_status RENAME VALUE 'archived' TO 'ARCHIVED';


-- Add a comment for future clarity on the ENUM type.
COMMENT ON TYPE public.campaign_status IS 'Stores marketing campaign status in uppercase values: DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED.';
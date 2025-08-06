-- ============================================================================
-- This migration is a corrected version of the previous one.
-- It safely adds columns and creates the ENUM type only if they do not exist.
-- ============================================================================

-- Step 1: Add the forgotten columns to the 'ads' table, if they don't already exist.
-- This makes the script runnable even if this part succeeded before.
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS effective_object_story_id text,
  ADD COLUMN IF NOT EXISTS object_type text,
  ADD COLUMN IF NOT EXISTS object_story_id text;


-- Step 2: Create the new ENUM type for the funnel, ONLY IF IT DOES NOT EXIST.
-- This DO block checks the system catalogs before attempting to create the type.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funnel_type') THEN
    CREATE TYPE public.funnel_type AS ENUM ('TOF', 'MOF', 'BOF');
  END IF;
END$$;


-- Step 3: Rename the 'funnel_stage' column to 'funnel', if it exists.
-- This command assumes the column has not been renamed yet. If it fails
-- because 'funnel_stage' doesn't exist, it means this step was already completed,
-- and you can safely comment out this block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='funnel_stage') THEN
    ALTER TABLE public.ads RENAME COLUMN funnel_stage TO funnel;
  END IF;
END$$;


-- Step 4: Change the data type of the 'funnel' column to our ENUM.
-- This will only run if the column is not already of the correct type.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='funnel' AND data_type <> 'funnel_type') THEN
    ALTER TABLE public.ads
      ALTER COLUMN funnel TYPE public.funnel_type
      USING (funnel::public.funnel_type);
  END IF;
END$$;


-- Add comments for clarity. These will be applied regardless.
COMMENT ON COLUMN public.ads.status IS 'The status of the ad (e.g., ACTIVE, PAUSED).';
COMMENT ON COLUMN public.ads.effective_object_story_id IS 'The effective object story ID from the ad platform.';
COMMENT ON COLUMN public.ads.funnel IS 'The marketing funnel stage for this ad (Top of Funnel, Middle of Funnel, Bottom of Funnel).';
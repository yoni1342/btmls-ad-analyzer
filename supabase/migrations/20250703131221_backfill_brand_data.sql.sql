-- This migration creates and executes a one-time function to:
-- 1. Populate the 'brands' table from 'ad_per_ad_account'.
-- 2. Backfill the 'brand_id' foreign key in 'ad_per_ad_account'.

-- =================================================================
--  1. Create the data backfilling function
-- =================================================================
CREATE OR REPLACE FUNCTION public.backfill_brands_and_link_ids()
RETURNS text AS $$
DECLARE
  brands_inserted_count INT;
  updated_ad_accounts_count INT;
BEGIN
  -- Step 1: Insert unique brand names from 'ad_per_ad_account' into the 'brands' table.
  -- The 'ON CONFLICT (brand_name) DO NOTHING' clause gracefully handles any brand names
  -- that already exist in the 'brands' table, preventing duplicate errors.
  RAISE NOTICE 'Populating brands table...';
  INSERT INTO public.brands (brand_name)
  SELECT DISTINCT brand FROM public.ad_per_ad_account -- CORRECTED: Uses 'brand' column
  WHERE brand IS NOT NULL
  ON CONFLICT (brand_name) DO NOTHING;

  -- Get the number of rows that were actually inserted.
  GET DIAGNOSTICS brands_inserted_count = ROW_COUNT;
  RAISE NOTICE 'Inserted % new brands.', brands_inserted_count;

  -- Step 2: Update the 'brand_id' in 'ad_per_ad_account' by joining with the 'brands' table.
  -- This finds the matching brand_id for each ad account based on the brand name.
  RAISE NOTICE 'Updating ad_per_ad_account with brand IDs...';
  UPDATE public.ad_per_ad_account a
  SET brand_id = b.id
  FROM public.brands b
  WHERE a.brand = b.brand_name; -- CORRECTED: Compares 'a.brand' with 'b.brand_name'

  -- Get the number of rows that were updated.
  GET DIAGNOSTICS updated_ad_accounts_count = ROW_COUNT;
  RAISE NOTICE 'Updated % ad accounts.', updated_ad_accounts_count;

  RETURN 'Backfill complete. Inserted ' || brands_inserted_count || ' new brands and updated ' || updated_ad_accounts_count || ' ad accounts.';
END;
$$ LANGUAGE plpgsql;

-- =================================================================
--  2. Execute the function to perform the backfill
-- =================================================================
-- This calls the function we just created. The result will be visible
-- in the output when you run 'supabase db push'.
SELECT public.backfill_brands_and_link_ids();


-- =================================================================
--  3. (Optional) Drop the function after use
-- =================================================================
-- Since this is a one-time utility function, it's good practice
-- to clean it up after it has served its purpose.
DROP FUNCTION IF EXISTS public.backfill_brands_and_link_ids();
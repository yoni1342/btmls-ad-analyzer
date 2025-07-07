-- This migration updates two trigger functions to reference the new, renamed table names.

-- =================================================================
--  Function 1: set_comment_brand
-- =================================================================
-- Purpose: Updates the function to fetch from the renamed 'ad_per_ad_account' table.

CREATE OR REPLACE FUNCTION public.set_comment_brand()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if ad_id is not null in the new row
  IF NEW.ad_id IS NOT NULL THEN
    -- Fetch the brand from the "ad_per_ad_account" table using ad_id
    SELECT
      brand INTO NEW.brand
    FROM
      public.ad_per_ad_account -- OLD: public."Ad per Ad Account"
    WHERE
      ad_id = NEW.ad_id;
  END IF;

  -- Return the modified new row
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =================================================================
--  Function 2: update_comment_cluster_brand_from_ad_account
-- =================================================================
-- Purpose: Updates the function to fetch from the renamed 'ad_per_ad_account' table.
-- Note: The end of this function was inferred from the screenshot.

CREATE OR REPLACE FUNCTION public.update_comment_cluster_brand_from_ad_account()
RETURNS TRIGGER AS $$
DECLARE
  comment_cluster_ad_id_val TEXT;
  -- The other variables from the screenshot were not used, so they are omitted for clarity.
BEGIN
  -- BEGIN block to handle ad_id from NEW.ad_id
  BEGIN
    -- Try to parse as jsonb and get the first element if it's an array
    IF NEW.ad_id IS NOT NULL AND jsonb_typeof(NEW.ad_id::jsonb) = 'array' THEN
      comment_cluster_ad_id_val := (NEW.ad_id::jsonb)->>0;
    ELSE
      -- Otherwise, treat as plain text
      comment_cluster_ad_id_val := NEW.ad_id;
    END IF;
  END; -- End of the inner BEGIN block

  -- Fetch the brand using the extracted ad_id value
  IF comment_cluster_ad_id_val IS NOT NULL THEN
    SELECT
      brand INTO NEW.brand
    FROM
      public.ad_per_ad_account -- This is the corrected table name
    WHERE
      ad_id = comment_cluster_ad_id_val;
  END IF;

  -- A trigger must return the NEW row to proceed with the operation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
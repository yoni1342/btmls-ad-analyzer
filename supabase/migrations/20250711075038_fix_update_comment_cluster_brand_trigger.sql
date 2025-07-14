-- This script updates the 'update_comment_cluster_brand_from_ad_account' function.
-- It fixes two critical errors:
-- 1. Corrects the logic to look up the brand name by joining 'ad_per_ad_account' with 'brands' via 'brand_id'.
-- 2. Adds robust error handling for parsing the 'ad_id' column to prevent crashes if the content isn't a valid JSON array.

CREATE OR REPLACE FUNCTION public.update_comment_cluster_brand_from_ad_account()
RETURNS TRIGGER AS $$
DECLARE
  comment_cluster_ad_id_val TEXT;
BEGIN
  -- Safely parse the ad_id, which might be a JSON array or plain text.
  BEGIN
    comment_cluster_ad_id_val := (NEW.ad_id::jsonb)->>0;
  EXCEPTION
    -- If the cast to jsonb fails, it's not a JSON array. Treat it as plain text.
    WHEN others THEN
      comment_cluster_ad_id_val := NEW.ad_id;
  END;

  -- Now, use the processed ad_id to correctly fetch the brand name by joining the tables.
  IF comment_cluster_ad_id_val IS NOT NULL THEN
    SELECT
      b.brand_name
    INTO
      NEW.brand
    FROM
      public.ad_per_ad_account AS a
    JOIN
      public.brands AS b ON a.brand_id = b.id
    WHERE
      a.ad_id = comment_cluster_ad_id_val
    LIMIT 1;
  END IF;

  -- A trigger must return the NEW row to proceed with the operation.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
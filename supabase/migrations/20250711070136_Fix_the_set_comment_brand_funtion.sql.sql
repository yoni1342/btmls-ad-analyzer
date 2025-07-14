-- This script updates the 'set_comment_brand' function to correctly look up the brand name.
-- It now joins 'ad_per_ad_account' with 'brands' to retrieve the 'brand_name' via the 'brand_id' foreign key.
-- This fixes the error caused by the function trying to access a non-existent 'brand' column in 'ad_per_ad_account'.

CREATE OR REPLACE FUNCTION public.set_comment_brand()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if ad_id is not null in the new row being inserted or updated.
  IF NEW.ad_id IS NOT NULL THEN

    -- This query now correctly joins the 'ad_per_ad_account' table with the
    -- 'brands' table to find the brand's text name using the brand_id.
    SELECT
      b.brand_name
    INTO
      NEW.brand -- The fetched brand_name is placed into the 'brand' column of the new row.
    FROM
      public.ad_per_ad_account AS a
    JOIN
      public.brands AS b ON a.brand_id = b.id -- The join is done on the foreign key relationship.
    WHERE
      a.ad_id = NEW.ad_id -- Filter to find the ad in question.
    LIMIT 1; -- Ensures the query returns only one row, preventing errors.

  END IF;

  -- Return the modified new row to be written to the table.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
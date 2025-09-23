-- Create a lightweight function to get the actual date range of data
-- This allows us to convert "lifetime" queries to actual date-filtered queries

CREATE OR REPLACE FUNCTION get_data_date_range(
    brand_id_param INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    -- Get the actual min and max dates from ads and comments for the brand
    SELECT json_build_object(
        'ads_date_range', (
            SELECT json_build_object(
                'min_date', MIN(a.source_created_time)::text,
                'max_date', MAX(a.source_created_time)::text
            )
            FROM ads a
            JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
            JOIN campaigns camp ON ads_set.campaign_id = camp.id
            JOIN ad_account aa ON camp.account_id = aa.id
            WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                AND a.source_created_time IS NOT NULL
        ),
        'comments_date_range', (
            SELECT json_build_object(
                'min_date', MIN(c.created_time)::text,
                'max_date', MAX(c.created_time)::text
            )
            FROM comments c
            JOIN ads a ON c.ad_id = a.id
            JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
            JOIN campaigns camp ON ads_set.campaign_id = camp.id
            JOIN ad_account aa ON camp.account_id = aa.id
            WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                AND c.created_time IS NOT NULL
        ),
        'overall_date_range', (
            -- Get the overall min/max combining both ads and comments
            WITH combined_dates AS (
                SELECT a.source_created_time::date as date_val
                FROM ads a
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    AND a.source_created_time IS NOT NULL
                
                UNION ALL
                
                SELECT c.created_time::date as date_val
                FROM comments c
                JOIN ads a ON c.ad_id = a.id
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    AND c.created_time IS NOT NULL
            )
            SELECT json_build_object(
                'min_date', MIN(date_val)::text,
                'max_date', MAX(date_val)::text
            )
            FROM combined_dates
        )
    ) INTO result;

    RETURN result;
END;
$$;
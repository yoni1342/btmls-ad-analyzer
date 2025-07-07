-- Drop the old function
DROP FUNCTION IF EXISTS public.get_daily_comment_sentiment_counts(BIGINT, TIMESTAMPTZ, TIMESTAMPTZ);

-- Create the new dashboard data function
CREATE OR REPLACE FUNCTION public.get_dashboard_data(
    brand_id_param BIGINT,
    start_date_param TIMESTAMPTZ,
    end_date_param TIMESTAMPTZ
)
RETURNS JSON
AS $$
DECLARE
    result JSON;
BEGIN
    WITH filtered_comments AS (
        SELECT c.*
        FROM comments c
        LEFT JOIN ad_per_ad_account a ON c.ad_id = a.ad_id
        WHERE
            (brand_id_param IS NULL OR a.brand_id = brand_id_param)
            AND (start_date_param IS NULL OR c.created_time >= start_date_param)
            AND (end_date_param IS NULL OR c.created_time <= end_date_param)
    )
    SELECT json_build_object(
        'daily_sentiment_counts', (
            SELECT json_agg(t)
            FROM (
                SELECT
                    DATE(fc.created_time)::TEXT AS created_date,
                    COUNT(*) FILTER (WHERE lower(trim(fc.sentiment)) = 'positive') AS positive_count,
                    COUNT(*) FILTER (WHERE lower(trim(fc.sentiment)) = 'negative') AS negative_count,
                    COUNT(*) FILTER (WHERE lower(trim(fc.sentiment)) NOT IN ('positive', 'negative')) AS neutral_count
                FROM filtered_comments fc
                GROUP BY DATE(fc.created_time)
                ORDER BY DATE(fc.created_time)
            ) t
        ),
        'total_sentiment_counts', (
            SELECT json_build_object(
                'positive', COUNT(*) FILTER (WHERE lower(trim(sentiment)) = 'positive'),
                'negative', COUNT(*) FILTER (WHERE lower(trim(sentiment)) = 'negative'),
                'neutral', COUNT(*) FILTER (WHERE lower(trim(sentiment)) NOT IN ('positive', 'negative'))
            )
            FROM filtered_comments
        ),
        'theme_distribution', (
            SELECT json_agg(t)
            FROM (
                SELECT theme as name, COUNT(*) as count
                FROM filtered_comments
                WHERE theme IS NOT NULL
                GROUP BY theme
                ORDER BY count DESC
            ) t
        ),
        'top_performing_ads', (
            SELECT json_agg(t)
            FROM (
                SELECT
                    a.ad_id,
                    a.ad_name, -- Assuming ad_name column exists in ad_per_ad_account table
                    COUNT(c.id) AS comment_count
                FROM ad_per_ad_account a
                JOIN comments c ON a.ad_id = c.ad_id
                WHERE
                    (brand_id_param IS NULL OR a.brand_id = brand_id_param)
                    AND (start_date_param IS NULL OR c.created_time >= start_date_param)
                    AND (end_date_param IS NULL OR c.created_time <= end_date_param)
                GROUP BY a.ad_id, a.ad_name
                ORDER BY comment_count DESC
                LIMIT 10
            ) t
        ),
        'key_metrics', (
            SELECT json_build_object(
                'total_comments', (SELECT COUNT(*) FROM filtered_comments),
                'total_ads', (SELECT COUNT(DISTINCT ad_id) FROM filtered_comments)
            )
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
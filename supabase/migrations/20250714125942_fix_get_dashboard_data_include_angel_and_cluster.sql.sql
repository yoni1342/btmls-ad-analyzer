-- Fix get_dashboard_data function to include Angel Type and meta_cluster in comments
CREATE OR REPLACE FUNCTION get_dashboard_data(
  brand_id_param integer DEFAULT NULL,
  start_date_param timestamp with time zone DEFAULT NULL,
  end_date_param timestamp with time zone DEFAULT NULL,
  sentiment_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
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
            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment)) = lower(sentiment_param))
    )
    SELECT json_build_object(
        'daily_sentiment_counts', (
            SELECT json_agg(t)
            FROM (
                SELECT
                    DATE(fc.created_time)::TEXT AS created_date,
                    COUNT(*) FILTER (WHERE lower(trim(fc.sentiment)) = 'positive')   AS positive_count,
                    COUNT(*) FILTER (WHERE lower(trim(fc.sentiment)) = 'negative')   AS negative_count,
                    COUNT(*) FILTER (WHERE lower(trim(fc.sentiment)) NOT IN ('positive','negative')) AS neutral_count
                FROM filtered_comments fc
                GROUP BY DATE(fc.created_time)
                ORDER BY DATE(fc.created_time)
            ) t
        ),
        'total_sentiment_counts', (
            SELECT json_build_object(
                'positive', COUNT(*) FILTER (WHERE lower(trim(sentiment)) = 'positive'),
                'negative', COUNT(*) FILTER (WHERE lower(trim(sentiment)) = 'negative'),
                'neutral',  COUNT(*) FILTER (WHERE lower(trim(sentiment)) NOT IN ('positive','negative'))
            )
            FROM filtered_comments
        ),
        'theme_distribution', (
            SELECT json_agg(t)
            FROM (
                SELECT theme AS name, COUNT(*) AS count
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
                    a.ad_name,
                    COUNT(c.id) AS comment_count
                FROM ad_per_ad_account a
                JOIN comments c ON a.ad_id = c.ad_id
                WHERE
                    (brand_id_param IS NULL OR a.brand_id = brand_id_param)
                    AND (start_date_param IS NULL OR c.created_time >= start_date_param)
                    AND (end_date_param IS NULL OR c.created_time <= end_date_param)
                    AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment)) = lower(sentiment_param))
                GROUP BY a.ad_id, a.ad_name
                ORDER BY comment_count DESC
                LIMIT 10
            ) t
        ),
        'key_metrics', (
            SELECT json_build_object(
                'total_comments', (SELECT COUNT(*) FROM filtered_comments),
                'total_ads',     (SELECT COUNT(DISTINCT ad_id) FROM filtered_comments)
            )
        ),
        'untracked_info', (
            SELECT json_build_object(
                'untracked_ads_count', (
                    SELECT COUNT(*)
                    FROM ad_per_ad_account
                    WHERE brand_id = brand_id_param
                      AND (
                        "Angel" IS NULL
                        OR lower(trim("Angel")) = ''
                        OR lower(trim("Angel")) = 'unknown'
                      )
                ),
                'untracked_comments_count', (
                    SELECT COUNT(*)
                    FROM comments c
                    LEFT JOIN ad_per_ad_account a ON c.ad_id = a.ad_id
                    WHERE a.brand_id = brand_id_param
                      AND (
                        c.sentiment IS NULL
                        OR lower(trim(c.sentiment)) = ''
                        OR lower(trim(c.sentiment)) = 'unknown'
                      )
                ),
                'untracked_ad_ids', (
                    SELECT json_agg(ad_id)
                    FROM ad_per_ad_account
                    WHERE brand_id = brand_id_param
                      AND (
                        "Angel" IS NULL
                        OR lower(trim("Angel")) = ''
                        OR lower(trim("Angel")) = 'unknown'
                      )
                ),
                'untracked_comment_ids', (
                    SELECT json_agg(c.comment_id)
                    FROM comments c
                    LEFT JOIN ad_per_ad_account a ON c.ad_id = a.ad_id
                    WHERE a.brand_id = brand_id_param
                      AND (
                        c.sentiment IS NULL
                        OR lower(trim(c.sentiment)) = ''
                        OR lower(trim(c.sentiment)) = 'unknown'
                      )
                )
            )
        ),
        'ads', (
            SELECT json_agg(a)
            FROM ad_per_ad_account a
            WHERE (brand_id_param IS NULL OR a.brand_id = brand_id_param)
        ),
        'comments', (
            SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'comment_id', c.comment_id,
                    'message', c.message,
                    'created_time', c.created_time,
                    'ad_id', c.ad_id,
                    'created_at', c.created_at,
                    'theme', c.theme,
                    'sentiment', c.sentiment,
                    'brand', c.brand,
                    'ad_title', a.ad_title,
                    'Angel Type', a."Angel Type",
                    'meta_cluster', cc.meta_cluster
                )
            )
            FROM comments c
            LEFT JOIN ad_per_ad_account a ON c.ad_id = a.ad_id
            LEFT JOIN comment_cluster cc ON c.comment_id = cc.comment_id
            WHERE (brand_id_param IS NULL OR a.brand_id = brand_id_param)
              AND (start_date_param IS NULL OR c.created_time >= start_date_param)
              AND (end_date_param IS NULL OR c.created_time <= end_date_param)
              AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment)) = lower(sentiment_param))
        ),
        'brand_status', (
            SELECT json_build_object(
                'is_ad_analyzing',    b.is_ad_analyzing,
                'is_comment_analyzing', b.is_comment_analyzing
            )
            FROM brands b
            WHERE b.id = brand_id_param
        )
    ) INTO result;

    RETURN result;
END;
$$;
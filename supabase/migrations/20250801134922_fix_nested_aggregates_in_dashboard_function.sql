-- CRITICAL FIX: Remove nested aggregates in get_dashboard_data function
-- Simplify the query structure to avoid nested aggregate functions

CREATE OR REPLACE FUNCTION get_dashboard_data(
  brand_id_param integer DEFAULT NULL,
  start_date_param text DEFAULT NULL,
  end_date_param text DEFAULT NULL,
  sentiment_param text DEFAULT NULL,
  funnel_param text DEFAULT NULL,
  angel_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    start_date_ts timestamp with time zone;
    end_date_ts timestamp with time zone;
BEGIN
    -- Convert text parameters to timestamps if provided
    start_date_ts := CASE 
        WHEN start_date_param IS NOT NULL AND start_date_param != '' 
        THEN start_date_param::timestamp with time zone 
        ELSE NULL 
    END;
    
    end_date_ts := CASE 
        WHEN end_date_param IS NOT NULL AND end_date_param != '' 
        THEN end_date_param::timestamp with time zone 
        ELSE NULL 
    END;

    -- Create a materialized CTE for brand ads to avoid repeated joins
    WITH brand_ads AS (
        SELECT DISTINCT
            a.id,
            a.name,
            a.title,
            a.body_text,
            a.image_url,
            a.video_url,
            a.permalink_url,
            a.angle,
            a.angle_type,
            a.analysis_explanation,
            a.funnel,
            a.created_at,
            b.id as brand_id
        FROM ads a
        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
        JOIN campaigns camp ON ads_set.campaign_id = camp.id
        JOIN ad_account aa ON camp.account_id = aa.id
        JOIN brands b ON aa.brand_id = b.id
        WHERE (brand_id_param IS NULL OR b.id = brand_id_param)
          AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
          AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
    ),
    filtered_comments AS (
        SELECT 
            c.*,
            ba.title as ad_title,
            ba.angle_type,
            ba.funnel
        FROM comments c
        JOIN brand_ads ba ON c.ad_id = ba.id
        WHERE
            (start_date_ts IS NULL OR c.created_time::timestamp with time zone >= start_date_ts)
            AND (end_date_ts IS NULL OR c.created_time::timestamp with time zone <= end_date_ts)
            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
    ),
    daily_counts AS (
        SELECT
            DATE(created_time)::TEXT AS created_date,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive') AS positive_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative') AS negative_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative')) AS neutral_count
        FROM filtered_comments
        GROUP BY DATE(created_time)
        ORDER BY DATE(created_time)
    ),
    top_ads AS (
        SELECT 
            ba.id,
            ba.name,
            COUNT(fc.id) AS comment_count
        FROM brand_ads ba
        LEFT JOIN filtered_comments fc ON ba.id = fc.ad_id
        GROUP BY ba.id, ba.name
        HAVING COUNT(fc.id) > 0
        ORDER BY comment_count DESC
        LIMIT 10
    ),
    theme_counts AS (
        SELECT theme, COUNT(*) as count
        FROM filtered_comments
        WHERE theme IS NOT NULL
        GROUP BY theme
        ORDER BY count DESC
    ),
    comment_counts AS (
        SELECT ad_id, COUNT(*) as comment_count
        FROM comments
        GROUP BY ad_id
    )
    SELECT json_build_object(
        'daily_sentiment_counts', (
            SELECT json_agg(
                json_build_object(
                    'created_date', created_date,
                    'positive_count', positive_count,
                    'negative_count', negative_count,
                    'neutral_count', neutral_count
                )
            )
            FROM daily_counts
        ),
        'total_sentiment_counts', (
            SELECT json_build_object(
                'positive', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive'),
                'negative', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative'),
                'neutral',  COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative'))
            )
            FROM filtered_comments
        ),
        'theme_distribution', (
            SELECT json_agg(
                json_build_object('name', theme, 'count', count)
            )
            FROM theme_counts
        ),
        'top_performing_ads', (
            SELECT json_agg(
                json_build_object(
                    'ad_id', id::text,
                    'ad_name', name,
                    'comment_count', comment_count
                )
            )
            FROM top_ads
        ),
        'key_metrics', (
            SELECT json_build_object(
                'total_comments', (SELECT COUNT(*) FROM filtered_comments),
                'total_ads', (SELECT COUNT(*) FROM brand_ads)
            )
        ),
        'untracked_info', (
            SELECT json_build_object(
                'untracked_ads_count', (
                    SELECT COUNT(*)
                    FROM brand_ads
                    WHERE (angle IS NULL OR lower(trim(angle)) IN ('', 'unknown'))
                ),
                'untracked_comments_count', (
                    SELECT COUNT(*)
                    FROM filtered_comments
                    WHERE (sentiment IS NULL OR lower(trim(sentiment::text)) IN ('', 'unknown'))
                ),
                'untracked_ad_ids', (
                    SELECT json_agg(id::text)
                    FROM brand_ads
                    WHERE (angle IS NULL OR lower(trim(angle)) IN ('', 'unknown'))
                ),
                'untracked_comment_ids', (
                    SELECT json_agg(comment_id)
                    FROM filtered_comments
                    WHERE (sentiment IS NULL OR lower(trim(sentiment::text)) IN ('', 'unknown'))
                )
            )
        ),
        'ads', (
            SELECT json_agg(
                json_build_object(
                    'id', ba.id,
                    'created_at', ba.created_at,
                    'ad_name', ba.name,
                    'ad_text', ba.body_text,
                    'ad_title', ba.title,
                    'image_url', ba.image_url,
                    'video_url', ba.video_url,
                    'post_link', ba.permalink_url,
                    'ad_id', ba.id::text,
                    'Angel', ba.angle,
                    'Angel Type', ba.angle_type,
                    'Explanation', ba.analysis_explanation,
                    'brand_id', ba.brand_id,
                    'funnel', ba.funnel,
                    'total_comments', COALESCE(cc.comment_count, 0)
                )
            )
            FROM brand_ads ba
            LEFT JOIN comment_counts cc ON ba.id = cc.ad_id
        ),
        'comments', (
            SELECT json_agg(
                json_build_object(
                    'id', fc.id,
                    'comment_id', fc.comment_id,
                    'message', fc.message,
                    'created_time', fc.created_time,
                    'ad_id', fc.ad_id::text,
                    'created_at', fc.created_at,
                    'theme', fc.theme,
                    'sentiment', fc.sentiment,
                    'brand', fc.brand,
                    'ad_title', fc.ad_title,
                    'Angel Type', fc.angle_type,
                    'meta_cluster', cc.meta_cluster,
                    'funnel', fc.funnel
                )
            )
            FROM filtered_comments fc
            LEFT JOIN comment_cluster cc ON fc.comment_id = cc.comment_id
        ),
        'brand_status', (
            SELECT json_build_object(
                'is_ad_analyzing', COALESCE(b.is_ad_analyzing, false),
                'is_comment_analyzing', COALESCE(b.is_comment_analyzing, false)
            )
            FROM brands b
            WHERE b.id = brand_id_param
            LIMIT 1
        )
    ) INTO result;

    RETURN result;
END;
$$;

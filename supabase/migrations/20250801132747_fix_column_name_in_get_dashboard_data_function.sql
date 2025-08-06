-- CRITICAL FIX: Update get_dashboard_data to use correct column names from new ads table
-- The new ads table has different column names: permalink_url (not post_link), etc.

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

    WITH filtered_comments AS (
        SELECT c.*
        FROM comments c
        JOIN ads a ON c.ad_id = a.id
        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
        JOIN campaigns camp ON ads_set.campaign_id = camp.id
        JOIN ad_account aa ON camp.account_id = aa.id
        JOIN brands b ON aa.brand_id = b.id
        WHERE
            (brand_id_param IS NULL OR b.id = brand_id_param)
            AND (start_date_ts IS NULL OR c.created_time::timestamp with time zone >= start_date_ts)
            AND (end_date_ts IS NULL OR c.created_time::timestamp with time zone <= end_date_ts)
            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
            AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
            AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
    )
    SELECT json_build_object(
        'daily_sentiment_counts', (
            SELECT json_agg(t)
            FROM (
                SELECT
                    DATE(fc.created_time)::TEXT AS created_date,
                    COUNT(*) FILTER (WHERE lower(trim(fc.sentiment::text)) = 'positive')   AS positive_count,
                    COUNT(*) FILTER (WHERE lower(trim(fc.sentiment::text)) = 'negative')   AS negative_count,
                    COUNT(*) FILTER (WHERE lower(trim(fc.sentiment::text)) NOT IN ('positive','negative')) AS neutral_count
                FROM filtered_comments fc
                GROUP BY DATE(fc.created_time)
                ORDER BY DATE(fc.created_time)
            ) t
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
                    a.id::text as ad_id,
                    a.name as ad_name,
                    COUNT(c.id) AS comment_count
                FROM ads a
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                JOIN brands b ON aa.brand_id = b.id
                JOIN comments c ON a.id = c.ad_id
                WHERE
                    (brand_id_param IS NULL OR b.id = brand_id_param)
                    AND (start_date_ts IS NULL OR c.created_time::timestamp with time zone >= start_date_ts)
                    AND (end_date_ts IS NULL OR c.created_time::timestamp with time zone <= end_date_ts)
                    AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                    AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                    AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
                GROUP BY a.id, a.name
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
                    FROM ads a
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    JOIN brands b ON aa.brand_id = b.id
                    WHERE b.id = brand_id_param
                      AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                      AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
                      AND (
                        a.angle IS NULL
                        OR lower(trim(a.angle)) = ''
                        OR lower(trim(a.angle)) = 'unknown'
                      )
                ),
                'untracked_comments_count', (
                    SELECT COUNT(*)
                    FROM comments c
                    JOIN ads a ON c.ad_id = a.id
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    JOIN brands b ON aa.brand_id = b.id
                    WHERE b.id = brand_id_param
                      AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                      AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
                      AND (
                        c.sentiment IS NULL
                        OR lower(trim(c.sentiment::text)) = ''
                        OR lower(trim(c.sentiment::text)) = 'unknown'
                      )
                ),
                'untracked_ad_ids', (
                    SELECT json_agg(a.id::text)
                    FROM ads a
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    JOIN brands b ON aa.brand_id = b.id
                    WHERE b.id = brand_id_param
                      AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                      AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
                      AND (
                        a.angle IS NULL
                        OR lower(trim(a.angle)) = ''
                        OR lower(trim(a.angle)) = 'unknown'
                      )
                ),
                'untracked_comment_ids', (
                    SELECT json_agg(c.comment_id)
                    FROM comments c
                    JOIN ads a ON c.ad_id = a.id
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    JOIN brands b ON aa.brand_id = b.id
                    WHERE b.id = brand_id_param
                      AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                      AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
                      AND (
                        c.sentiment IS NULL
                        OR lower(trim(c.sentiment::text)) = ''
                        OR lower(trim(c.sentiment::text)) = 'unknown'
                      )
                )
            )
        ),
        'ads', (
            SELECT json_agg(
                json_build_object(
                    'id', a.id,
                    'created_at', a.created_at,
                    'ad_name', a.name,              -- Use correct column name
                    'ad_text', a.body_text,         -- Use correct column name  
                    'ad_title', a.title,            -- Use correct column name
                    'image_url', a.image_url,       -- Correct
                    'video_url', a.video_url,       -- Correct
                    'post_link', a.permalink_url,   -- Map to correct column name
                    'ad_id', a.id::text,
                    'Angel', a.angle,
                    'Angel Type', a.angle_type,
                    'Explanation', a.analysis_explanation,
                    'brand_id', b.id,
                    'funnel', a.funnel,
                    'total_comments', (
                        SELECT COUNT(*)
                        FROM comments c
                        WHERE c.ad_id = a.id
                    )
                )
            )
            FROM ads a
            JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
            JOIN campaigns camp ON ads_set.campaign_id = camp.id
            JOIN ad_account aa ON camp.account_id = aa.id
            JOIN brands b ON aa.brand_id = b.id
            WHERE (brand_id_param IS NULL OR b.id = brand_id_param)
              AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
              AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
        ),
        'comments', (
            SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'comment_id', c.comment_id,
                    'message', c.message,
                    'created_time', c.created_time,
                    'ad_id', c.ad_id::text,
                    'created_at', c.created_at,
                    'theme', c.theme,
                    'sentiment', c.sentiment,
                    'brand', c.brand,
                    'ad_title', a.title,            -- Use correct column name
                    'Angel Type', a.angle_type,
                    'meta_cluster', cc.meta_cluster,
                    'funnel', a.funnel
                )
            )
            FROM comments c
            JOIN ads a ON c.ad_id = a.id
            JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
            JOIN campaigns camp ON ads_set.campaign_id = camp.id
            JOIN ad_account aa ON camp.account_id = aa.id
            JOIN brands b ON aa.brand_id = b.id
            LEFT JOIN comment_cluster cc ON c.comment_id = cc.comment_id
            WHERE (brand_id_param IS NULL OR b.id = brand_id_param)
              AND (start_date_ts IS NULL OR c.created_time::timestamp with time zone >= start_date_ts)
              AND (end_date_ts IS NULL OR c.created_time::timestamp with time zone <= end_date_ts)
              AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
              AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
              AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
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

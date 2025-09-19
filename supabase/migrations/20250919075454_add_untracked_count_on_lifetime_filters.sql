CREATE OR REPLACE FUNCTION get_dashboard_data(
    brand_id_param INTEGER DEFAULT NULL,
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    sentiment_param TEXT DEFAULT NULL,
    funnel_param TEXT DEFAULT NULL,
    angel_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    start_date_ts timestamp with time zone;
    end_date_ts timestamp with time zone;
    has_date_filter BOOLEAN;
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
    
    -- Check if we have date filters
    has_date_filter := (start_date_ts IS NOT NULL OR end_date_ts IS NOT NULL);

    -- For lifetime queries without other filters, use optimized approach but still calculate untracked counts
    IF NOT has_date_filter AND 
       (sentiment_param IS NULL OR sentiment_param = 'all') AND 
       (funnel_param IS NULL OR funnel_param = 'all') AND 
       (angel_param IS NULL OR angel_param = 'all') THEN
       
        -- Optimized counts for lifetime view with monthly aggregation for graph
        SELECT json_build_object(
            'daily_sentiment_counts', COALESCE((
                SELECT json_agg(t)
                FROM (
                    -- For lifetime, aggregate by month instead of day to reduce data points
                    SELECT
                        TO_CHAR(DATE_TRUNC('month', c.created_time), 'YYYY-MM-DD')::TEXT AS created_date,
                        COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'positive') AS positive_count,
                        COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'negative') AS negative_count,
                        COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) NOT IN ('positive','negative')) AS neutral_count
                    FROM comments c
                    JOIN ads a ON c.ad_id = a.id
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                        AND c.created_time IS NOT NULL
                    GROUP BY DATE_TRUNC('month', c.created_time)
                    ORDER BY DATE_TRUNC('month', c.created_time)
                    LIMIT 120  -- Limit to 10 years of monthly data
                ) t
            ), '[]'::json),
            'total_sentiment_counts', (
                SELECT json_build_object(
                    'positive', COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'positive'),
                    'negative', COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'negative'),
                    'neutral', COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) NOT IN ('positive','negative'))
                )
                FROM comments c
                JOIN ads a ON c.ad_id = a.id
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
            ),
            'theme_distribution', '[]'::json,
            'top_performing_ads', '[]'::json,
            'key_metrics', (
                SELECT json_build_object(
                    'total_comments', (
                        SELECT COUNT(*)
                        FROM comments c
                        JOIN ads a ON c.ad_id = a.id
                        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                        JOIN campaigns camp ON ads_set.campaign_id = camp.id
                        JOIN ad_account aa ON camp.account_id = aa.id
                        WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    ),
                    'total_ads', (
                        SELECT COUNT(DISTINCT a.id)
                        FROM ads a
                        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                        JOIN campaigns camp ON ads_set.campaign_id = camp.id
                        JOIN ad_account aa ON camp.account_id = aa.id
                        WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    )
                )
            ),
            'untracked_info', json_build_object(
                'untracked_ads_count', COALESCE((
                    SELECT COUNT(*)
                    FROM ads a
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    WHERE aa.brand_id = brand_id_param
                      AND (
                        a.angle IS NULL
                        OR lower(trim(a.angle)) = ''
                        OR lower(trim(a.angle)) = 'unknown'
                      )
                ), 0),
                'untracked_comments_count', COALESCE((
                    SELECT COUNT(*)
                    FROM comments c
                    JOIN ads a ON c.ad_id = a.id
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    WHERE aa.brand_id = brand_id_param
                      AND (
                        c.sentiment IS NULL
                        OR lower(trim(c.sentiment::text)) = ''
                        OR lower(trim(c.sentiment::text)) = 'unknown'
                      )
                ), 0),
                'untracked_ad_ids', COALESCE((
                    SELECT json_agg(a.id::text)
                    FROM ads a
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    WHERE aa.brand_id = brand_id_param
                      AND (
                        a.angle IS NULL
                        OR lower(trim(a.angle)) = ''
                        OR lower(trim(a.angle)) = 'unknown'
                      )
                    LIMIT 1000
                ), '[]'::json),
                'untracked_comment_ids', COALESCE((
                    SELECT json_agg(c.comment_id)
                    FROM comments c
                    JOIN ads a ON c.ad_id = a.id
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    WHERE aa.brand_id = brand_id_param
                      AND (
                        c.sentiment IS NULL
                        OR lower(trim(c.sentiment::text)) = ''
                        OR lower(trim(c.sentiment::text)) = 'unknown'
                      )
                    LIMIT 1000
                ), '[]'::json)
            ),
            'campaigns', '[]'::json,
            'ad_sets', '[]'::json,
            'ads', '[]'::json,
            'comments', '[]'::json,
            'brand_status', (
                SELECT json_build_object(
                    'is_ad_analyzing', COALESCE(b.is_ad_analyzing, false),
                    'is_comment_analyzing', COALESCE(b.is_comment_analyzing, false)
                )
                FROM brands b
                WHERE b.id = brand_id_param
            )
        ) INTO result;
        
        RETURN result;
    END IF;

    -- Original logic for filtered queries (including date-ranged queries)
    WITH filtered_ads AS (
        SELECT DISTINCT a.*
        FROM ads a
        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
        JOIN campaigns camp ON ads_set.campaign_id = camp.id
        JOIN ad_account aa ON camp.account_id = aa.id
        WHERE
            (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
            AND (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
            AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
            AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
            AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
    ),
    
    filtered_campaigns AS (
        SELECT DISTINCT camp.*
        FROM campaigns camp
        WHERE camp.id IN (
            SELECT DISTINCT ads_set.campaign_id
            FROM filtered_ads fa
            JOIN ad_sets ads_set ON fa.ad_set_id = ads_set.id
        )
    ),
    
    filtered_ad_sets AS (
        SELECT DISTINCT ads_set.*
        FROM ad_sets ads_set
        WHERE ads_set.id IN (
            SELECT DISTINCT ad_set_id FROM filtered_ads
        )
    ),
    
    filtered_comments AS (
        SELECT c.*
        FROM comments c
        WHERE c.ad_id IN (SELECT id FROM filtered_ads)
            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
    ),
    
    comment_metrics AS (
        SELECT
            COUNT(*) as total_comments,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive') as positive_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative') as negative_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative')) as neutral_count
        FROM filtered_comments
    ),
    
    daily_sentiments AS (
        SELECT
            DATE(created_time)::TEXT AS created_date,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive') AS positive_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative') AS negative_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative')) AS neutral_count
        FROM filtered_comments
        WHERE created_time IS NOT NULL
        GROUP BY DATE(created_time)
        ORDER BY DATE(created_time)
        LIMIT 365  -- Limit daily data to avoid memory issues
    ),
    
    top_ads AS (
        SELECT
            fa.id::text as ad_id,
            fa.name as ad_name,
            COUNT(fc.id) AS comment_count
        FROM filtered_ads fa
        LEFT JOIN filtered_comments fc ON fa.id = fc.ad_id
        GROUP BY fa.id, fa.name
        ORDER BY comment_count DESC
        LIMIT 10
    )
    
    SELECT json_build_object(
        'daily_sentiment_counts', COALESCE((SELECT json_agg(t) FROM daily_sentiments t), '[]'::json),
        'total_sentiment_counts', (
            SELECT json_build_object(
                'positive', COALESCE(positive_count, 0),
                'negative', COALESCE(negative_count, 0),
                'neutral', COALESCE(neutral_count, 0)
            )
            FROM comment_metrics
        ),
        'theme_distribution', COALESCE((
            SELECT json_agg(t)
            FROM (
                SELECT theme AS name, COUNT(*) AS count
                FROM filtered_comments
                WHERE theme IS NOT NULL
                GROUP BY theme
                ORDER BY count DESC
                LIMIT 20
            ) t
        ), '[]'::json),
        'top_performing_ads', COALESCE((SELECT json_agg(t) FROM top_ads t), '[]'::json),
        'key_metrics', (
            SELECT json_build_object(
                'total_comments', COALESCE((SELECT total_comments FROM comment_metrics), 0),
                'total_ads', COALESCE((SELECT COUNT(*) FROM filtered_ads), 0)
            )
        ),
        'untracked_info', json_build_object(
            'untracked_ads_count', COALESCE((
                SELECT COUNT(*) FROM filtered_ads
                WHERE angle IS NULL OR lower(trim(angle)) = '' OR lower(trim(angle)) = 'unknown'
            ), 0),
            'untracked_comments_count', COALESCE((
                SELECT COUNT(*) FROM filtered_comments
                WHERE sentiment IS NULL OR lower(trim(sentiment::text)) = '' OR lower(trim(sentiment::text)) = 'unknown'
            ), 0),
            'untracked_ad_ids', COALESCE((
                SELECT json_agg(id::text)
                FROM filtered_ads
                WHERE angle IS NULL OR lower(trim(angle)) = '' OR lower(trim(angle)) = 'unknown'
                LIMIT 100
            ), '[]'::json),
            'untracked_comment_ids', COALESCE((
                SELECT json_agg(comment_id)
                FROM filtered_comments
                WHERE sentiment IS NULL OR lower(trim(sentiment::text)) = '' OR lower(trim(sentiment::text)) = 'unknown'
                LIMIT 100
            ), '[]'::json)
        ),
        'campaigns', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'campaign_id', fc.id::text,
                    'campaign_name', fc.name,
                    'status', fc.status,
                    'objective', fc.objective,
                    'start_time', fc.start_time,
                    'created_at', fc.created_at,
                    'updated_at', fc.updated_at,
                    'account_id', fc.account_id::text,
                    'topline_id', fc.topline_id
                )
            )
            FROM filtered_campaigns fc
            LIMIT 100
        ), '[]'::json),
        'ad_sets', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'ad_set_id', fas.id::text,
                    'ad_set_name', fas.name,
                    'campaign_id', fas.campaign_id::text,
                    'campaign_name', (SELECT name FROM filtered_campaigns WHERE id = fas.campaign_id LIMIT 1),
                    'status', fas.status,
                    'effective_status', fas.effective_status,
                    'optimization_goal', fas.optimization_goal,
                    'bid_strategy', fas.bid_strategy,
                    'daily_budget', fas.daily_budget,
                    'lifetime_budget', fas.lifetime_budget,
                    'budget_remaining', fas.budget_remaining,
                    'start_time', fas.start_time,
                    'end_time', fas.end_time,
                    'created_time', fas.created_time,
                    'lifetime_imps', fas.lifetime_imps,
                    'destination_type', fas.destination_type
                )
            )
            FROM filtered_ad_sets fas
            LIMIT 500
        ), '[]'::json),
        'ads', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', fa.id,
                    'created_at', fa.source_created_time,
                    'ad_name', fa.name,
                    'ad_text', fa.body_text,
                    'ad_title', fa.title,
                    'image_url', fa.image_url,
                    'video_url', fa.video_url,
                    'post_link', fa.permalink_url,
                    'ad_id', fa.id::text,
                    'ad_set_id', fa.ad_set_id::text,
                    'campaign_id', (SELECT campaign_id::text FROM filtered_ad_sets WHERE id = fa.ad_set_id LIMIT 1),
                    'Angel', fa.angle,
                    'Angel Type', fa.angle_type,
                    'angle_type', fa.angle_type,
                    'Explanation', fa.analysis_explanation,
                    'brand_id', (SELECT brand_id FROM ad_account WHERE id = fa.ad_account_id LIMIT 1),
                    'funnel', fa.funnel,
                    'total_comments', (
                        SELECT COUNT(*)
                        FROM comments c
                        WHERE c.ad_id = fa.id
                    )
                )
            )
            FROM filtered_ads fa
            LIMIT 1000
        ), '[]'::json),
        'comments', COALESCE((
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
                    'ad_title', (SELECT title FROM filtered_ads WHERE id = fc.ad_id LIMIT 1),
                    'Angel Type', (SELECT angle_type FROM filtered_ads WHERE id = fc.ad_id LIMIT 1),
                    'meta_cluster', (SELECT meta_cluster FROM comment_cluster WHERE comment_id = fc.comment_id LIMIT 1),
                    'funnel', (SELECT funnel FROM filtered_ads WHERE id = fc.ad_id LIMIT 1)
                )
            )
            FROM filtered_comments fc
            LIMIT 5000
        ), '[]'::json),
        'brand_status', (
            SELECT json_build_object(
                'is_ad_analyzing', COALESCE(b.is_ad_analyzing, false),
                'is_comment_analyzing', COALESCE(b.is_comment_analyzing, false)
            )
            FROM brands b
            WHERE b.id = brand_id_param
        )
    ) INTO result;

    RETURN result;
END;
$$;
-- Create a paginated version of get_dashboard_data for better performance
-- This function will return data in chunks to avoid timeouts

CREATE OR REPLACE FUNCTION get_dashboard_data_paginated(
    brand_id_param INTEGER DEFAULT NULL,
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    sentiment_param TEXT DEFAULT NULL,
    funnel_param TEXT DEFAULT NULL,
    angel_param TEXT DEFAULT NULL,
    return_full_data BOOLEAN DEFAULT FALSE,
    page_number INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    start_date_ts timestamp with time zone;
    end_date_ts timestamp with time zone;
    has_date_filter BOOLEAN;
    offset_val INTEGER;
    total_ads_count INTEGER;
    total_comments_count INTEGER;
    total_campaigns_count INTEGER;
    total_ad_sets_count INTEGER;
BEGIN
    -- Set a longer timeout for this function (30 seconds instead of default)
    SET LOCAL statement_timeout = '30s';
    
    -- Calculate offset
    offset_val := (page_number - 1) * page_size;
    
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

    -- Create temporary tables for better performance
    CREATE TEMP TABLE IF NOT EXISTS temp_filtered_ads AS
    SELECT DISTINCT a.*
    FROM ads a
    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
    JOIN campaigns camp ON ads_set.campaign_id = camp.id
    JOIN ad_account aa ON camp.account_id = aa.id
    WHERE
        (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
        AND (NOT has_date_filter OR (
            (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
            AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
        ))
        AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
        AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param);
    
    -- Get total counts
    SELECT COUNT(*) INTO total_ads_count FROM temp_filtered_ads;
    
    -- Build the result based on whether we need full data
    IF return_full_data THEN
        -- Get counts for pagination info
        SELECT COUNT(DISTINCT camp.id) INTO total_campaigns_count
        FROM campaigns camp
        WHERE camp.id IN (
            SELECT DISTINCT ads_set.campaign_id
            FROM temp_filtered_ads fa
            JOIN ad_sets ads_set ON fa.ad_set_id = ads_set.id
        );
        
        SELECT COUNT(DISTINCT ads_set.id) INTO total_ad_sets_count
        FROM ad_sets ads_set
        WHERE ads_set.id IN (
            SELECT DISTINCT ad_set_id FROM temp_filtered_ads
        );
        
        SELECT COUNT(*) INTO total_comments_count
        FROM comments c
        WHERE c.ad_id IN (SELECT id FROM temp_filtered_ads)
            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param));
        
        -- Return paginated full data
        WITH filtered_campaigns AS (
            SELECT DISTINCT camp.*
            FROM campaigns camp
            WHERE camp.id IN (
                SELECT DISTINCT ads_set.campaign_id
                FROM temp_filtered_ads fa
                JOIN ad_sets ads_set ON fa.ad_set_id = ads_set.id
            )
            LIMIT page_size
        ),
        filtered_ad_sets AS (
            SELECT DISTINCT ads_set.*
            FROM ad_sets ads_set
            WHERE ads_set.id IN (
                SELECT DISTINCT ad_set_id FROM temp_filtered_ads
            )
            LIMIT page_size * 5  -- More ad sets than campaigns
        ),
        paginated_ads AS (
            SELECT * FROM temp_filtered_ads
            ORDER BY source_created_time DESC
            LIMIT page_size 
            OFFSET offset_val
        ),
        filtered_comments AS (
            SELECT c.*
            FROM comments c
            WHERE c.ad_id IN (SELECT id FROM paginated_ads)
                AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
            LIMIT page_size * 50  -- More comments than ads
        )
        SELECT json_build_object(
            'pagination', json_build_object(
                'page', page_number,
                'page_size', page_size,
                'total_ads', total_ads_count,
                'total_pages', CEIL(total_ads_count::float / page_size),
                'total_campaigns', total_campaigns_count,
                'total_ad_sets', total_ad_sets_count,
                'total_comments', total_comments_count
            ),
            'daily_sentiment_counts', '[]'::json,  -- Calculate separately if needed
            'total_sentiment_counts', (
                SELECT json_build_object(
                    'positive', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive'),
                    'negative', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative'),
                    'neutral', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative'))
                )
                FROM filtered_comments
            ),
            'funnel_distribution', COALESCE((
                SELECT json_agg(t)
                FROM (
                    SELECT 
                        funnel::text AS name, 
                        COUNT(*) AS count
                    FROM temp_filtered_ads
                    WHERE funnel IS NOT NULL
                    GROUP BY funnel
                    ORDER BY count DESC
                ) t
            ), '[]'::json),
            'key_metrics', json_build_object(
                'total_comments', total_comments_count,
                'total_ads', total_ads_count
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
            ), '[]'::json),
            'ad_sets', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'ad_set_id', fas.id::text,
                        'ad_set_name', fas.name,
                        'campaign_id', fas.campaign_id::text,
                        'status', fas.status,
                        'effective_status', fas.effective_status,
                        'optimization_goal', fas.optimization_goal,
                        'bid_strategy', fas.bid_strategy,
                        'daily_budget', fas.daily_budget,
                        'lifetime_budget', fas.lifetime_budget,
                        'budget_remaining', fas.budget_remaining,
                        'start_time', fas.start_time,
                        'end_time', fas.end_time,
                        'created_time', fas.created_time
                    )
                )
                FROM filtered_ad_sets fas
            ), '[]'::json),
            'ads', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id', pa.id,
                        'created_at', pa.source_created_time,
                        'ad_name', pa.name,
                        'ad_text', pa.body_text,
                        'ad_title', pa.title,
                        'image_url', pa.image_url,
                        'video_url', pa.video_url,
                        'post_link', pa.permalink_url,
                        'ad_id', pa.id::text,
                        'ad_set_id', pa.ad_set_id::text,
                        'Angel', pa.angle,
                        'Angel Type', pa.angle_type,
                        'angle_type', pa.angle_type,
                        'Explanation', pa.analysis_explanation,
                        'funnel', pa.funnel,
                        'total_comments', (
                            SELECT COUNT(*)
                            FROM comments c
                            WHERE c.ad_id = pa.id
                        )
                    )
                )
                FROM paginated_ads pa
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
                        'brand', fc.brand
                    )
                )
                FROM filtered_comments fc
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
    ELSE
        -- Return aggregated data only (for dashboard)
        -- This is much faster as it doesn't retrieve individual records
        SELECT json_build_object(
            'pagination', json_build_object(
                'page', 1,
                'page_size', 0,
                'total_ads', total_ads_count,
                'total_pages', 1
            ),
            'daily_sentiment_counts', COALESCE((
                SELECT json_agg(t)
                FROM (
                    SELECT
                        DATE(c.created_time)::TEXT AS created_date,
                        COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'positive') AS positive_count,
                        COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'negative') AS negative_count,
                        COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) NOT IN ('positive','negative')) AS neutral_count
                    FROM comments c
                    WHERE c.ad_id IN (SELECT id FROM temp_filtered_ads)
                        AND c.created_time IS NOT NULL
                        AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                    GROUP BY DATE(c.created_time)
                    ORDER BY DATE(c.created_time)
                    LIMIT 365
                ) t
            ), '[]'::json),
            'total_sentiment_counts', (
                SELECT json_build_object(
                    'positive', COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'positive'),
                    'negative', COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'negative'),
                    'neutral', COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) NOT IN ('positive','negative'))
                )
                FROM comments c
                WHERE c.ad_id IN (SELECT id FROM temp_filtered_ads)
                    AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
            ),
            'funnel_distribution', COALESCE((
                SELECT json_agg(t)
                FROM (
                    SELECT 
                        funnel::text AS name, 
                        COUNT(*) AS count
                    FROM temp_filtered_ads
                    WHERE funnel IS NOT NULL
                    GROUP BY funnel
                    ORDER BY count DESC
                ) t
            ), '[]'::json),
            'theme_distribution', '[]'::json,
            'top_performing_ads', COALESCE((
                SELECT json_agg(t)
                FROM (
                    SELECT
                        fa.id::text as ad_id,
                        fa.name as ad_name,
                        COUNT(c.id) AS comment_count
                    FROM temp_filtered_ads fa
                    LEFT JOIN comments c ON fa.id = c.ad_id
                    GROUP BY fa.id, fa.name
                    ORDER BY comment_count DESC
                    LIMIT 10
                ) t
            ), '[]'::json),
            'key_metrics', json_build_object(
                'total_comments', (
                    SELECT COUNT(*)
                    FROM comments c
                    WHERE c.ad_id IN (SELECT id FROM temp_filtered_ads)
                ),
                'total_ads', total_ads_count
            ),
            'untracked_info', json_build_object(
                'untracked_ads_count', (
                    SELECT COUNT(*) FROM temp_filtered_ads
                    WHERE angle IS NULL OR lower(trim(angle)) = '' OR lower(trim(angle)) = 'unknown'
                ),
                'untracked_comments_count', 0,
                'untracked_ad_ids', '[]'::json,
                'untracked_comment_ids', '[]'::json
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
    END IF;
    
    -- Clean up temp table
    DROP TABLE IF EXISTS temp_filtered_ads;
    
    RETURN result;
END;
$$;
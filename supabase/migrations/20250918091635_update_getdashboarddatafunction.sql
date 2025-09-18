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

    -- STEP 1: Get filtered ads (SINGLE SOURCE OF TRUTH for date filtering)
    WITH filtered_ads AS (
        SELECT DISTINCT a.*
        FROM ads a
        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
        JOIN campaigns camp ON ads_set.campaign_id = camp.id
        JOIN ad_account aa ON camp.account_id = aa.id
        WHERE
            (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
            -- DATE FILTER USES source_created_time (Facebook creation date)
            AND (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
            AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
            AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
            AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type::text = angel_param)
    ),
    
    -- STEP 2: Get campaigns from filtered ads
    filtered_campaigns AS (
        SELECT DISTINCT camp.*
        FROM campaigns camp
        WHERE camp.id IN (
            SELECT DISTINCT ads_set.campaign_id
            FROM filtered_ads fa
            JOIN ad_sets ads_set ON fa.ad_set_id = ads_set.id
        )
    ),
    
    -- STEP 3: Get ad sets from filtered ads
    filtered_ad_sets AS (
        SELECT DISTINCT ads_set.*
        FROM ad_sets ads_set
        WHERE ads_set.id IN (
            SELECT DISTINCT ad_set_id FROM filtered_ads
        )
    ),
    
    -- STEP 4: Get ALL comments from filtered ads (no date filter on comments)
    filtered_comments AS (
        SELECT c.*
        FROM comments c
        WHERE c.ad_id IN (SELECT id FROM filtered_ads)
            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
    ),
    
    -- STEP 5: Calculate comment metrics
    comment_metrics AS (
        SELECT
            COUNT(*) as total_comments,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive') as positive_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative') as negative_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative')) as neutral_count
        FROM filtered_comments
    ),
    
    -- STEP 6: Calculate daily sentiment counts
    daily_sentiments AS (
        SELECT
            DATE(created_time)::TEXT AS created_date,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive') AS positive_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative') AS negative_count,
            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative')) AS neutral_count
        FROM filtered_comments
        GROUP BY DATE(created_time)
        ORDER BY DATE(created_time)
    ),
    
    -- STEP 7: Get top performing ads by comment count
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
    ),
    
    -- STEP 8: Calculate untracked info (from filtered ads only)
    untracked_ads AS (
        SELECT 
            COUNT(*) as count,
            json_agg(id::text) as ids
        FROM filtered_ads
        WHERE angle IS NULL OR lower(trim(angle)) = '' OR lower(trim(angle)) = 'unknown'
    ),
    
    untracked_comments AS (
        SELECT 
            COUNT(*) as count,
            json_agg(comment_id) as ids
        FROM filtered_comments
        WHERE sentiment IS NULL OR lower(trim(sentiment::text)) = '' OR lower(trim(sentiment::text)) = 'unknown'
    )
    
    -- Build the final result
    SELECT json_build_object(
        'daily_sentiment_counts', (
            SELECT json_agg(t) FROM daily_sentiments t
        ),
        'total_sentiment_counts', (
            SELECT json_build_object(
                'positive', positive_count,
                'negative', negative_count,
                'neutral', neutral_count
            )
            FROM comment_metrics
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
            SELECT json_agg(t) FROM top_ads t
        ),
        'key_metrics', (
            SELECT json_build_object(
                'total_comments', total_comments,
                'total_ads', (SELECT COUNT(*) FROM filtered_ads)
            )
            FROM comment_metrics
        ),
        'untracked_info', (
            SELECT json_build_object(
                'untracked_ads_count', (SELECT count FROM untracked_ads),
                'untracked_comments_count', (SELECT count FROM untracked_comments),
                'untracked_ad_ids', (SELECT ids FROM untracked_ads),
                'untracked_comment_ids', (SELECT ids FROM untracked_comments)
            )
        ),
        'campaigns', (
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
        ),
        'ad_sets', (
            SELECT json_agg(
                json_build_object(
                    'ad_set_id', fas.id::text,
                    'ad_set_name', fas.name,
                    'campaign_id', fas.campaign_id::text,
                    'campaign_name', (SELECT name FROM filtered_campaigns WHERE id = fas.campaign_id),
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
        ),
        'ads', (
            SELECT json_agg(
                json_build_object(
                    'id', fa.id,
                    'created_at', fa.source_created_time,  -- Changed to use source_created_time for consistency
                    'ad_name', fa.name,
                    'ad_text', fa.body_text,
                    'ad_title', fa.title,
                    'image_url', fa.image_url,
                    'video_url', fa.video_url,
                    'post_link', fa.permalink_url,
                    'ad_id', fa.id::text,
                    'ad_set_id', fa.ad_set_id::text,
                    'campaign_id', (SELECT campaign_id::text FROM filtered_ad_sets WHERE id = fa.ad_set_id),
                    'Angel', fa.angle,
                    'Angel Type', fa.angle_type,
                    'angle_type', fa.angle_type,
                    'Explanation', fa.analysis_explanation,
                    'brand_id', (SELECT brand_id FROM ad_account WHERE id = fa.ad_account_id),
                    'funnel', fa.funnel,
                    'total_comments', (
                        SELECT COUNT(*)
                        FROM comments c
                        WHERE c.ad_id = fa.id
                    )
                )
            )
            FROM filtered_ads fa
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
                    'ad_title', (SELECT title FROM filtered_ads WHERE id = fc.ad_id),
                    'Angel Type', (SELECT angle_type FROM filtered_ads WHERE id = fc.ad_id),
                    'meta_cluster', (SELECT meta_cluster FROM comment_cluster WHERE comment_id = fc.comment_id LIMIT 1),
                    'funnel', (SELECT funnel FROM filtered_ads WHERE id = fc.ad_id)
                )
            )
            FROM filtered_comments fc
        ),
        'brand_status', (
            SELECT json_build_object(
                'is_ad_analyzing', b.is_ad_analyzing,
                'is_comment_analyzing', b.is_comment_analyzing
            )
            FROM brands b
            WHERE b.id = brand_id_param
        )
    ) INTO result;

    RETURN result;
END;
$$;
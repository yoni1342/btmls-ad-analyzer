-- Fix get_brands_overview_data function to return actual untracked ad and comment IDs
-- This enables the webhook buttons to work correctly by providing the actual IDs

CREATE OR REPLACE FUNCTION get_brands_overview_data(
    brand_id_param INTEGER DEFAULT NULL,
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    sentiment_param TEXT DEFAULT NULL,
    funnel_param TEXT DEFAULT NULL,
    angel_param TEXT DEFAULT NULL,
    campaign_status_param TEXT DEFAULT NULL,
    campaign_objective_param TEXT DEFAULT NULL,
    adset_status_param TEXT DEFAULT NULL,
    adset_optimization_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    start_date_ts timestamp with time zone;
    end_date_ts timestamp with time zone;
    is_lifetime_query BOOLEAN;
BEGIN
    -- Set local statement timeout
    PERFORM set_config('statement_timeout', '120000', true); -- 2 minutes should be enough for aggregates
    
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

    -- Check if this is a lifetime query (no date filters)
    is_lifetime_query := (start_date_ts IS NULL AND end_date_ts IS NULL);

    -- Build the response with ONLY aggregated data (no individual records)
    SELECT json_build_object(
        -- Sentiment chart data (separate queries for lifetime vs date-filtered)
        'daily_sentiment_counts', CASE
            WHEN is_lifetime_query THEN
                -- Monthly aggregation for lifetime queries
                COALESCE((
                    SELECT json_agg(t)
                    FROM (
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
                            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                            AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                            AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                            AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                            AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                            AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                            AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                            AND c.created_time IS NOT NULL
                        GROUP BY DATE_TRUNC('month', c.created_time)
                        ORDER BY DATE_TRUNC('month', c.created_time)
                        LIMIT 120
                    ) t
                ), '[]'::json)
            ELSE
                -- Daily aggregation for date-filtered queries
                COALESCE((
                    SELECT json_agg(t)
                    FROM (
                        SELECT
                            DATE(c.created_time)::TEXT AS created_date,
                            COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'positive') AS positive_count,
                            COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) = 'negative') AS negative_count,
                            COUNT(*) FILTER (WHERE lower(trim(c.sentiment::text)) NOT IN ('positive','negative')) AS neutral_count
                        FROM comments c
                        JOIN ads a ON c.ad_id = a.id
                        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                        JOIN campaigns camp ON ads_set.campaign_id = camp.id
                        JOIN ad_account aa ON camp.account_id = aa.id
                        WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                            AND (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                            AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                            AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                            AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                            AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                            AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                            AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                            AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                            AND c.created_time IS NOT NULL
                        GROUP BY DATE(c.created_time)
                        ORDER BY DATE(c.created_time)
                        LIMIT 365
                    ) t
                ), '[]'::json)
            END,
        
        -- Total sentiment counts
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
                AND (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
        ),
        
        -- Theme distribution (top 20 only)
        'theme_distribution', COALESCE((
            SELECT json_agg(t)
            FROM (
                SELECT theme AS name, COUNT(*) AS count
                FROM comments c
                JOIN ads a ON c.ad_id = a.id
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    AND (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                    AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                    AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                    AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                    AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                    AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                    AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                    AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                    AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                    AND c.theme IS NOT NULL
                GROUP BY c.theme
                ORDER BY count DESC
                LIMIT 20
            ) t
        ), '[]'::json),
        
        -- Funnel distribution
        'funnel_distribution', COALESCE((
            SELECT json_agg(t)
            FROM (
                SELECT 
                    COALESCE(a.funnel::text, 'Unprocessed') AS name, 
                    COUNT(DISTINCT a.id) AS count
                FROM ads a
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    AND (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
                    AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
                    AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                    AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                    AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                    AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                    AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                    AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                GROUP BY COALESCE(a.funnel::text, 'Unprocessed')
                ORDER BY 
                    CASE COALESCE(a.funnel::text, 'Unprocessed')
                        WHEN 'TOF' THEN 1
                        WHEN 'MOF' THEN 2
                        WHEN 'BOF' THEN 3
                        WHEN 'Unprocessed' THEN 4
                        ELSE 5
                    END
            ) t
        ), '[]'::json),
        
        -- Top performing ads (by comment count, top 10 only)
        'top_performing_ads', COALESCE((
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
                LEFT JOIN comments c ON a.id = c.ad_id
                    AND (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                    AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                    AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    AND (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
                    AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
                    AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                    AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                    AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                    AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                    AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                    AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                GROUP BY a.id, a.name
                ORDER BY comment_count DESC
                LIMIT 10
            ) t
        ), '[]'::json),
        
        -- Key metrics (total counts only)
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
                        AND (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                        AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                        AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                        AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                        AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                        AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                        AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                        AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                        AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                ),
                'total_ads', (
                    SELECT COUNT(DISTINCT a.id)
                    FROM ads a
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                        AND (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
                        AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
                        AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                        AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                        AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                        AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                        AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                        AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                ),
                'total_campaigns', (
                    SELECT COUNT(DISTINCT camp.id)
                    FROM campaigns camp
                    JOIN ad_account aa ON camp.account_id = aa.id
                    WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                        AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                        AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                ),
                'total_ad_sets', (
                    SELECT COUNT(DISTINCT ads_set.id)
                    FROM ad_sets ads_set
                    JOIN campaigns camp ON ads_set.campaign_id = camp.id
                    JOIN ad_account aa ON camp.account_id = aa.id
                    WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                        AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                        AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                        AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                        AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                )
            )
        ),
        
        -- Untracked info (counts AND actual IDs for webhook functionality)
        'untracked_info', json_build_object(
            'untracked_ads_count', COALESCE((
                SELECT COUNT(*)
                FROM ads a
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    AND (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
                    AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
                    AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                    AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                    AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                    AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                    AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                    AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                    AND (a.angle IS NULL OR lower(trim(a.angle)) = '' OR lower(trim(a.angle)) = 'unknown')
            ), 0),
            'untracked_comments_count', COALESCE((
                SELECT COUNT(*)
                FROM comments c
                JOIN ads a ON c.ad_id = a.id
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    AND (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                    AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                    AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                    AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                    AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                    AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                    AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                    AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                    AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                    AND (c.sentiment IS NULL OR lower(trim(c.sentiment::text)) = '' OR lower(trim(c.sentiment::text)) = 'unknown')
            ), 0),
            -- FIXED: Return actual IDs arrays for webhook functionality
            'untracked_ad_ids', COALESCE((
                SELECT json_agg(a.id::text)
                FROM ads a
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    AND (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
                    AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
                    AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                    AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                    AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                    AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                    AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                    AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                    AND (a.angle IS NULL OR lower(trim(a.angle)) = '' OR lower(trim(a.angle)) = 'unknown')
            ), '[]'::json),
            'untracked_comment_ids', COALESCE((
                SELECT json_agg(c.id::text)
                FROM comments c
                JOIN ads a ON c.ad_id = a.id
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                    AND (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                    AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                    AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                    AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                    AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                    AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                    AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                    AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                    AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                    AND (c.sentiment IS NULL OR lower(trim(c.sentiment::text)) = '' OR lower(trim(c.sentiment::text)) = 'unknown')
            ), '[]'::json)
        ),
        
        -- Brand status
        'brand_status', (
            SELECT json_build_object(
                'is_ad_analyzing', COALESCE(b.is_ad_analyzing, false),
                'is_comment_analyzing', COALESCE(b.is_comment_analyzing, false)
            )
            FROM brands b
            WHERE b.id = brand_id_param
        ),
        
        -- Empty arrays for individual records (overview doesn't need them)
        'campaigns', '[]'::json,
        'ad_sets', '[]'::json,
        'ads', '[]'::json,
        'comments', '[]'::json
    ) INTO result;

    RETURN result;
END;
$$;
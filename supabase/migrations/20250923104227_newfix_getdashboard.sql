-- Migration to fix GROUP BY error in get_dashboard_data function
DROP FUNCTION IF EXISTS get_dashboard_data(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION get_dashboard_data(
    brand_id_param INTEGER DEFAULT NULL,
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    sentiment_param TEXT DEFAULT NULL,
    funnel_param TEXT DEFAULT NULL,
    angel_param TEXT DEFAULT NULL,
    campaign_status_param TEXT DEFAULT NULL,
    campaign_objective_param TEXT DEFAULT NULL,
    adset_status_param TEXT DEFAULT NULL,
    adset_optimization_param TEXT DEFAULT NULL,
    return_full_data BOOLEAN DEFAULT FALSE
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
    -- Set local statement timeout for this function
    PERFORM set_config('statement_timeout', '300000', true); -- 5 minutes for this transaction
    
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

    -- For lifetime queries without other filters
    IF NOT has_date_filter AND 
       (sentiment_param IS NULL OR sentiment_param = 'all') AND 
       (funnel_param IS NULL OR funnel_param = 'all') AND 
       (angel_param IS NULL OR angel_param = 'all') AND
       (campaign_status_param IS NULL OR campaign_status_param = 'all') AND
       (campaign_objective_param IS NULL OR campaign_objective_param = 'all') AND
       (adset_status_param IS NULL OR adset_status_param = 'all') AND
       (adset_optimization_param IS NULL OR adset_optimization_param = 'all') THEN
       
        -- Need to handle both dashboard (aggregates only) and brands page (full data) cases
        IF return_full_data THEN
            -- Brands page needs full data even for lifetime queries
            WITH lifetime_ads AS MATERIALIZED (
                SELECT DISTINCT a.*
                FROM ads a
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
            ),
            
            lifetime_campaigns AS MATERIALIZED (
                SELECT DISTINCT camp.*
                FROM campaigns camp
                WHERE camp.id IN (
                    SELECT DISTINCT ads_set.campaign_id
                    FROM lifetime_ads la
                    JOIN ad_sets ads_set ON la.ad_set_id = ads_set.id
                )
            ),
            
            lifetime_ad_sets AS MATERIALIZED (
                SELECT DISTINCT ads_set.*
                FROM ad_sets ads_set
                WHERE ads_set.id IN (
                    SELECT DISTINCT ad_set_id FROM lifetime_ads
                )
            ),
            
            lifetime_comments AS MATERIALIZED (
                SELECT c.*
                FROM comments c
                WHERE c.ad_id IN (SELECT id FROM lifetime_ads)
            )
            
            SELECT json_build_object(
                'daily_sentiment_counts', COALESCE((
                    SELECT json_agg(t ORDER BY t.created_date)
                    FROM (
                        SELECT
                            TO_CHAR(DATE_TRUNC('month', created_time), 'YYYY-MM-DD')::TEXT AS created_date,
                            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive') AS positive_count,
                            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative') AS negative_count,
                            COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative')) AS neutral_count
                        FROM lifetime_comments
                        WHERE created_time IS NOT NULL
                        GROUP BY DATE_TRUNC('month', created_time)
                        LIMIT 120
                    ) t
                ), '[]'::json),
                'total_sentiment_counts', (
                    SELECT json_build_object(
                        'positive', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive'),
                        'negative', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative'),
                        'neutral', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative'))
                    )
                    FROM lifetime_comments
                ),
                'theme_distribution', COALESCE((
                    SELECT json_agg(t ORDER BY t.count DESC)
                    FROM (
                        SELECT theme AS name, COUNT(*) AS count
                        FROM lifetime_comments
                        WHERE theme IS NOT NULL
                        GROUP BY theme
                        LIMIT 20
                    ) t
                ), '[]'::json),
                'funnel_distribution', COALESCE((
                    SELECT json_agg(t ORDER BY 
                        CASE t.name
                            WHEN 'TOF' THEN 1
                            WHEN 'MOF' THEN 2
                            WHEN 'BOF' THEN 3
                            WHEN 'Unprocessed' THEN 4
                            ELSE 5
                        END
                    )
                    FROM (
                        SELECT 
                            COALESCE(funnel::text, 'Unprocessed') AS name, 
                            COUNT(*) AS count
                        FROM lifetime_ads
                        GROUP BY COALESCE(funnel::text, 'Unprocessed')
                    ) t
                ), '[]'::json),
                'top_performing_ads', COALESCE((
                    SELECT json_agg(t ORDER BY t.comment_count DESC)
                    FROM (
                        SELECT
                            la.id::text as ad_id,
                            la.name as ad_name,
                            COUNT(lc.id) AS comment_count
                        FROM lifetime_ads la
                        LEFT JOIN lifetime_comments lc ON la.id = lc.ad_id
                        GROUP BY la.id, la.name
                        LIMIT 10
                    ) t
                ), '[]'::json),
                'key_metrics', (
                    SELECT json_build_object(
                        'total_comments', (SELECT COUNT(*) FROM lifetime_comments),
                        'total_ads', (SELECT COUNT(*) FROM lifetime_ads)
                    )
                ),
                'untracked_info', json_build_object(
                    'untracked_ads_count', (
                        SELECT COUNT(*) FROM lifetime_ads
                        WHERE angle IS NULL OR lower(trim(angle)) = '' OR lower(trim(angle)) = 'unknown'
                    ),
                    'untracked_comments_count', (
                        SELECT COUNT(*) FROM lifetime_comments
                        WHERE sentiment IS NULL OR lower(trim(sentiment::text)) = '' OR lower(trim(sentiment::text)) = 'unknown'
                    ),
                    'untracked_ad_ids', COALESCE((
                        SELECT json_agg(id::text)
                        FROM (
                            SELECT id
                            FROM lifetime_ads
                            WHERE angle IS NULL OR lower(trim(angle)) = '' OR lower(trim(angle)) = 'unknown'
                            LIMIT 1000
                        ) sub
                    ), '[]'::json),
                    'untracked_comment_ids', COALESCE((
                        SELECT json_agg(comment_id)
                        FROM (
                            SELECT comment_id
                            FROM lifetime_comments
                            WHERE sentiment IS NULL OR lower(trim(sentiment::text)) = '' OR lower(trim(sentiment::text)) = 'unknown'
                            LIMIT 1000
                        ) sub
                    ), '[]'::json)
                ),
                'campaigns', COALESCE((
                    SELECT json_agg(campaign_obj ORDER BY created_at DESC)
                    FROM (
                        SELECT json_build_object(
                            'campaign_id', lc.id::text,
                            'campaign_name', lc.name,
                            'status', lc.status,
                            'objective', lc.objective,
                            'start_time', lc.start_time,
                            'created_at', lc.created_at,
                            'updated_at', lc.updated_at,
                            'account_id', lc.account_id::text,
                            'topline_id', lc.topline_id
                        ) AS campaign_obj,
                        lc.created_at
                        FROM lifetime_campaigns lc
                        LIMIT 100
                    ) sub
                ), '[]'::json),
                'ad_sets', COALESCE((
                    SELECT json_agg(adset_obj ORDER BY created_time DESC)
                    FROM (
                        SELECT json_build_object(
                            'ad_set_id', las.id::text,
                            'ad_set_name', las.name,
                            'campaign_id', las.campaign_id::text,
                            'campaign_name', (SELECT name FROM lifetime_campaigns WHERE id = las.campaign_id LIMIT 1),
                            'status', las.status,
                            'effective_status', las.effective_status,
                            'optimization_goal', las.optimization_goal,
                            'bid_strategy', las.bid_strategy,
                            'daily_budget', las.daily_budget,
                            'lifetime_budget', las.lifetime_budget,
                            'budget_remaining', las.budget_remaining,
                            'start_time', las.start_time,
                            'end_time', las.end_time,
                            'created_time', las.created_time,
                            'lifetime_imps', las.lifetime_imps,
                            'destination_type', las.destination_type
                        ) AS adset_obj,
                        las.created_time
                        FROM lifetime_ad_sets las
                        LIMIT 500
                    ) sub
                ), '[]'::json),
                'ads', COALESCE((
                    SELECT json_agg(ad_obj ORDER BY source_created_time DESC)
                    FROM (
                        SELECT json_build_object(
                            'id', la.id,
                            'created_at', la.source_created_time,
                            'ad_name', la.name,
                            'ad_text', la.body_text,
                            'ad_title', la.title,
                            'image_url', la.image_url,
                            'video_url', la.video_url,
                            'post_link', la.permalink_url,
                            'ad_id', la.id::text,
                            'ad_set_id', la.ad_set_id::text,
                            'campaign_id', (SELECT campaign_id::text FROM lifetime_ad_sets WHERE id = la.ad_set_id LIMIT 1),
                            'Angel', la.angle,
                            'Angel Type', la.angle_type,
                            'angle_type', la.angle_type,
                            'Explanation', la.analysis_explanation,
                            'brand_id', (SELECT brand_id FROM ad_account WHERE id = la.ad_account_id LIMIT 1),
                            'funnel', la.funnel,
                            'total_comments', (
                                SELECT COUNT(*)
                                FROM comments c
                                WHERE c.ad_id = la.id
                            )
                        ) AS ad_obj,
                        la.source_created_time
                        FROM lifetime_ads la
                        LIMIT 1000
                    ) sub
                ), '[]'::json),
                'comments', COALESCE((
                    SELECT json_agg(row_to_json(comment_data) ORDER BY comment_data.created_time DESC)
                    FROM (
                        SELECT
                            lc.id,
                            lc.comment_id,
                            lc.message,
                            lc.created_time,
                            lc.ad_id::text AS ad_id,
                            lc.created_at,
                            lc.theme,
                            lc.sentiment,
                            lc.brand,
                            (SELECT title FROM lifetime_ads WHERE id = lc.ad_id LIMIT 1) AS ad_title,
                            (SELECT angle_type FROM lifetime_ads WHERE id = lc.ad_id LIMIT 1) AS "Angel Type",
                            (SELECT meta_cluster FROM comment_cluster WHERE comment_id = lc.comment_id LIMIT 1) AS meta_cluster,
                            (SELECT funnel FROM lifetime_ads WHERE id = lc.ad_id LIMIT 1) AS funnel
                        FROM lifetime_comments lc
                        LIMIT 5000
                    ) comment_data
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
            -- Dashboard only needs aggregates for lifetime queries
            SELECT json_build_object(
                'daily_sentiment_counts', COALESCE((
                    SELECT json_agg(t ORDER BY t.created_date)
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
                            AND c.created_time IS NOT NULL
                        GROUP BY DATE_TRUNC('month', c.created_time)
                        LIMIT 120
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
                'funnel_distribution', COALESCE((
                    SELECT json_agg(t ORDER BY 
                        CASE t.name
                            WHEN 'TOF' THEN 1
                            WHEN 'MOF' THEN 2
                            WHEN 'BOF' THEN 3
                            WHEN 'Unprocessed' THEN 4
                            ELSE 5
                        END
                    )
                    FROM (
                        SELECT 
                            COALESCE(a.funnel::text, 'Unprocessed') AS name, 
                            COUNT(*) AS count
                        FROM ads a
                        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                        JOIN campaigns camp ON ads_set.campaign_id = camp.id
                        JOIN ad_account aa ON camp.account_id = aa.id
                        WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                        GROUP BY COALESCE(a.funnel::text, 'Unprocessed')
                    ) t
                ), '[]'::json),
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
        
        RETURN result;
    END IF;

    -- Original logic for filtered queries (including date-ranged queries and new campaign/adset filters)
    WITH filtered_ads AS MATERIALIZED (
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
            AND (
                angel_param IS NULL OR angel_param = 'all' OR 
                (angel_param = 'Unknown' AND a.angle_type IS NULL) OR
                a.angle_type::text = angel_param
            )
            -- New campaign filters
            AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
            AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
            -- New adset filters
            AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
            AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
    ),
    
    filtered_campaigns AS MATERIALIZED (
        SELECT DISTINCT camp.*
        FROM campaigns camp
        WHERE camp.id IN (
            SELECT DISTINCT ads_set.campaign_id
            FROM filtered_ads fa
            JOIN ad_sets ads_set ON fa.ad_set_id = ads_set.id
        )
    ),
    
    filtered_ad_sets AS MATERIALIZED (
        SELECT DISTINCT ads_set.*
        FROM ad_sets ads_set
        WHERE ads_set.id IN (
            SELECT DISTINCT ad_set_id FROM filtered_ads
        )
    ),
    
    filtered_comments AS MATERIALIZED (
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
        LIMIT 365
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
            SELECT json_agg(t ORDER BY t.count DESC)
            FROM (
                SELECT theme AS name, COUNT(*) AS count
                FROM filtered_comments
                WHERE theme IS NOT NULL
                GROUP BY theme
                LIMIT 20
            ) t
        ), '[]'::json),
        'funnel_distribution', COALESCE((
            SELECT json_agg(t ORDER BY 
                CASE t.name
                    WHEN 'TOF' THEN 1
                    WHEN 'MOF' THEN 2
                    WHEN 'BOF' THEN 3
                    WHEN 'Unprocessed' THEN 4
                    ELSE 5
                END
            )
            FROM (
                SELECT 
                    COALESCE(funnel::text, 'Unprocessed') AS name, 
                    COUNT(*) AS count
                FROM filtered_ads
                GROUP BY COALESCE(funnel::text, 'Unprocessed')
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
            'untracked_ad_ids', CASE 
                WHEN return_full_data THEN
                    COALESCE((
                        SELECT json_agg(id::text)
                        FROM (
                            SELECT id
                            FROM filtered_ads
                            WHERE angle IS NULL OR lower(trim(angle)) = '' OR lower(trim(angle)) = 'unknown'
                            LIMIT 100
                        ) sub
                    ), '[]'::json)
                ELSE '[]'::json
            END,
            'untracked_comment_ids', CASE 
                WHEN return_full_data THEN
                    COALESCE((
                        SELECT json_agg(comment_id)
                        FROM (
                            SELECT comment_id
                            FROM filtered_comments
                            WHERE sentiment IS NULL OR lower(trim(sentiment::text)) = '' OR lower(trim(sentiment::text)) = 'unknown'
                            LIMIT 100
                        ) sub
                    ), '[]'::json)
                ELSE '[]'::json
            END
        ),
        'campaigns', CASE 
            WHEN return_full_data THEN
                COALESCE((
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
                ), '[]'::json)
            ELSE '[]'::json
        END,
        'ad_sets', CASE 
            WHEN return_full_data THEN
                COALESCE((
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
                ), '[]'::json)
            ELSE '[]'::json
        END,
        'ads', CASE 
            WHEN return_full_data THEN
                COALESCE((
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
                ), '[]'::json)
            ELSE '[]'::json
        END,
        'comments', CASE 
            WHEN return_full_data THEN
                COALESCE((
                    SELECT json_agg(row_to_json(comment_data))
                    FROM (
                        SELECT
                            fc.id,
                            fc.comment_id,
                            fc.message,
                            fc.created_time,
                            fc.ad_id::text AS ad_id,
                            fc.created_at,
                            fc.theme,
                            fc.sentiment,
                            fc.brand,
                            (SELECT title FROM filtered_ads WHERE id = fc.ad_id LIMIT 1) AS ad_title,
                            (SELECT angle_type FROM filtered_ads WHERE id = fc.ad_id LIMIT 1) AS "Angel Type",
                            (SELECT meta_cluster FROM comment_cluster WHERE comment_id = fc.comment_id LIMIT 1) AS meta_cluster,
                            (SELECT funnel FROM filtered_ads WHERE id = fc.ad_id LIMIT 1) AS funnel
                        FROM filtered_comments fc
                        ORDER BY fc.created_time DESC
                        LIMIT 5000
                    ) comment_data
                ), '[]'::json)
            ELSE '[]'::json
        END,
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
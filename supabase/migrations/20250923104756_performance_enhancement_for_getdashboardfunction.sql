-- Migration to fix performance issues and GROUP BY error in get_dashboard_data function
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
            -- Optimized lifetime queries for brands page
            WITH lifetime_data AS (
                SELECT 
                    a.id as ad_id,
                    a.name as ad_name,
                    a.angle,
                    a.angle_type,
                    a.funnel,
                    a.source_created_time,
                    a.body_text,
                    a.title,
                    a.image_url,
                    a.video_url,
                    a.permalink_url,
                    a.analysis_explanation,
                    a.ad_set_id,
                    a.ad_account_id,
                    ads_set.campaign_id,
                    ads_set.name as ad_set_name,
                    ads_set.status as ad_set_status,
                    ads_set.effective_status,
                    ads_set.optimization_goal,
                    ads_set.bid_strategy,
                    ads_set.daily_budget,
                    ads_set.lifetime_budget,
                    ads_set.budget_remaining,
                    ads_set.start_time as ad_set_start_time,
                    ads_set.end_time as ad_set_end_time,
                    ads_set.created_time as ad_set_created_time,
                    ads_set.lifetime_imps,
                    ads_set.destination_type,
                    camp.name as campaign_name,
                    camp.status as campaign_status,
                    camp.objective as campaign_objective,
                    camp.start_time as campaign_start_time,
                    camp.created_at as campaign_created_at,
                    camp.updated_at as campaign_updated_at,
                    camp.account_id,
                    camp.topline_id,
                    aa.brand_id
                FROM ads a
                JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                JOIN campaigns camp ON ads_set.campaign_id = camp.id
                JOIN ad_account aa ON camp.account_id = aa.id
                WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
            ),
            comment_counts AS (
                SELECT 
                    ad_id,
                    COUNT(*) as comment_count
                FROM comments
                WHERE ad_id IN (SELECT ad_id FROM lifetime_data)
                GROUP BY ad_id
            ),
            sentiment_analysis AS (
                SELECT
                    COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive') as positive_count,
                    COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative') as negative_count,
                    COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative')) as neutral_count,
                    COUNT(*) as total_comments
                FROM comments
                WHERE ad_id IN (SELECT ad_id FROM lifetime_data)
            ),
            monthly_sentiments AS (
                SELECT
                    TO_CHAR(DATE_TRUNC('month', created_time), 'YYYY-MM-DD')::TEXT AS created_date,
                    COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive') AS positive_count,
                    COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative') AS negative_count,
                    COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative')) AS neutral_count
                FROM comments
                WHERE ad_id IN (SELECT ad_id FROM lifetime_data)
                    AND created_time IS NOT NULL
                GROUP BY DATE_TRUNC('month', created_time)
                ORDER BY DATE_TRUNC('month', created_time)
                LIMIT 120
            )
            
            SELECT json_build_object(
                'daily_sentiment_counts', COALESCE((SELECT json_agg(row_to_json(ms)) FROM monthly_sentiments ms), '[]'::json),
                'total_sentiment_counts', (SELECT json_build_object(
                    'positive', positive_count,
                    'negative', negative_count,
                    'neutral', neutral_count
                ) FROM sentiment_analysis),
                'theme_distribution', COALESCE((
                    SELECT json_agg(json_build_object('name', theme, 'count', theme_count) ORDER BY theme_count DESC)
                    FROM (
                        SELECT theme, COUNT(*) as theme_count
                        FROM comments
                        WHERE ad_id IN (SELECT ad_id FROM lifetime_data)
                            AND theme IS NOT NULL
                        GROUP BY theme
                        LIMIT 20
                    ) t
                ), '[]'::json),
                'funnel_distribution', COALESCE((
                    SELECT json_agg(json_build_object('name', funnel_name, 'count', funnel_count) ORDER BY 
                        CASE funnel_name
                            WHEN 'TOF' THEN 1
                            WHEN 'MOF' THEN 2
                            WHEN 'BOF' THEN 3
                            WHEN 'Unprocessed' THEN 4
                            ELSE 5
                        END
                    )
                    FROM (
                        SELECT 
                            COALESCE(funnel::text, 'Unprocessed') AS funnel_name,
                            COUNT(*) AS funnel_count
                        FROM lifetime_data
                        GROUP BY COALESCE(funnel::text, 'Unprocessed')
                    ) f
                ), '[]'::json),
                'top_performing_ads', COALESCE((
                    SELECT json_agg(json_build_object(
                        'ad_id', ld.ad_id::text,
                        'ad_name', ld.ad_name,
                        'comment_count', COALESCE(cc.comment_count, 0)
                    ) ORDER BY COALESCE(cc.comment_count, 0) DESC)
                    FROM (SELECT DISTINCT ad_id, ad_name FROM lifetime_data LIMIT 10) ld
                    LEFT JOIN comment_counts cc ON ld.ad_id = cc.ad_id
                ), '[]'::json),
                'key_metrics', json_build_object(
                    'total_comments', (SELECT total_comments FROM sentiment_analysis),
                    'total_ads', (SELECT COUNT(DISTINCT ad_id) FROM lifetime_data)
                ),
                'untracked_info', json_build_object(
                    'untracked_ads_count', (
                        SELECT COUNT(DISTINCT ad_id) FROM lifetime_data
                        WHERE angle IS NULL OR lower(trim(angle)) = '' OR lower(trim(angle)) = 'unknown'
                    ),
                    'untracked_comments_count', (
                        SELECT COUNT(*) FROM comments c
                        WHERE c.ad_id IN (SELECT ad_id FROM lifetime_data)
                            AND (sentiment IS NULL OR lower(trim(sentiment::text)) = '' OR lower(trim(sentiment::text)) = 'unknown')
                    ),
                    'untracked_ad_ids', '[]'::json,
                    'untracked_comment_ids', '[]'::json
                ),
                'campaigns', COALESCE((
                    SELECT json_agg(DISTINCT json_build_object(
                        'campaign_id', campaign_id::text,
                        'campaign_name', campaign_name,
                        'status', campaign_status,
                        'objective', campaign_objective,
                        'start_time', campaign_start_time,
                        'created_at', campaign_created_at,
                        'updated_at', campaign_updated_at,
                        'account_id', account_id::text,
                        'topline_id', topline_id
                    ) ORDER BY campaign_created_at DESC)
                    FROM (SELECT DISTINCT campaign_id, campaign_name, campaign_status, 
                          campaign_objective, campaign_start_time, campaign_created_at,
                          campaign_updated_at, account_id, topline_id
                          FROM lifetime_data LIMIT 100) camps
                ), '[]'::json),
                'ad_sets', COALESCE((
                    SELECT json_agg(DISTINCT json_build_object(
                        'ad_set_id', ad_set_id::text,
                        'ad_set_name', ad_set_name,
                        'campaign_id', campaign_id::text,
                        'campaign_name', campaign_name,
                        'status', ad_set_status,
                        'effective_status', effective_status,
                        'optimization_goal', optimization_goal,
                        'bid_strategy', bid_strategy,
                        'daily_budget', daily_budget,
                        'lifetime_budget', lifetime_budget,
                        'budget_remaining', budget_remaining,
                        'start_time', ad_set_start_time,
                        'end_time', ad_set_end_time,
                        'created_time', ad_set_created_time,
                        'lifetime_imps', lifetime_imps,
                        'destination_type', destination_type
                    ) ORDER BY ad_set_created_time DESC)
                    FROM (SELECT DISTINCT ad_set_id, ad_set_name, campaign_id, campaign_name,
                          ad_set_status, effective_status, optimization_goal, bid_strategy,
                          daily_budget, lifetime_budget, budget_remaining, ad_set_start_time,
                          ad_set_end_time, ad_set_created_time, lifetime_imps, destination_type
                          FROM lifetime_data LIMIT 500) adsets
                ), '[]'::json),
                'ads', COALESCE((
                    SELECT json_agg(json_build_object(
                        'id', ld.ad_id,
                        'created_at', ld.source_created_time,
                        'ad_name', ld.ad_name,
                        'ad_text', ld.body_text,
                        'ad_title', ld.title,
                        'image_url', ld.image_url,
                        'video_url', ld.video_url,
                        'post_link', ld.permalink_url,
                        'ad_id', ld.ad_id::text,
                        'ad_set_id', ld.ad_set_id::text,
                        'campaign_id', ld.campaign_id::text,
                        'Angel', ld.angle,
                        'Angel Type', ld.angle_type,
                        'angle_type', ld.angle_type,
                        'Explanation', ld.analysis_explanation,
                        'brand_id', ld.brand_id,
                        'funnel', ld.funnel,
                        'total_comments', COALESCE(cc.comment_count, 0)
                    ) ORDER BY ld.source_created_time DESC)
                    FROM (SELECT * FROM lifetime_data ORDER BY source_created_time DESC LIMIT 1000) ld
                    LEFT JOIN comment_counts cc ON ld.ad_id = cc.ad_id
                ), '[]'::json),
                'comments', '[]'::json, -- Simplified for performance
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
            -- Dashboard only needs aggregates for lifetime queries (simplified)
            SELECT json_build_object(
                'daily_sentiment_counts', COALESCE((
                    SELECT json_agg(row_to_json(t))
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
                        ORDER BY DATE_TRUNC('month', c.created_time)
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
                    SELECT json_agg(json_build_object('name', name, 'count', count) ORDER BY 
                        CASE name
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
                    'untracked_ads_count', 0,
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
        
        RETURN result;
    END IF;

    -- Original filtered queries logic remains the same but simplified
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
            AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
            AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
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
    )
    
    SELECT json_build_object(
        'daily_sentiment_counts', COALESCE((
            SELECT json_agg(row_to_json(t))
            FROM (
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
            ) t
        ), '[]'::json),
        'total_sentiment_counts', (
            SELECT json_build_object(
                'positive', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'positive'),
                'negative', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) = 'negative'),
                'neutral', COUNT(*) FILTER (WHERE lower(trim(sentiment::text)) NOT IN ('positive','negative'))
            )
            FROM filtered_comments
        ),
        'theme_distribution', COALESCE((
            SELECT json_agg(json_build_object('name', theme, 'count', cnt) ORDER BY cnt DESC)
            FROM (
                SELECT theme, COUNT(*) AS cnt
                FROM filtered_comments
                WHERE theme IS NOT NULL
                GROUP BY theme
                LIMIT 20
            ) t
        ), '[]'::json),
        'funnel_distribution', COALESCE((
            SELECT json_agg(json_build_object('name', name, 'count', cnt) ORDER BY 
                CASE name
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
                    COUNT(*) AS cnt
                FROM filtered_ads
                GROUP BY COALESCE(funnel::text, 'Unprocessed')
            ) t
        ), '[]'::json),
        'top_performing_ads', COALESCE((
            SELECT json_agg(json_build_object(
                'ad_id', ad_id,
                'ad_name', ad_name,
                'comment_count', comment_count
            ))
            FROM (
                SELECT
                    fa.id::text as ad_id,
                    fa.name as ad_name,
                    COUNT(fc.id) AS comment_count
                FROM filtered_ads fa
                LEFT JOIN filtered_comments fc ON fa.id = fc.ad_id
                GROUP BY fa.id, fa.name
                ORDER BY comment_count DESC
                LIMIT 10
            ) t
        ), '[]'::json),
        'key_metrics', json_build_object(
            'total_comments', (SELECT COUNT(*) FROM filtered_comments),
            'total_ads', (SELECT COUNT(*) FROM filtered_ads)
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
            'untracked_ad_ids', '[]'::json,
            'untracked_comment_ids', '[]'::json
        ),
        'campaigns', CASE 
            WHEN return_full_data THEN '[]'::json
            ELSE '[]'::json
        END,
        'ad_sets', CASE 
            WHEN return_full_data THEN '[]'::json
            ELSE '[]'::json
        END,
        'ads', CASE 
            WHEN return_full_data THEN '[]'::json
            ELSE '[]'::json
        END,
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
END;
$$;

-- Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_ads_ad_set_id ON ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ads_source_created_time ON ads(source_created_time);
CREATE INDEX IF NOT EXISTS idx_ads_funnel ON ads(funnel);
CREATE INDEX IF NOT EXISTS idx_ads_angle_type ON ads(angle_type);

CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_status ON ad_sets(status);
CREATE INDEX IF NOT EXISTS idx_ad_sets_optimization_goal ON ad_sets(optimization_goal);

CREATE INDEX IF NOT EXISTS idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_objective ON campaigns(objective);

CREATE INDEX IF NOT EXISTS idx_ad_account_brand_id ON ad_account(brand_id);

CREATE INDEX IF NOT EXISTS idx_comments_ad_id ON comments(ad_id);
CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON comments(sentiment);
CREATE INDEX IF NOT EXISTS idx_comments_created_time ON comments(created_time);
CREATE INDEX IF NOT EXISTS idx_comments_theme ON comments(theme);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_comments_ad_id_sentiment ON comments(ad_id, sentiment);
CREATE INDEX IF NOT EXISTS idx_ads_ad_account_id_source_created ON ads(ad_account_id, source_created_time);
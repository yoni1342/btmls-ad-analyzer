-- Fix campaigns table inter-table filtering issue
-- When campaigns are selected, subsequent tables (ad_sets, ads, comments) should show related data
-- The issue was that related_ad_sets was incorrectly filtering by has_adset_selection

CREATE OR REPLACE FUNCTION get_brands_tables_paginated(
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
    
    -- NEW: Selection-based filtering parameters for interdependency
    selected_campaign_ids_param TEXT[] DEFAULT NULL,
    selected_adset_ids_param TEXT[] DEFAULT NULL,
    selected_ad_ids_param TEXT[] DEFAULT NULL,
    
    -- Comment filter parameters for reverse filtering
    comment_sentiment_param TEXT DEFAULT NULL,
    comment_cluster_param TEXT DEFAULT NULL,
    comment_angle_type_param TEXT DEFAULT NULL,
    
    -- Pagination parameters
    primary_table_param TEXT DEFAULT 'campaigns', -- 'campaigns', 'adsets', 'ads', 'comments'
    page_param INTEGER DEFAULT 1,
    limit_param INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    start_date_ts timestamp with time zone;
    end_date_ts timestamp with time zone;
    offset_val INTEGER;
    total_count INTEGER;
    total_pages INTEGER;
    has_next BOOLEAN;
    has_previous BOOLEAN;
    
    -- Variables to track which selection filters are active
    has_campaign_selection BOOLEAN;
    has_adset_selection BOOLEAN;
    has_ad_selection BOOLEAN;
    has_comment_filters BOOLEAN;
BEGIN
    -- Set local statement timeout
    PERFORM set_config('statement_timeout', '180000', true); -- 3 minutes for paginated queries
    
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

    -- Calculate offset
    offset_val := (page_param - 1) * limit_param;
    
    -- Determine which selection filters are active
    has_campaign_selection := selected_campaign_ids_param IS NOT NULL AND array_length(selected_campaign_ids_param, 1) > 0;
    has_adset_selection := selected_adset_ids_param IS NOT NULL AND array_length(selected_adset_ids_param, 1) > 0;
    has_ad_selection := selected_ad_ids_param IS NOT NULL AND array_length(selected_ad_ids_param, 1) > 0;
    has_comment_filters := (comment_sentiment_param IS NOT NULL AND comment_sentiment_param != '' AND comment_sentiment_param != 'all')
                        OR (comment_cluster_param IS NOT NULL AND comment_cluster_param != '' AND comment_cluster_param != 'all')
                        OR (comment_angle_type_param IS NOT NULL AND comment_angle_type_param != '' AND comment_angle_type_param != 'all');

    -- Main logic based on primary table type
    IF primary_table_param = 'campaigns' THEN
        -- Get total count for pagination with selection-based filtering
        SELECT COUNT(DISTINCT camp.id)
        INTO total_count
        FROM campaigns camp
        JOIN ad_account aa ON camp.account_id = aa.id
        WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
            AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
            AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
            -- Selection-based filtering: if other tables have selections, filter campaigns accordingly
            AND (
                NOT has_adset_selection OR camp.id IN (
                    SELECT DISTINCT campaign_id FROM ad_sets WHERE id::text = ANY(selected_adset_ids_param)
                )
            )
            AND (
                NOT has_ad_selection OR camp.id IN (
                    SELECT DISTINCT ads_set.campaign_id 
                    FROM ads a 
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id 
                    WHERE a.id::text = ANY(selected_ad_ids_param)
                )
            )
            AND (
                NOT has_comment_filters OR camp.id IN (
                    SELECT DISTINCT ads_set.campaign_id 
                    FROM comments c
                    JOIN ads a ON c.ad_id = a.id
                    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                    WHERE (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
                        AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                             (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
                        AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR a.angle_type::text = comment_angle_type_param)
                )
            );
        
        -- Calculate pagination metadata
        total_pages := CEIL(total_count::float / limit_param);
        has_next := page_param < total_pages;
        has_previous := page_param > 1;
        
        WITH paginated_campaigns AS (
            SELECT DISTINCT camp.*
            FROM campaigns camp
            JOIN ad_account aa ON camp.account_id = aa.id
            WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                -- Selection-based filtering: if other tables have selections, filter campaigns accordingly
                AND (
                    NOT has_adset_selection OR camp.id IN (
                        SELECT DISTINCT campaign_id FROM ad_sets WHERE id::text = ANY(selected_adset_ids_param)
                    )
                )
                AND (
                    NOT has_ad_selection OR camp.id IN (
                        SELECT DISTINCT ads_set.campaign_id 
                        FROM ads a 
                        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id 
                        WHERE a.id::text = ANY(selected_ad_ids_param)
                    )
                )
                AND (
                    NOT has_comment_filters OR camp.id IN (
                        SELECT DISTINCT ads_set.campaign_id 
                        FROM comments c
                        JOIN ads a ON c.ad_id = a.id
                        JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
                        WHERE (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
                            AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                                 (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
                            AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR a.angle_type::text = comment_angle_type_param)
                    )
                )
            ORDER BY camp.created_at DESC
            LIMIT limit_param OFFSET offset_val
        ),
        
        related_ad_sets AS (
            -- FIXED: Show all ad_sets from paginated campaigns without additional selection filters
            -- Only apply base filters (status, optimization), not selection filters
            -- This matches the pattern used in other primary table views (e.g., adsets -> related_campaigns)
            SELECT DISTINCT ads_set.*
            FROM ad_sets ads_set
            JOIN paginated_campaigns pc ON ads_set.campaign_id = pc.id
            WHERE (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
        ),
        
        related_ads AS (
            SELECT DISTINCT a.*
            FROM ads a
            JOIN related_ad_sets ras ON a.ad_set_id = ras.id
            WHERE (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
                AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
                AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
        ),
        
        related_comments AS (
            SELECT c.*
            FROM comments c
            JOIN related_ads ra ON c.ad_id = ra.id
            WHERE (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
            LIMIT 1000
        )
        
        SELECT json_build_object(
            'campaigns', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'campaign_id', pc.id::text,
                        'campaign_name', pc.name,
                        'status', pc.status,
                        'objective', pc.objective,
                        'start_time', pc.start_time,
                        'created_at', pc.created_at,
                        'updated_at', pc.updated_at,
                        'account_id', pc.account_id::text,
                        'topline_id', pc.topline_id
                    )
                )
                FROM paginated_campaigns pc
            ), '[]'::json),
            
            'ad_sets', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'ad_set_id', ras.id::text,
                        'ad_set_name', ras.name,
                        'campaign_id', ras.campaign_id::text,
                        'campaign_name', (SELECT name FROM paginated_campaigns WHERE id = ras.campaign_id LIMIT 1),
                        'status', ras.status,
                        'effective_status', ras.effective_status,
                        'optimization_goal', ras.optimization_goal,
                        'bid_strategy', ras.bid_strategy,
                        'daily_budget', ras.daily_budget,
                        'lifetime_budget', ras.lifetime_budget,
                        'budget_remaining', ras.budget_remaining,
                        'start_time', ras.start_time,
                        'end_time', ras.end_time,
                        'created_time', ras.created_time,
                        'lifetime_imps', ras.lifetime_imps,
                        'destination_type', ras.destination_type
                    )
                )
                FROM related_ad_sets ras
            ), '[]'::json),
            
            'ads', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id', ra.id,
                        'created_at', ra.source_created_time,
                        'ad_name', ra.name,
                        'ad_text', ra.body_text,
                        'ad_title', ra.title,
                        'image_url', ra.image_url,
                        'video_url', ra.video_url,
                        'post_link', ra.permalink_url,
                        'ad_id', ra.id::text,
                        'ad_set_id', ra.ad_set_id::text,
                        'campaign_id', (SELECT campaign_id::text FROM related_ad_sets WHERE id = ra.ad_set_id LIMIT 1),
                        'Angel', ra.angle,
                        'Angel Type', ra.angle_type,
                        'angle_type', ra.angle_type,
                        'Explanation', ra.analysis_explanation,
                        'brand_id', (SELECT brand_id FROM ad_account WHERE id = ra.ad_account_id LIMIT 1),
                        'funnel', ra.funnel,
                        'total_comments', (
                            SELECT COUNT(*)
                            FROM comments c
                            WHERE c.ad_id = ra.id
                        )
                    )
                )
                FROM related_ads ra
            ), '[]'::json),
            
            'comments', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id', rc.id,
                        'comment_id', rc.comment_id,
                        'message', rc.message,
                        'created_time', rc.created_time,
                        'ad_id', rc.ad_id::text,
                        'created_at', rc.created_at,
                        'theme', rc.theme,
                        'sentiment', rc.sentiment,
                        'brand', rc.brand,
                        'ad_title', (SELECT title FROM related_ads WHERE id = rc.ad_id LIMIT 1),
                        'Angel Type', (SELECT angle_type FROM related_ads WHERE id = rc.ad_id LIMIT 1),
                        'meta_cluster', (SELECT meta_cluster FROM comment_cluster WHERE comment_id = rc.comment_id LIMIT 1),
                        'funnel', (SELECT funnel FROM related_ads WHERE id = rc.ad_id LIMIT 1)
                    )
                )
                FROM related_comments rc
            ), '[]'::json),
            
            'pagination', json_build_object(
                'primary_table', primary_table_param,
                'page', page_param,
                'limit', limit_param,
                'total_records', total_count,
                'total_pages', total_pages,
                'has_next', has_next,
                'has_previous', has_previous
            ),
            
            -- Empty arrays for overview data (not needed for paginated function)
            'daily_sentiment_counts', '[]'::json,
            'total_sentiment_counts', '{}'::json,
            'theme_distribution', '[]'::json,
            'funnel_distribution', '[]'::json,
            'top_performing_ads', '[]'::json,
            'key_metrics', '{}'::json,
            'untracked_info', '{}'::json,
            'brand_status', '{}'::json
        ) INTO result;

    ELSIF primary_table_param = 'adsets' THEN
        -- Get total count for pagination with selection-based filtering
        SELECT COUNT(DISTINCT ads_set.id)
        INTO total_count
        FROM ad_sets ads_set
        JOIN campaigns camp ON ads_set.campaign_id = camp.id
        JOIN ad_account aa ON camp.account_id = aa.id
        WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
            AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
            AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
            AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
            AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
            -- Selection-based filtering
            AND (NOT has_campaign_selection OR ads_set.campaign_id::text = ANY(selected_campaign_ids_param))
            AND (NOT has_adset_selection OR ads_set.id::text = ANY(selected_adset_ids_param))
            AND (
                NOT has_ad_selection OR ads_set.id IN (
                    SELECT DISTINCT ad_set_id FROM ads WHERE id::text = ANY(selected_ad_ids_param)
                )
            )
            AND (
                NOT has_comment_filters OR ads_set.id IN (
                    SELECT DISTINCT a.ad_set_id 
                    FROM comments c
                    JOIN ads a ON c.ad_id = a.id
                    WHERE (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
                        AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                             (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
                        AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR a.angle_type::text = comment_angle_type_param)
                )
            );
        
        -- Calculate pagination metadata
        total_pages := CEIL(total_count::float / limit_param);
        has_next := page_param < total_pages;
        has_previous := page_param > 1;
        
        WITH paginated_ad_sets AS (
            SELECT DISTINCT ads_set.*
            FROM ad_sets ads_set
            JOIN campaigns camp ON ads_set.campaign_id = camp.id
            JOIN ad_account aa ON camp.account_id = aa.id
            WHERE (brand_id_param IS NULL OR aa.brand_id = brand_id_param)
                AND (campaign_status_param IS NULL OR campaign_status_param = 'all' OR camp.status::text = campaign_status_param)
                AND (campaign_objective_param IS NULL OR campaign_objective_param = 'all' OR camp.objective::text = campaign_objective_param)
                AND (adset_status_param IS NULL OR adset_status_param = 'all' OR ads_set.status::text = adset_status_param)
                AND (adset_optimization_param IS NULL OR adset_optimization_param = 'all' OR ads_set.optimization_goal::text = adset_optimization_param)
                -- Selection-based filtering
                AND (NOT has_campaign_selection OR ads_set.campaign_id::text = ANY(selected_campaign_ids_param))
                AND (NOT has_adset_selection OR ads_set.id::text = ANY(selected_adset_ids_param))
                AND (
                    NOT has_ad_selection OR ads_set.id IN (
                        SELECT DISTINCT ad_set_id FROM ads WHERE id::text = ANY(selected_ad_ids_param)
                    )
                )
                AND (
                    NOT has_comment_filters OR ads_set.id IN (
                        SELECT DISTINCT a.ad_set_id 
                        FROM comments c
                        JOIN ads a ON c.ad_id = a.id
                        WHERE (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
                            AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                                 (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
                            AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR a.angle_type::text = comment_angle_type_param)
                    )
                )
            ORDER BY ads_set.created_time DESC
            LIMIT limit_param OFFSET offset_val
        ),
        
        related_campaigns AS (
            SELECT DISTINCT camp.*
            FROM campaigns camp
            JOIN paginated_ad_sets pas ON camp.id = pas.campaign_id
        ),
        
        related_ads AS (
            SELECT DISTINCT a.*
            FROM ads a
            JOIN paginated_ad_sets pas ON a.ad_set_id = pas.id
            WHERE (start_date_ts IS NULL OR a.source_created_time >= start_date_ts)
                AND (end_date_ts IS NULL OR a.source_created_time <= end_date_ts)
                AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
                AND (angel_param IS NULL OR angel_param = 'all' OR (angel_param = 'Unknown' AND a.angle_type IS NULL) OR a.angle_type::text = angel_param)
                AND (NOT has_ad_selection OR a.id::text = ANY(selected_ad_ids_param))
        ),
        
        related_comments AS (
            SELECT c.*
            FROM comments c
            JOIN related_ads ra ON c.ad_id = ra.id
            WHERE (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                AND (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
                AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                     (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
                AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR ra.angle_type::text = comment_angle_type_param)
            LIMIT 1000
        )
        
        SELECT json_build_object(
            'campaigns', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'campaign_id', rc.id::text,
                        'campaign_name', rc.name,
                        'status', rc.status,
                        'objective', rc.objective,
                        'start_time', rc.start_time,
                        'created_at', rc.created_at,
                        'updated_at', rc.updated_at,
                        'account_id', rc.account_id::text,
                        'topline_id', rc.topline_id
                    )
                )
                FROM related_campaigns rc
            ), '[]'::json),
            
            'ad_sets', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'ad_set_id', pas.id::text,
                        'ad_set_name', pas.name,
                        'campaign_id', pas.campaign_id::text,
                        'campaign_name', (SELECT name FROM related_campaigns WHERE id = pas.campaign_id LIMIT 1),
                        'status', pas.status,
                        'effective_status', pas.effective_status,
                        'optimization_goal', pas.optimization_goal,
                        'bid_strategy', pas.bid_strategy,
                        'daily_budget', pas.daily_budget,
                        'lifetime_budget', pas.lifetime_budget,
                        'budget_remaining', pas.budget_remaining,
                        'start_time', pas.start_time,
                        'end_time', pas.end_time,
                        'created_time', pas.created_time,
                        'lifetime_imps', pas.lifetime_imps,
                        'destination_type', pas.destination_type
                    )
                )
                FROM paginated_ad_sets pas
            ), '[]'::json),
            
            'ads', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id', ra.id,
                        'created_at', ra.source_created_time,
                        'ad_name', ra.name,
                        'ad_text', ra.body_text,
                        'ad_title', ra.title,
                        'image_url', ra.image_url,
                        'video_url', ra.video_url,
                        'post_link', ra.permalink_url,
                        'ad_id', ra.id::text,
                        'ad_set_id', ra.ad_set_id::text,
                        'campaign_id', (SELECT campaign_id::text FROM paginated_ad_sets WHERE id = ra.ad_set_id LIMIT 1),
                        'Angel', ra.angle,
                        'Angel Type', ra.angle_type,
                        'angle_type', ra.angle_type,
                        'Explanation', ra.analysis_explanation,
                        'brand_id', (SELECT brand_id FROM ad_account WHERE id = ra.ad_account_id LIMIT 1),
                        'funnel', ra.funnel,
                        'total_comments', (
                            SELECT COUNT(*)
                            FROM comments c
                            WHERE c.ad_id = ra.id
                        )
                    )
                )
                FROM related_ads ra
            ), '[]'::json),
            
            'comments', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id', rc.id,
                        'comment_id', rc.comment_id,
                        'message', rc.message,
                        'created_time', rc.created_time,
                        'ad_id', rc.ad_id::text,
                        'created_at', rc.created_at,
                        'theme', rc.theme,
                        'sentiment', rc.sentiment,
                        'brand', rc.brand,
                        'ad_title', (SELECT title FROM related_ads WHERE id = rc.ad_id LIMIT 1),
                        'Angel Type', (SELECT angle_type FROM related_ads WHERE id = rc.ad_id LIMIT 1),
                        'meta_cluster', (SELECT meta_cluster FROM comment_cluster WHERE comment_id = rc.comment_id LIMIT 1),
                        'funnel', (SELECT funnel FROM related_ads WHERE id = rc.ad_id LIMIT 1)
                    )
                )
                FROM related_comments rc
            ), '[]'::json),
            
            'pagination', json_build_object(
                'primary_table', primary_table_param,
                'page', page_param,
                'limit', limit_param,
                'total_records', total_count,
                'total_pages', total_pages,
                'has_next', has_next,
                'has_previous', has_previous
            ),
            
            'daily_sentiment_counts', '[]'::json,
            'total_sentiment_counts', '{}'::json,
            'theme_distribution', '[]'::json,
            'funnel_distribution', '[]'::json,
            'top_performing_ads', '[]'::json,
            'key_metrics', '{}'::json,
            'untracked_info', '{}'::json,
            'brand_status', '{}'::json
        ) INTO result;

    ELSIF primary_table_param = 'ads' THEN
        -- Get total count for pagination with selection-based filtering
        SELECT COUNT(DISTINCT a.id)
        INTO total_count
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
            -- Selection-based filtering
            AND (NOT has_campaign_selection OR ads_set.campaign_id::text = ANY(selected_campaign_ids_param))
            AND (NOT has_adset_selection OR a.ad_set_id::text = ANY(selected_adset_ids_param))
            AND (NOT has_ad_selection OR a.id::text = ANY(selected_ad_ids_param))
            AND (
                NOT has_comment_filters OR a.id IN (
                    SELECT DISTINCT ad_id 
                    FROM comments c
                    WHERE (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
                        AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                             (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
                        AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR 
                             (SELECT angle_type FROM ads WHERE id = c.ad_id LIMIT 1) = comment_angle_type_param)
                )
            );
        
        -- Calculate pagination metadata
        total_pages := CEIL(total_count::float / limit_param);
        has_next := page_param < total_pages;
        has_previous := page_param > 1;
        
        WITH paginated_ads AS (
            SELECT DISTINCT a.*
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
                -- Selection-based filtering
                AND (NOT has_campaign_selection OR ads_set.campaign_id::text = ANY(selected_campaign_ids_param))
                AND (NOT has_adset_selection OR a.ad_set_id::text = ANY(selected_adset_ids_param))
                AND (NOT has_ad_selection OR a.id::text = ANY(selected_ad_ids_param))
                AND (
                    NOT has_comment_filters OR a.id IN (
                        SELECT DISTINCT ad_id 
                        FROM comments c
                        WHERE (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
                            AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                                 (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
                            AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR 
                                 (SELECT angle_type FROM ads WHERE id = c.ad_id LIMIT 1) = comment_angle_type_param)
                    )
                )
            ORDER BY a.source_created_time DESC
            LIMIT limit_param OFFSET offset_val
        ),
        
        related_ad_sets AS (
            SELECT DISTINCT ads_set.*
            FROM ad_sets ads_set
            JOIN paginated_ads pa ON ads_set.id = pa.ad_set_id
        ),
        
        related_campaigns AS (
            SELECT DISTINCT camp.*
            FROM campaigns camp
            JOIN related_ad_sets ras ON camp.id = ras.campaign_id
        ),
        
        related_comments AS (
            SELECT c.*
            FROM comments c
            JOIN paginated_ads pa ON c.ad_id = pa.id
            WHERE (start_date_ts IS NULL OR c.created_time >= start_date_ts)
                AND (end_date_ts IS NULL OR c.created_time <= end_date_ts)
                AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
                AND (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
                AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                     (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
                AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR pa.angle_type::text = comment_angle_type_param)
        )
        
        SELECT json_build_object(
            'campaigns', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'campaign_id', rc.id::text,
                        'campaign_name', rc.name,
                        'status', rc.status,
                        'objective', rc.objective,
                        'start_time', rc.start_time,
                        'created_at', rc.created_at,
                        'updated_at', rc.updated_at,
                        'account_id', rc.account_id::text,
                        'topline_id', rc.topline_id
                    )
                )
                FROM related_campaigns rc
            ), '[]'::json),
            
            'ad_sets', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'ad_set_id', ras.id::text,
                        'ad_set_name', ras.name,
                        'campaign_id', ras.campaign_id::text,
                        'campaign_name', (SELECT name FROM related_campaigns WHERE id = ras.campaign_id LIMIT 1),
                        'status', ras.status,
                        'effective_status', ras.effective_status,
                        'optimization_goal', ras.optimization_goal,
                        'bid_strategy', ras.bid_strategy,
                        'daily_budget', ras.daily_budget,
                        'lifetime_budget', ras.lifetime_budget,
                        'budget_remaining', ras.budget_remaining,
                        'start_time', ras.start_time,
                        'end_time', ras.end_time,
                        'created_time', ras.created_time,
                        'lifetime_imps', ras.lifetime_imps,
                        'destination_type', ras.destination_type
                    )
                )
                FROM related_ad_sets ras
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
                        'campaign_id', (SELECT campaign_id::text FROM related_ad_sets WHERE id = pa.ad_set_id LIMIT 1),
                        'Angel', pa.angle,
                        'Angel Type', pa.angle_type,
                        'angle_type', pa.angle_type,
                        'Explanation', pa.analysis_explanation,
                        'brand_id', (SELECT brand_id FROM ad_account WHERE id = pa.ad_account_id LIMIT 1),
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
                        'id', rc.id,
                        'comment_id', rc.comment_id,
                        'message', rc.message,
                        'created_time', rc.created_time,
                        'ad_id', rc.ad_id::text,
                        'created_at', rc.created_at,
                        'theme', rc.theme,
                        'sentiment', rc.sentiment,
                        'brand', rc.brand,
                        'ad_title', (SELECT title FROM paginated_ads WHERE id = rc.ad_id LIMIT 1),
                        'Angel Type', (SELECT angle_type FROM paginated_ads WHERE id = rc.ad_id LIMIT 1),
                        'meta_cluster', (SELECT meta_cluster FROM comment_cluster WHERE comment_id = rc.comment_id LIMIT 1),
                        'funnel', (SELECT funnel FROM paginated_ads WHERE id = rc.ad_id LIMIT 1)
                    )
                )
                FROM related_comments rc
            ), '[]'::json),
            
            'pagination', json_build_object(
                'primary_table', primary_table_param,
                'page', page_param,
                'limit', limit_param,
                'total_records', total_count,
                'total_pages', total_pages,
                'has_next', has_next,
                'has_previous', has_previous
            ),
            
            'daily_sentiment_counts', '[]'::json,
            'total_sentiment_counts', '{}'::json,
            'theme_distribution', '[]'::json,
            'funnel_distribution', '[]'::json,
            'top_performing_ads', '[]'::json,
            'key_metrics', '{}'::json,
            'untracked_info', '{}'::json,
            'brand_status', '{}'::json
        ) INTO result;

    ELSIF primary_table_param = 'comments' THEN
        -- Get total count for pagination with selection-based filtering
        SELECT COUNT(DISTINCT c.id)
        INTO total_count
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
            -- Selection-based filtering
            AND (NOT has_campaign_selection OR ads_set.campaign_id::text = ANY(selected_campaign_ids_param))
            AND (NOT has_adset_selection OR a.ad_set_id::text = ANY(selected_adset_ids_param))
            AND (NOT has_ad_selection OR c.ad_id::text = ANY(selected_ad_ids_param))
            -- Comment-specific filters
            AND (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
            AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                 (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
            AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR a.angle_type::text = comment_angle_type_param);
        
        -- Calculate pagination metadata
        total_pages := CEIL(total_count::float / limit_param);
        has_next := page_param < total_pages;
        has_previous := page_param > 1;
        
        WITH paginated_comments AS (
            SELECT c.*
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
                -- Selection-based filtering
                AND (NOT has_campaign_selection OR ads_set.campaign_id::text = ANY(selected_campaign_ids_param))
                AND (NOT has_adset_selection OR a.ad_set_id::text = ANY(selected_adset_ids_param))
                AND (NOT has_ad_selection OR c.ad_id::text = ANY(selected_ad_ids_param))
                -- Comment-specific filters
                AND (comment_sentiment_param IS NULL OR comment_sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(comment_sentiment_param))
                AND (comment_cluster_param IS NULL OR comment_cluster_param = 'all' OR 
                     (SELECT meta_cluster FROM comment_cluster WHERE comment_id = c.comment_id LIMIT 1) = comment_cluster_param)
                AND (comment_angle_type_param IS NULL OR comment_angle_type_param = 'all' OR a.angle_type::text = comment_angle_type_param)
            ORDER BY c.created_time DESC
            LIMIT limit_param OFFSET offset_val
        ),
        
        related_ads AS (
            SELECT DISTINCT a.*
            FROM ads a
            JOIN paginated_comments pc ON a.id = pc.ad_id
        ),
        
        related_ad_sets AS (
            SELECT DISTINCT ads_set.*
            FROM ad_sets ads_set
            JOIN related_ads ra ON ads_set.id = ra.ad_set_id
        ),
        
        related_campaigns AS (
            SELECT DISTINCT camp.*
            FROM campaigns camp
            JOIN related_ad_sets ras ON camp.id = ras.campaign_id
        )
        
        SELECT json_build_object(
            'campaigns', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'campaign_id', rc.id::text,
                        'campaign_name', rc.name,
                        'status', rc.status,
                        'objective', rc.objective,
                        'start_time', rc.start_time,
                        'created_at', rc.created_at,
                        'updated_at', rc.updated_at,
                        'account_id', rc.account_id::text,
                        'topline_id', rc.topline_id
                    )
                )
                FROM related_campaigns rc
            ), '[]'::json),
            
            'ad_sets', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'ad_set_id', ras.id::text,
                        'ad_set_name', ras.name,
                        'campaign_id', ras.campaign_id::text,
                        'campaign_name', (SELECT name FROM related_campaigns WHERE id = ras.campaign_id LIMIT 1),
                        'status', ras.status,
                        'effective_status', ras.effective_status,
                        'optimization_goal', ras.optimization_goal,
                        'bid_strategy', ras.bid_strategy,
                        'daily_budget', ras.daily_budget,
                        'lifetime_budget', ras.lifetime_budget,
                        'budget_remaining', ras.budget_remaining,
                        'start_time', ras.start_time,
                        'end_time', ras.end_time,
                        'created_time', ras.created_time,
                        'lifetime_imps', ras.lifetime_imps,
                        'destination_type', ras.destination_type
                    )
                )
                FROM related_ad_sets ras
            ), '[]'::json),
            
            'ads', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id', ra.id,
                        'created_at', ra.source_created_time,
                        'ad_name', ra.name,
                        'ad_text', ra.body_text,
                        'ad_title', ra.title,
                        'image_url', ra.image_url,
                        'video_url', ra.video_url,
                        'post_link', ra.permalink_url,
                        'ad_id', ra.id::text,
                        'ad_set_id', ra.ad_set_id::text,
                        'campaign_id', (SELECT campaign_id::text FROM related_ad_sets WHERE id = ra.ad_set_id LIMIT 1),
                        'Angel', ra.angle,
                        'Angel Type', ra.angle_type,
                        'angle_type', ra.angle_type,
                        'Explanation', ra.analysis_explanation,
                        'brand_id', (SELECT brand_id FROM ad_account WHERE id = ra.ad_account_id LIMIT 1),
                        'funnel', ra.funnel,
                        'total_comments', (
                            SELECT COUNT(*)
                            FROM comments c
                            WHERE c.ad_id = ra.id
                        )
                    )
                )
                FROM related_ads ra
            ), '[]'::json),
            
            'comments', COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id', pc.id,
                        'comment_id', pc.comment_id,
                        'message', pc.message,
                        'created_time', pc.created_time,
                        'ad_id', pc.ad_id::text,
                        'created_at', pc.created_at,
                        'theme', pc.theme,
                        'sentiment', pc.sentiment,
                        'brand', pc.brand,
                        'ad_title', (SELECT title FROM related_ads WHERE id = pc.ad_id LIMIT 1),
                        'Angel Type', (SELECT angle_type FROM related_ads WHERE id = pc.ad_id LIMIT 1),
                        'meta_cluster', (SELECT meta_cluster FROM comment_cluster WHERE comment_id = pc.comment_id LIMIT 1),
                        'funnel', (SELECT funnel FROM related_ads WHERE id = pc.ad_id LIMIT 1)
                    )
                )
                FROM paginated_comments pc
            ), '[]'::json),
            
            'pagination', json_build_object(
                'primary_table', primary_table_param,
                'page', page_param,
                'limit', limit_param,
                'total_records', total_count,
                'total_pages', total_pages,
                'has_next', has_next,
                'has_previous', has_previous
            ),
            
            'daily_sentiment_counts', '[]'::json,
            'total_sentiment_counts', '{}'::json,
            'theme_distribution', '[]'::json,
            'funnel_distribution', '[]'::json,
            'top_performing_ads', '[]'::json,
            'key_metrics', '{}'::json,
            'untracked_info', '{}'::json,
            'brand_status', '{}'::json
        ) INTO result;
        
    ELSE
        -- Invalid primary_table_param
        RAISE EXCEPTION 'Invalid primary_table_param: %. Must be one of: campaigns, adsets, ads, comments', primary_table_param;
    END IF;

    RETURN result;
END;
$$;
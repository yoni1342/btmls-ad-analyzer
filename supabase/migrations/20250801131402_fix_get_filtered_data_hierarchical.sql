-- CRITICAL FIX: Update get_filtered_data to use new hierarchical structure
-- This replaces the broken function that was using deprecated ad_per_ad_account table

CREATE OR REPLACE FUNCTION get_filtered_data(
    brand_id_param integer DEFAULT NULL,
    ad_ids_param bigint[] DEFAULT NULL,  -- Changed from text[] to bigint[] for new schema
    sentiment_param text DEFAULT NULL,
    cluster_param text DEFAULT NULL,
    angel_param text DEFAULT NULL,
    search_query_param text DEFAULT NULL,
    start_date_param text DEFAULT NULL,
    end_date_param text DEFAULT NULL
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

    SELECT json_agg(
        json_build_object(
            'comment_id', c.comment_id,
            'message', c.message,
            'created_time', c.created_time,
            'ad_id', c.ad_id::text,  -- Convert bigint to text for compatibility
            'sentiment', c.sentiment,
            'ad_title', a.title,
            'Angel Type', a.angle_type,  -- Use new column name
            'meta_cluster', cc.meta_cluster,
            'funnel', a.funnel
        )
    )
    INTO result
    FROM comments c
    JOIN ads a ON c.ad_id = a.id  -- Use new hierarchical join
    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
    JOIN campaigns camp ON ads_set.campaign_id = camp.id
    JOIN ad_account aa ON camp.account_id = aa.id
    JOIN brands b ON aa.brand_id = b.id
    LEFT JOIN comment_cluster cc ON c.comment_id = cc.comment_id
    WHERE
        (brand_id_param IS NULL OR b.id = brand_id_param)
        AND (ad_ids_param IS NULL OR c.ad_id = ANY(ad_ids_param))
        AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
        AND (cluster_param IS NULL OR cluster_param = 'all' OR lower(trim(cc.meta_cluster)) = lower(cluster_param))
        AND (angel_param IS NULL OR angel_param = 'all' OR lower(trim(a.angle_type)) = lower(angel_param))  -- Use new column
        AND (search_query_param IS NULL OR c.message ILIKE '%' || search_query_param || '%')
        AND (start_date_ts IS NULL OR c.created_time::timestamp with time zone >= start_date_ts)
        AND (end_date_ts IS NULL OR c.created_time::timestamp with time zone <= end_date_ts);

    RETURN result;
END;
$$;

-- Also create a version that accepts text[] for backwards compatibility
CREATE OR REPLACE FUNCTION get_filtered_data(
    brand_id_param integer DEFAULT NULL,
    ad_ids_param text[] DEFAULT NULL,  -- Keep text[] version for compatibility
    sentiment_param text DEFAULT NULL,
    cluster_param text DEFAULT NULL,
    angel_param text DEFAULT NULL,
    search_query_param text DEFAULT NULL,
    start_date_param text DEFAULT NULL,
    end_date_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    bigint_ad_ids bigint[];
BEGIN
    -- Convert text[] to bigint[] if provided
    IF ad_ids_param IS NOT NULL THEN
        SELECT ARRAY(SELECT id::bigint FROM unnest(ad_ids_param) AS id WHERE id ~ '^[0-9]+$')
        INTO bigint_ad_ids;
    END IF;

    -- Call the main function with converted parameters
    RETURN get_filtered_data(
        brand_id_param,
        bigint_ad_ids,
        sentiment_param,
        cluster_param,
        angel_param,
        search_query_param,
        start_date_param,
        end_date_param
    );
END;
$$;

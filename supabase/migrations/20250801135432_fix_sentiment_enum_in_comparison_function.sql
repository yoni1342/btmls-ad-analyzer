-- CRITICAL FIX: Handle sentiment enum type in get_sentiments_with_comparison function
-- Remove trim() calls on enum columns which cause the error

CREATE OR REPLACE FUNCTION get_sentiments_with_comparison(
    brand_id_param integer,
    start_date_param timestamp,
    end_date_param timestamp,
    ad_ids_param text[] DEFAULT NULL,
    sentiment_param text DEFAULT NULL,
    cluster_param text DEFAULT NULL,
    angel_param text DEFAULT NULL,
    search_query_param text DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql
AS $$
DECLARE
    current_period_data json;
    previous_period_data json;
    period_duration interval;
    previous_start_date timestamp;
    previous_end_date timestamp;
    bigint_ad_ids bigint[];
BEGIN
    -- Convert text[] ad_ids to bigint[] if provided
    IF ad_ids_param IS NOT NULL THEN
        SELECT ARRAY(SELECT id::bigint FROM unnest(ad_ids_param) AS id WHERE id ~ '^[0-9]+$')
        INTO bigint_ad_ids;
    END IF;

    -- Fetch data for the current period using hierarchical structure
    SELECT json_agg(
        json_build_object(
            'comment_id', c.comment_id,
            'message', c.message,
            'created_time', c.created_time,
            'ad_id', c.ad_id::text,
            'sentiment', c.sentiment::text,  -- Cast enum to text
            'ad_title', a.title,
            'Angel Type', a.angle_type,
            'meta_cluster', cc.meta_cluster,
            'funnel', a.funnel::text  -- Cast enum to text
        )
    )
    INTO current_period_data
    FROM comments c
    JOIN ads a ON c.ad_id = a.id
    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
    JOIN campaigns camp ON ads_set.campaign_id = camp.id
    JOIN ad_account aa ON camp.account_id = aa.id
    JOIN brands b ON aa.brand_id = b.id
    LEFT JOIN comment_cluster cc ON c.comment_id = cc.comment_id
    WHERE
        (brand_id_param IS NULL OR b.id = brand_id_param)
        AND (c.created_time BETWEEN start_date_param AND end_date_param)
        AND (bigint_ad_ids IS NULL OR c.ad_id = ANY(bigint_ad_ids))
        AND (sentiment_param IS NULL OR sentiment_param = 'all' OR c.sentiment::text = sentiment_param)  -- Cast enum to text
        AND (cluster_param IS NULL OR cluster_param = 'all' OR lower(trim(cc.meta_cluster)) = lower(cluster_param))
        AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type = angel_param)  -- No trim needed
        AND (search_query_param IS NULL OR c.message ILIKE '%' || search_query_param || '%');

    -- Calculate previous period
    period_duration := end_date_param - start_date_param;
    previous_end_date := start_date_param - interval '1 microsecond';
    previous_start_date := previous_end_date - period_duration;

    -- Fetch data for the previous period using hierarchical structure
    SELECT json_agg(
        json_build_object(
            'comment_id', c.comment_id,
            'message', c.message,
            'created_time', c.created_time,
            'ad_id', c.ad_id::text,
            'sentiment', c.sentiment::text,  -- Cast enum to text
            'ad_title', a.title,
            'Angel Type', a.angle_type,
            'meta_cluster', cc.meta_cluster,
            'funnel', a.funnel::text  -- Cast enum to text
        )
    )
    INTO previous_period_data
    FROM comments c
    JOIN ads a ON c.ad_id = a.id
    JOIN ad_sets ads_set ON a.ad_set_id = ads_set.id
    JOIN campaigns camp ON ads_set.campaign_id = camp.id
    JOIN ad_account aa ON camp.account_id = aa.id
    JOIN brands b ON aa.brand_id = b.id
    LEFT JOIN comment_cluster cc ON c.comment_id = cc.comment_id
    WHERE
        (brand_id_param IS NULL OR b.id = brand_id_param)
        AND (c.created_time BETWEEN previous_start_date AND previous_end_date)
        AND (bigint_ad_ids IS NULL OR c.ad_id = ANY(bigint_ad_ids))
        AND (sentiment_param IS NULL OR sentiment_param = 'all' OR c.sentiment::text = sentiment_param)  -- Cast enum to text
        AND (cluster_param IS NULL OR cluster_param = 'all' OR lower(trim(cc.meta_cluster)) = lower(cluster_param))
        AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type = angel_param)  -- No trim needed
        AND (search_query_param IS NULL OR c.message ILIKE '%' || search_query_param || '%');

    -- Return both datasets
    RETURN json_build_object(
        'current_period', current_period_data,
        'previous_period', previous_period_data
    );
END;
$$;

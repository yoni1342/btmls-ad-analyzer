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
BEGIN
    -- Calculate previous period
    period_duration := end_date_param - start_date_param;
    previous_end_date := start_date_param - interval '1 microsecond';
    previous_start_date := previous_end_date - period_duration;

    -- Fetch data for the current period
    WITH current_period_comments AS (
        SELECT c.comment_id, c.message, c.created_time, c.ad_id, c.sentiment, a.ad_title, a."Angel Type", cc.meta_cluster, a.funnel
        FROM comments c
        LEFT JOIN ad_per_ad_account a ON c.ad_id = a.ad_id
        LEFT JOIN comment_cluster cc ON c.comment_id = cc.comment_id
        WHERE
            (brand_id_param IS NULL OR a.brand_id = brand_id_param)
            AND (c.created_time BETWEEN start_date_param AND end_date_param)
            AND (ad_ids_param IS NULL OR c.ad_id = ANY(ad_ids_param))
            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
            AND (cluster_param IS NULL OR cluster_param = 'all' OR lower(trim(cc.meta_cluster)) = lower(cluster_param))
            AND (angel_param IS NULL OR angel_param = 'all' OR lower(trim(a."Angel Type")) = lower(angel_param))
            AND (search_query_param IS NULL OR c.message ILIKE '%' || search_query_param || '%')
    )
    SELECT json_build_object(
        'comments', (SELECT json_agg(cpc) FROM current_period_comments cpc),
        'total_comments', (SELECT count(*) FROM current_period_comments),
        'total_ads', (SELECT count(distinct ad_id) FROM current_period_comments)
    ) INTO current_period_data;

    -- Fetch data for the previous period
    WITH previous_period_comments AS (
        SELECT c.comment_id, c.message, c.created_time, c.ad_id, c.sentiment, a.ad_title, a."Angel Type", cc.meta_cluster, a.funnel
        FROM comments c
        LEFT JOIN ad_per_ad_account a ON c.ad_id = a.ad_id
        LEFT JOIN comment_cluster cc ON c.comment_id = cc.comment_id
        WHERE
            (brand_id_param IS NULL OR a.brand_id = brand_id_param)
            AND (c.created_time BETWEEN previous_start_date AND previous_end_date)
            AND (ad_ids_param IS NULL OR c.ad_id = ANY(ad_ids_param))
            AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment::text)) = lower(sentiment_param))
            AND (cluster_param IS NULL OR cluster_param = 'all' OR lower(trim(cc.meta_cluster)) = lower(cluster_param))
            AND (angel_param IS NULL OR angel_param = 'all' OR lower(trim(a."Angel Type")) = lower(angel_param))
            AND (search_query_param IS NULL OR c.message ILIKE '%' || search_query_param || '%')
    )
    SELECT json_build_object(
        'comments', (SELECT json_agg(ppc) FROM previous_period_comments ppc),
        'total_comments', (SELECT count(*) FROM previous_period_comments),
        'total_ads', (SELECT count(distinct ad_id) FROM previous_period_comments)
    ) INTO previous_period_data;

    -- Return both datasets
    RETURN json_build_object(
        'current_period', current_period_data,
        'previous_period', previous_period_data
    );
END;
$$;
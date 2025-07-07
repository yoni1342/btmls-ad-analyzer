-- Migration: create daily_comment_sentiment_counts function with bigint parameter
CREATE OR REPLACE FUNCTION public.get_daily_comment_sentiment_counts(
brand_id_param BIGINT,
start_date_param TIMESTAMPTZ,
end_date_param TIMESTAMPTZ
)
RETURNS TABLE(
created_date DATE,
positive_count BIGINT,
negative_count BIGINT,
neutral_count BIGINT
)
AS $$
BEGIN
RETURN QUERY
SELECT
DATE(c.created_time) AS created_date,
COUNT(*) FILTER (WHERE c.sentiment = 'positive') AS positive_count,
COUNT(*) FILTER (WHERE c.sentiment = 'negative') AS negative_count,
COUNT(*) FILTER (
WHERE c.sentiment IS DISTINCT FROM 'positive'
AND c.sentiment IS DISTINCT FROM 'negative'
) AS neutral_count
FROM comments c
LEFT JOIN ad_per_ad_account a
ON c.ad_id = a.ad_id
WHERE
(brand_id_param IS NULL OR a.brand_id = brand_id_param)
AND (start_date_param IS NULL OR c.created_time >= start_date_param)
AND (end_date_param IS NULL OR c.created_time <= end_date_param)
GROUP BY DATE(c.created_time)
ORDER BY DATE(c.created_time);
END;
$$ LANGUAGE plpgsql;
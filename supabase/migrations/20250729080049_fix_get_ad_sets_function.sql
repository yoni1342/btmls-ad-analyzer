-- Fix RPC function to get ad sets data for a brand using brand_name relationship
CREATE OR REPLACE FUNCTION public.get_ad_sets_data(
    brand_id_param bigint,
    start_date_param text DEFAULT NULL,
    end_date_param text DEFAULT NULL
)
RETURNS TABLE (
    ad_set_id bigint,
    ad_set_name text,
    campaign_id bigint,
    campaign_name text,
    status text,
    effective_status text,
    optimization_goal text,
    bid_strategy text,
    daily_budget numeric,
    lifetime_budget numeric,
    budget_remaining numeric,
    start_time timestamptz,
    end_time timestamptz,
    created_time timestamptz,
    lifetime_imps bigint,
    destination_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ads.id as ad_set_id,
        ads.name as ad_set_name,
        ads.campaign_id,
        c.name as campaign_name,
        ads.status,
        ads.effective_status,
        ads.optimization_goal,
        ads.bid_strategy,
        ads.daily_budget,
        ads.lifetime_budget,
        ads.budget_remaining,
        ads.start_time,
        ads.end_time,
        ads.created_time,
        ads.lifetime_imps,
        ads.destination_type
    FROM public.ad_sets ads
    INNER JOIN public.campaigns c ON ads.campaign_id = c.id
    INNER JOIN public.ad_account aa ON c.account_id = aa.id
    INNER JOIN public.brands b ON aa.brand_name = b.brand_name
    WHERE b.id = brand_id_param
    AND (
        start_date_param IS NULL 
        OR end_date_param IS NULL 
        OR ads.created_time >= start_date_param::timestamptz
    )
    AND (
        start_date_param IS NULL 
        OR end_date_param IS NULL 
        OR ads.created_time <= end_date_param::timestamptz
    )
    ORDER BY ads.created_time DESC;
END;
$$;

-- Add comment for clarity
COMMENT ON FUNCTION public.get_ad_sets_data(bigint, text, text) 
IS 'Fetches essential ad set data for a specific brand using brand_name relationship with optional date filtering. Includes key columns for budget analysis, optimization insights, and performance tracking.';
-- ============================================================================
-- Functions to get campaigns and ad sets directly by ad_account ID
-- This works for all brands regardless of the brands table relationship
-- ============================================================================

-- Function to get campaigns directly by ad_account ID
CREATE OR REPLACE FUNCTION public.get_campaigns_by_account(
    account_id_param text,
    start_date_param text DEFAULT NULL,
    end_date_param text DEFAULT NULL
)
RETURNS TABLE (
    campaign_id bigint,
    campaign_name text,
    status text,
    objective text,
    start_time timestamptz,
    created_at timestamptz,
    updated_at timestamptz,
    account_id uuid,
    account_name text,
    topline_id text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    account_uuid uuid;
BEGIN
    -- Convert account_id_param to UUID
    account_uuid := account_id_param::uuid;
    
    RETURN QUERY
    SELECT 
        c.id as campaign_id,
        c.name as campaign_name,
        c.status::text,
        c.objective::text,
        c.start_time,
        c.created_at,
        c.updated_at,
        c.account_id,
        aa.ad_name as account_name,
        c.topline_id
    FROM public.campaigns c
    INNER JOIN public.ad_account aa ON c.account_id = aa.id
    WHERE aa.id = account_uuid
    AND (
        start_date_param IS NULL 
        OR end_date_param IS NULL 
        OR c.created_at >= start_date_param::timestamptz
    )
    AND (
        start_date_param IS NULL 
        OR end_date_param IS NULL 
        OR c.created_at <= end_date_param::timestamptz
    )
    ORDER BY c.created_at DESC;
END;
$$;

-- Function to get ad sets directly by ad_account ID
CREATE OR REPLACE FUNCTION public.get_ad_sets_by_account(
    account_id_param text,
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
DECLARE
    account_uuid uuid;
BEGIN
    -- Convert account_id_param to UUID
    account_uuid := account_id_param::uuid;
    
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
    WHERE aa.id = account_uuid
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

-- Add comments for clarity
COMMENT ON FUNCTION public.get_campaigns_by_account(text, text, text) 
IS 'Fetches campaign data directly by ad_account ID with optional date filtering';

COMMENT ON FUNCTION public.get_ad_sets_by_account(text, text, text) 
IS 'Fetches ad set data directly by ad_account ID with optional date filtering';

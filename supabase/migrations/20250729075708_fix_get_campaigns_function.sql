-- Fix RPC function to get campaigns data for a brand using brand_name relationship
CREATE OR REPLACE FUNCTION public.get_campaigns_data(
    brand_id_param bigint,
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
    account_id bigint,
    account_name text,
    topline_id text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
        aa.brand_name as account_name,
        c.topline_id
    FROM public.campaigns c
    INNER JOIN public.ad_account aa ON c.account_id = aa.id
    INNER JOIN public.brands b ON aa.brand_name = b.brand_name
    WHERE b.id = brand_id_param
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

-- Add comment for clarity
COMMENT ON FUNCTION public.get_campaigns_data(bigint, text, text) 
IS 'Fetches campaign data for a specific brand using brand_name relationship with optional date filtering';
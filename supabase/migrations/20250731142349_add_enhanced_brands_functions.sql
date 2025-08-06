-- ============================================================================
-- Enhanced functions to include brands from ad_account table alongside existing brands
-- This maintains backward compatibility while adding new functionality
-- ============================================================================

-- Function to get all brands from both brands table and ad_account table
CREATE OR REPLACE FUNCTION public.get_all_brands()
RETURNS TABLE (
  id text,
  brand_name text,
  source_table text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  RETURN QUERY
  -- Get brands from existing brands table
  SELECT 
    b.id::text as id,
    b.brand_name,
    'brands'::text as source_table,
    COALESCE(b.created_at, now()) as created_at
  FROM public.brands b
  
  UNION ALL
  
  -- Get brands from new ad_account table
  SELECT 
    aa.id::text as id,
    aa.brand_name,
    'ad_account'::text as source_table,
    aa.created_at
  FROM public.ad_account aa;
END;
$$;

-- Enhanced dashboard function that handles both old and new data structures
CREATE OR REPLACE FUNCTION public.get_enhanced_dashboard_data(
  brand_id_param text DEFAULT NULL,
  start_date_param text DEFAULT NULL,
  end_date_param text DEFAULT NULL,
  sentiment_param text DEFAULT NULL,
  funnel_param text DEFAULT NULL,
  angel_param text DEFAULT NULL,
  source_table_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  result json;
  brand_source text;
  brand_uuid uuid;
  brand_int int;
BEGIN
  -- Determine which table the brand comes from if not specified
  IF source_table_param IS NULL AND brand_id_param IS NOT NULL THEN
    -- Check if brand exists in brands table first
    SELECT 'brands' INTO brand_source
    FROM public.brands 
    WHERE id::text = brand_id_param
    LIMIT 1;
    
    -- If not found in brands, check ad_account
    IF brand_source IS NULL THEN
      SELECT 'ad_account' INTO brand_source
      FROM public.ad_account 
      WHERE id::text = brand_id_param
      LIMIT 1;
    END IF;
  ELSE
    brand_source := source_table_param;
  END IF;

  -- If brand is from old brands table, use existing function
  IF brand_source = 'brands' THEN
    SELECT public.get_dashboard_data(
      brand_id_param::int,
      start_date_param,
      end_date_param,
      sentiment_param,
      funnel_param,
      angel_param
    ) INTO result;
    
    -- Add source info to result
    result := jsonb_set(result::jsonb, '{source_table}', '"brands"'::jsonb)::json;
    
  -- If brand is from new ad_account table, fetch new structure data
  ELSIF brand_source = 'ad_account' THEN
    brand_uuid := brand_id_param::uuid;
    
    WITH brand_data AS (
      SELECT aa.brand_name, aa.ad_name, aa.created_at
      FROM public.ad_account aa
      WHERE aa.id = brand_uuid
    ),
    campaigns_data AS (
      SELECT 
        c.id,
        c.name,
        c.status,
        c.objective,
        c.start_time,
        c.created_at,
        c.updated_at
      FROM public.campaigns c
      WHERE c.account_id = brand_uuid
        AND (start_date_param IS NULL OR c.created_at >= start_date_param::timestamptz)
        AND (end_date_param IS NULL OR c.created_at <= end_date_param::timestamptz)
    ),
    ad_sets_data AS (
      SELECT 
        ads.id,
        ads.campaign_id,
        ads.name,
        ads.status,
        ads.daily_budget,
        ads.lifetime_budget,
        ads.start_time,
        ads.end_time,
        ads.created_time
      FROM public.ad_sets ads
      JOIN public.campaigns c ON ads.campaign_id = c.id
      WHERE c.account_id = brand_uuid
        AND (start_date_param IS NULL OR ads.created_time >= start_date_param::timestamptz)
        AND (end_date_param IS NULL OR ads.created_time <= end_date_param::timestamptz)
    ),
    ads_data AS (
      SELECT 
        a.id,
        a.ad_set_id,
        a.name,
        a.title,
        a.body_text,
        a.image_url,
        a.video_url,
        a.permalink_url,
        a.angle,
        a.angle_type,
        a.funnel,
        a.status,
        a.source_created_time,
        a.created_at
      FROM public.ads a
      WHERE a.ad_account_id = brand_uuid
        AND (start_date_param IS NULL OR a.created_at >= start_date_param::timestamptz)
        AND (end_date_param IS NULL OR a.created_at <= end_date_param::timestamptz)
        AND (funnel_param IS NULL OR funnel_param = 'all' OR a.funnel::text = funnel_param)
        AND (angel_param IS NULL OR angel_param = 'all' OR a.angle_type = angel_param)
    )
    SELECT json_build_object(
      'source_table', 'ad_account',
      'brand_info', (SELECT row_to_json(bd) FROM brand_data bd LIMIT 1),
      'campaigns', COALESCE((SELECT json_agg(cd) FROM campaigns_data cd), '[]'::json),
      'ad_sets', COALESCE((SELECT json_agg(asd) FROM ad_sets_data asd), '[]'::json),
      'ads', COALESCE((SELECT json_agg(ad) FROM ads_data ad), '[]'::json),
      'comments', '[]'::json, -- No comments yet for new brands
      'metrics', json_build_object(
        'total_ads', (SELECT COUNT(*) FROM ads_data),
        'total_campaigns', (SELECT COUNT(*) FROM campaigns_data),
        'total_ad_sets', (SELECT COUNT(*) FROM ad_sets_data),
        'total_comments', 0
      ),
      'untracked_info', json_build_object(
        'untracked_ads_count', 0,
        'untracked_comments_count', 0,
        'untracked_ad_ids', '[]'::json,
        'untracked_comment_ids', '[]'::json
      ),
      'brand_status', json_build_object(
        'is_ad_analyzing', false,
        'is_comment_analyzing', false
      )
    ) INTO result;
    
  ELSE
    -- Brand not found, return empty result
    result := json_build_object(
      'error', 'Brand not found',
      'source_table', NULL
    );
  END IF;

  RETURN result;
END;
$$;

-- Function to get campaigns for enhanced brands
CREATE OR REPLACE FUNCTION public.get_enhanced_campaigns_data(
  brand_id_param text,
  start_date_param text DEFAULT NULL,
  end_date_param text DEFAULT NULL,
  source_table_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  result json;
  brand_source text;
  brand_uuid uuid;
BEGIN
  -- Determine source table
  IF source_table_param IS NULL THEN
    SELECT 'brands' INTO brand_source
    FROM public.brands 
    WHERE id::text = brand_id_param
    LIMIT 1;
    
    IF brand_source IS NULL THEN
      SELECT 'ad_account' INTO brand_source
      FROM public.ad_account 
      WHERE id::text = brand_id_param
      LIMIT 1;
    END IF;
  ELSE
    brand_source := source_table_param;
  END IF;

  IF brand_source = 'brands' THEN
    -- Use existing function for old brands
    SELECT public.get_campaigns_data(
      brand_id_param::int,
      start_date_param,
      end_date_param
    ) INTO result;
    
  ELSIF brand_source = 'ad_account' THEN
    brand_uuid := brand_id_param::uuid;
    
    SELECT COALESCE(json_agg(json_build_object(
      'id', c.id,
      'name', c.name,
      'status', c.status,
      'objective', c.objective,
      'start_time', c.start_time,
      'created_at', c.created_at,
      'updated_at', c.updated_at
    )), '[]'::json)
    FROM public.campaigns c
    WHERE c.account_id = brand_uuid
      AND (start_date_param IS NULL OR c.created_at >= start_date_param::timestamptz)
      AND (end_date_param IS NULL OR c.created_at <= end_date_param::timestamptz)
    INTO result;
    
  ELSE
    result := '[]'::json;
  END IF;

  RETURN result;
END;
$$;

-- Function to get ad sets for enhanced brands
CREATE OR REPLACE FUNCTION public.get_enhanced_ad_sets_data(
  brand_id_param text,
  start_date_param text DEFAULT NULL,
  end_date_param text DEFAULT NULL,
  source_table_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  result json;
  brand_source text;
  brand_uuid uuid;
BEGIN
  -- Determine source table
  IF source_table_param IS NULL THEN
    SELECT 'brands' INTO brand_source
    FROM public.brands 
    WHERE id::text = brand_id_param
    LIMIT 1;
    
    IF brand_source IS NULL THEN
      SELECT 'ad_account' INTO brand_source
      FROM public.ad_account 
      WHERE id::text = brand_id_param
      LIMIT 1;
    END IF;
  ELSE
    brand_source := source_table_param;
  END IF;

  IF brand_source = 'brands' THEN
    -- Use existing function for old brands
    SELECT public.get_ad_sets_data(
      brand_id_param::int,
      start_date_param,
      end_date_param
    ) INTO result;
    
  ELSIF brand_source = 'ad_account' THEN
    brand_uuid := brand_id_param::uuid;
    
    SELECT COALESCE(json_agg(json_build_object(
      'id', ads.id,
      'campaign_id', ads.campaign_id,
      'name', ads.name,
      'status', ads.status,
      'daily_budget', ads.daily_budget,
      'lifetime_budget', ads.lifetime_budget,
      'start_time', ads.start_time,
      'end_time', ads.end_time,
      'created_time', ads.created_time
    )), '[]'::json)
    FROM public.ad_sets ads
    JOIN public.campaigns c ON ads.campaign_id = c.id
    WHERE c.account_id = brand_uuid
      AND (start_date_param IS NULL OR ads.created_time >= start_date_param::timestamptz)
      AND (end_date_param IS NULL OR ads.created_time <= end_date_param::timestamptz)
    INTO result;
    
  ELSE
    result := '[]'::json;
  END IF;

  RETURN result;
END;
$$;
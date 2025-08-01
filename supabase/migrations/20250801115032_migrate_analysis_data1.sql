-- Migration 02: Migrate analysis data from ad_per_ad_account to ads
-- This migration handles the data transfer and mapping

BEGIN;

-- First, let's verify how many records we can match before starting migration
DO $$
DECLARE
    total_old_ads int;
    total_new_ads int;
    matchable_ads int;
    numeric_ad_ids int;
BEGIN
    SELECT COUNT(*) INTO total_old_ads FROM public.ad_per_ad_account;
    SELECT COUNT(*) INTO total_new_ads FROM public.ads;
    
    -- Check how many ad_ids are numeric (can be cast to bigint)
    SELECT COUNT(*) INTO numeric_ad_ids
    FROM public.ad_per_ad_account 
    WHERE ad_id ~ '^\d+$';
    
    -- Check how many old ads can be matched to new ads by ID
    SELECT COUNT(*) INTO matchable_ads
    FROM public.ad_per_ad_account apa
    INNER JOIN public.ads a ON apa.ad_id ~ '^\d+$' AND a.id = CAST(apa.ad_id AS bigint);
    
    RAISE NOTICE 'Pre-migration verification:';
    RAISE NOTICE '- Old ads (ad_per_ad_account): %', total_old_ads;
    RAISE NOTICE '- New ads (ads table): %', total_new_ads;
    RAISE NOTICE '- Old ads with numeric ad_id: %', numeric_ad_ids;
    RAISE NOTICE '- Matchable by ID: %', matchable_ads;
    RAISE NOTICE '- Match percentage: %%%', ROUND(100.0 * matchable_ads / total_old_ads, 2);
    
    IF numeric_ad_ids < total_old_ads THEN
        RAISE WARNING '% ads have non-numeric ad_id values and cannot be matched by ID', 
                      total_old_ads - numeric_ad_ids;
    END IF;
    
    IF matchable_ads < (total_old_ads * 0.5) THEN
        RAISE WARNING 'Low match rate detected. Only % out of % ads can be matched by ID.', 
                      matchable_ads, total_old_ads;
        RAISE WARNING 'This might indicate ID format issues. Proceeding with fallback matching...';
    END IF;
END $$;

-- 1. Create a mapping between old ad_per_ad_account records and new ads records
UPDATE public.ads 
SET old_ad_id = apa.ad_id
FROM public.ad_per_ad_account apa
WHERE ads.old_ad_id IS NULL
  AND apa.ad_id ~ '^\d+$'
  AND ads.id = CAST(apa.ad_id AS bigint);

-- 2. Migrate analysis data from ad_per_ad_account to ads (ID matching)
UPDATE public.ads 
SET 
    angle = apa."Angel",
    angle_type = apa."Angel Type", 
    analysis_explanation = apa."Explanation",
    funnel = apa.funnel::funnel_type
FROM public.ad_per_ad_account apa
WHERE apa.ad_id ~ '^\d+$'
  AND ads.id = CAST(apa.ad_id AS bigint)
  AND (ads.angle IS NULL OR ads.angle_type IS NULL OR ads.analysis_explanation IS NULL);

-- 3. Fallback matching by content for unmatched records
UPDATE public.ads 
SET 
    angle = apa."Angel",
    angle_type = apa."Angel Type",
    analysis_explanation = apa."Explanation",
    funnel = apa.funnel::funnel_type
FROM public.ad_per_ad_account apa
WHERE ads.angle IS NULL 
  AND ads.name = apa.ad_name
  AND ads.body_text = apa.ad_text
  AND ads.title = apa.ad_title
  AND NOT EXISTS (
      SELECT 1 FROM public.ad_per_ad_account apa2 
      WHERE apa2.ad_id ~ '^\d+$' 
        AND ads.id = CAST(apa2.ad_id AS bigint)
  );

-- 4. Update comments table to reference the new ads table (direct ID match)
UPDATE public.comments 
SET new_ad_id = ads.id
FROM public.ads 
WHERE comments.new_ad_id IS NULL
  AND comments.ad_id ~ '^\d+$'
  AND comments.ad_id = CAST(ads.id AS text);

-- 5. Update comments via ad_per_ad_account mapping
UPDATE public.comments 
SET new_ad_id = ads.id
FROM public.ad_per_ad_account apa, public.ads
WHERE comments.new_ad_id IS NULL
  AND comments.ad_id = apa.ad_id
  AND apa.ad_id ~ '^\d+$'
  AND ads.id = CAST(apa.ad_id AS bigint);

-- 6. Log migration results
DO $$
DECLARE
    ads_updated_count int;
    comments_updated_count int;
    unmapped_comments_count int;
BEGIN
    SELECT COUNT(*) INTO ads_updated_count 
    FROM public.ads 
    WHERE angle IS NOT NULL OR angle_type IS NOT NULL OR analysis_explanation IS NOT NULL;
    
    SELECT COUNT(*) INTO comments_updated_count 
    FROM public.comments 
    WHERE new_ad_id IS NOT NULL;
    
    SELECT COUNT(*) INTO unmapped_comments_count 
    FROM public.comments 
    WHERE new_ad_id IS NULL;
    
    RAISE NOTICE 'Migration Results:';
    RAISE NOTICE '- Ads updated with analysis data: %', ads_updated_count;
    RAISE NOTICE '- Comments mapped to new ads: %', comments_updated_count;  
    RAISE NOTICE '- Unmapped comments remaining: %', unmapped_comments_count;
END $$;

COMMIT;
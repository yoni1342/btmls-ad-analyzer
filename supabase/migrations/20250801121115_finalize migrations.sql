-- Migration 03: Finalize the transition and cleanup
-- This migration completes the transition to the new structure

BEGIN;

-- 1. Verify data integrity before making final changes
DO $$
DECLARE
    unmapped_comments_count int;
    total_comments_count int;
BEGIN
    SELECT COUNT(*) INTO unmapped_comments_count 
    FROM public.comments 
    WHERE new_ad_id IS NULL;
    
    SELECT COUNT(*) INTO total_comments_count 
    FROM public.comments;
    
    IF unmapped_comments_count > 0 THEN
        RAISE NOTICE 'WARNING: % out of % comments could not be mapped to new ads table', 
                     unmapped_comments_count, total_comments_count;
        RAISE NOTICE 'Review unmapped comments before proceeding with cleanup';
    END IF;
END $$;

-- 2. Drop the old foreign key constraint on comments table
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS "Comments_ad_id_fkey";

-- 3. Add the new foreign key constraint for comments -> ads
ALTER TABLE public.comments 
ADD CONSTRAINT comments_new_ad_id_fkey 
FOREIGN KEY (new_ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;

-- 4. Rename columns to finalize the transition
-- Rename new_ad_id to ad_id after backing up the old column
ALTER TABLE public.comments RENAME COLUMN ad_id TO old_ad_id_backup;
ALTER TABLE public.comments RENAME COLUMN new_ad_id TO ad_id;

-- 5. Update the ad_id column to be NOT NULL (after ensuring all are mapped)
-- First, delete any comments that couldn't be mapped (optional - you might want to handle these differently)
-- DELETE FROM public.comments WHERE ad_id IS NULL;

-- Then make the column NOT NULL
-- ALTER TABLE public.comments ALTER COLUMN ad_id SET NOT NULL;

-- 6. Clean up temporary columns from ads table
ALTER TABLE public.ads DROP COLUMN IF EXISTS old_ad_id;

-- 7. Add proper brand relationship chain
-- Ensure we can trace from brand to all related data
DO $$
BEGIN
    -- Add brand_id to campaigns if it doesn't exist (derived from ad_account)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'brand_id') THEN
        ALTER TABLE public.campaigns ADD COLUMN brand_id bigint;
        
        -- Populate brand_id in campaigns from ad_account
        UPDATE public.campaigns 
        SET brand_id = aa.brand_id
        FROM public.ad_account aa
        WHERE campaigns.account_id = aa.id;
        
        -- Add foreign key constraint
        ALTER TABLE public.campaigns 
        ADD CONSTRAINT campaigns_brand_id_fkey 
        FOREIGN KEY (brand_id) REFERENCES public.brands(id);
    END IF;
END $$;

-- 8. Create useful views for the new hierarchy
CREATE OR REPLACE VIEW brand_ad_hierarchy AS
SELECT 
    b.id as brand_id,
    b.brand_name,
    aa.id as ad_account_id,
    c.id as campaign_id,
    c.name as campaign_name,
    ads_set.id as ad_set_id,
    ads_set.name as ad_set_name,
    a.id as ad_id,
    a.name as ad_name,
    a.title as ad_title,
    a.angle,
    a.angle_type,
    a.analysis_explanation,
    COUNT(com.id) as comment_count
FROM public.brands b
LEFT JOIN public.ad_account aa ON b.id = aa.brand_id
LEFT JOIN public.campaigns c ON aa.id = c.account_id
LEFT JOIN public.ad_sets ads_set ON c.id = ads_set.campaign_id
LEFT JOIN public.ads a ON ads_set.id = a.ad_set_id
LEFT JOIN public.comments com ON a.id = com.ad_id
GROUP BY b.id, b.brand_name, aa.id, c.id, c.name, ads_set.id, ads_set.name, 
         a.id, a.name, a.title, a.angle, a.angle_type, a.analysis_explanation;

-- 9. Create indexes for the new structure
CREATE INDEX IF NOT EXISTS idx_ad_account_brand_id ON public.ad_account(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_account_id ON public.campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON public.campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON public.ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_ad_set_id ON public.ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_comments_ad_id ON public.comments(ad_id);

-- 10. Final verification query
DO $$
DECLARE
    hierarchy_count int;
BEGIN
    SELECT COUNT(*) INTO hierarchy_count
    FROM brand_ad_hierarchy
    WHERE ad_id IS NOT NULL;
    
    RAISE NOTICE 'Complete hierarchy established for % ads', hierarchy_count;
END $$;

COMMIT;
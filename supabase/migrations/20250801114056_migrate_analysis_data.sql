-- Migration 01: Establish proper relationships and add missing columns
-- This migration sets up the foundation for the new hierarchy

BEGIN;

-- 1. First, let's ensure all the new tables have proper foreign key relationships
-- (Some might already exist, but we'll add them if missing)

-- Add brand_id to ad_account if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ad_account' AND column_name = 'brand_id') THEN
        ALTER TABLE public.ad_account 
        ADD COLUMN brand_id bigint REFERENCES public.brands(id);
    END IF;
END $$;

-- 2. Add analysis columns to ads table (from ad_per_ad_account)
DO $$ 
BEGIN
    -- Add angle column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ads' AND column_name = 'angle') THEN
        ALTER TABLE public.ads ADD COLUMN angle text;
    END IF;
    
    -- Add angle_type column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ads' AND column_name = 'angle_type') THEN
        ALTER TABLE public.ads ADD COLUMN angle_type text;
    END IF;
    
    -- Add analysis_explanation column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ads' AND column_name = 'analysis_explanation') THEN
        ALTER TABLE public.ads ADD COLUMN analysis_explanation text;
    END IF;
    
    -- Add funnel column if it doesn't exist (change from USER-DEFINED to text for now)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ads' AND column_name = 'funnel') THEN
        ALTER TABLE public.ads ADD COLUMN funnel text;
    END IF;
END $$;

-- 3. Add a temporary mapping column to help with migration
-- This will store the old ad_per_ad_account.ad_id for mapping purposes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ads' AND column_name = 'old_ad_id') THEN
        ALTER TABLE public.ads ADD COLUMN old_ad_id text;
    END IF;
END $$;

-- 4. Add a temporary column to comments table for the new foreign key
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'new_ad_id') THEN
        ALTER TABLE public.comments ADD COLUMN new_ad_id bigint;
    END IF;
END $$;

-- 5. Create indexes for better performance during migration
CREATE INDEX IF NOT EXISTS idx_ad_per_ad_account_ad_id ON public.ad_per_ad_account(ad_id);
CREATE INDEX IF NOT EXISTS idx_ads_old_ad_id ON public.ads(old_ad_id);
CREATE INDEX IF NOT EXISTS idx_comments_ad_id ON public.comments(ad_id);

COMMIT;
-- ============================================================================
-- This migration creates a new, properly structured 'ads' table.
-- This table is intended to replace the old 'ad_per_ad_account' table.
-- It establishes correct foreign key links to 'ad_sets' and 'ad_account'.
-- ============================================================================

CREATE TABLE public.ads (
  -- Core identifier from the ad platform (e.g., Facebook Ad ID).
  -- This is the business key and will serve as the primary key.
  id bigint NOT NULL PRIMARY KEY,

  -- Foreign keys to establish relationships.
  -- An ad belongs to an Ad Set and an Ad Account.
  ad_set_id bigint NOT NULL REFERENCES public.ad_sets(id) ON DELETE CASCADE,
  ad_account_id bigint NOT NULL REFERENCES public.ad_account(id) ON DELETE CASCADE,

  -- Ad creative and content details.
  name text,
  title text,
  body_text text,
  creative_id text,
  image_url text,
  video_url text,
  permalink_url text,
  
  -- Timestamps from the source platform and our database.
  source_created_time timestamptz,
  source_updated_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Fields for analysis (migrated from the old table).
  angle text,
  angle_type text,
  funnel_stage text, -- Replaces the 'funnel' USER-DEFINED type with flexible text.
  analysis_explanation text
);

-- Add comments for clarity on the table and key columns.
COMMENT ON TABLE public.ads IS 'Stores individual ad creatives and their metadata. Replaces the legacy ad_per_ad_account table.';
COMMENT ON COLUMN public.ads.id IS 'The unique identifier for the ad from the source platform (e.g., Facebook Ad ID).';
COMMENT ON COLUMN public.ads.ad_set_id IS 'Foreign key linking to the ad set this ad belongs to.';
COMMENT ON COLUMN public.ads.source_created_time IS 'Timestamp of when the ad was created in the source ad platform.';

-- Add indexes on foreign keys for improved query performance.
CREATE INDEX ix_ads_ad_set_id ON public.ads (ad_set_id);
CREATE INDEX ix_ads_ad_account_id ON public.ads (ad_account_id);
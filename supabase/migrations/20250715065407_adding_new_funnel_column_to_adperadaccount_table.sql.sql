-- Add a new 'funnel' column to the 'ad_per_ad_account' table.
ALTER TABLE public.ad_per_ad_account
ADD COLUMN funnel TEXT;